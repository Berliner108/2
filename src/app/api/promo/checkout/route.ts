// src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ----------------------------------------------------------------
 * Flags & Konfiguration (Option B)
 * -----------------------------------------------------------------*/

// interpretiert 1/0, true/false, yes/no, on/off (case-insensitive)
const flag = (v?: string) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim())

const DEV_VERBOSE = process.env.NODE_ENV !== 'production'
const DISABLE_OWNER_CHECK = flag(process.env.DISABLE_PROMO_OWNER_CHECK) // ← 1 = Owner-Check aus
const USE_TAX = flag(process.env.PROMO_USE_AUTOMATIC_TAX)              // ← 1 = Stripe Tax an

// Mapping Promo-Code -> Stripe Price-ID (in Vercel als ENV setzen)
const PRICE_MAP: Record<string, string | undefined> = {
  homepage:     process.env.PROMO_PRICE_ID_HOMEPAGE,
  search_boost: process.env.PROMO_PRICE_ID_SEARCH_BOOST,
  premium:      process.env.PROMO_PRICE_ID_PREMIUM,
}

/** kleine Error-Utility */
function err(msg: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json(
    { error: msg, ...(DEV_VERBOSE && extra ? { details: extra } : {}) },
    { status }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const requestId: string = body?.request_id
    let packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : []

    if (!requestId || packageIds.length === 0) {
      return err('request_id und package_ids[] sind erforderlich.', 400, { requestId, packageIds })
    }
    packageIds = Array.from(new Set(packageIds.map(String)))

    // Basis-URL bestimmen (APP_ORIGIN überschreibt Host)
    const url = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${url.protocol}//${url.host}`

    // ---- Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err('Not authenticated', 401)

    const admin = supabaseAdmin()

    // ---- Anfrage holen + optional Besitzer prüfen
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('id, owner_id')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr)  return err('DB error (request)', 500, { db: reqErr.message })
    if (!reqRow) return err('Anfrage nicht gefunden.', 404, { requestId })
    if (!DISABLE_OWNER_CHECK && reqRow.owner_id !== user.id) {
      return err('Nur der Besitzer der Anfrage kann sie bewerben.', 403, {
        owner_id: reqRow.owner_id, user_id: user.id
      })
    }

    // ---- Pakete aus deiner DB (Fallback-Preise & score)
    const { data: rows, error: pkgErr } = await admin
      .from('promo_packages')
      .select('code,label,amount_cents,currency,score_delta')
      .in('code', packageIds)
    if (pkgErr) return err('DB error (packages)', 500, { db: pkgErr.message })

    const packages = (rows ?? []).map((r: any) => ({
      code: String(r.code),
      title: String(r.label ?? r.code),
      price_cents: Number(r.amount_cents ?? 0),
      currency: String(r.currency ?? 'eur').toLowerCase(),
      score_delta: Number(r.score_delta ?? 0),
    }))
    if (!packages.length) return err('Keine passenden Pakete gefunden.', 400, { packageIds })

    // Validierung Preise/Währung
    if (packages.some(p => !Number.isFinite(p.price_cents) || p.price_cents <= 0)) {
      return err('Ungültiger Paketpreis (amount_cents) in promo_packages.', 500, { packages })
    }
    const currencies = new Set(packages.map(p => p.currency))
    if (currencies.size > 1) {
      return err('Pakete müssen dieselbe Währung haben.', 400, { currencies: Array.from(currencies) })
    }
    const currency = packages[0].currency

    const totalCents  = packages.reduce((s, p) => s + p.price_cents, 0)
    const totalScore  = packages.reduce((s, p) => s + p.score_delta, 0)
    const codesCsv    = packages.map(p => p.code).join(',')

    // ---- Stripe
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)
    const stripe = new Stripe(secret)

    // Bevorzugt Stripe-Preise aus dem Dashboard (PRICE_MAP),
    // sonst Fallback auf deine DB-Preise (price_data).
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = packages.map(p => {
      const codeKey = p.code.toLowerCase()
      const priceId = PRICE_MAP[codeKey]
      return priceId
        ? { price: priceId, quantity: 1 }
        : {
            price_data: {
              currency,
              unit_amount: p.price_cents,
              product_data: { name: `Bewerbung: ${p.title}` },
            },
            quantity: 1,
          }
    })

    // Metadaten für Webhook/Postprocessing
    const metadata = {
      request_id: requestId,
      package_ids: codesCsv,
      user_id: user.id,
    }

    // Redirect-URLs
    const successUrl = new URL(`${origin}/konto/lackanfragen`)
    successUrl.searchParams.set('published', '1')
    successUrl.searchParams.set('promo', 'success')
    successUrl.searchParams.set('requestId', requestId)

    const cancelUrl = new URL(`${origin}/konto/lackanfragen`)
    cancelUrl.searchParams.set('published', '1')
    cancelUrl.searchParams.set('promo', 'cancel')
    cancelUrl.searchParams.set('requestId', requestId)

    // ---- Stripe-Checkout-Session
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        line_items,

        // Stripe sammelt Rechnungsadresse (und später USt-ID) automatisch
        billing_address_collection: 'required',
        customer_creation: 'always',
        customer_update: { address: 'auto' },

        // per ENV zuschaltbar, wenn du später Stripe Tax aktivierst
        automatic_tax: { enabled: USE_TAX },
        tax_id_collection: USE_TAX ? { enabled: true } : undefined,

        payment_intent_data: { metadata },
        metadata,
      })
    } catch (se: any) {
      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, { stripe: se?.message })
    }
    if (!session?.id || !session?.url) return err('Stripe-Session fehlerhaft.', 500, { session })

    // ---- Order anlegen (status=created) – eine Zeile pro Session
    const { error: insErr } = await admin.from('promo_orders').insert({
      request_id: requestId,
      buyer_id: user.id,
      package_code: codesCsv,     // CSV der Pakete
      score_delta: totalScore,    // Summe Score
      amount_cents: totalCents,   // Summe aus DB (Webhook korrigiert später bei Bedarf)
      currency,
      stripe_session_id: session.id,
      status: 'created',
    } as any)
    if (insErr) {
      return err('Order konnte nicht gespeichert werden.', 500, { db: insErr.message })
    }

    return NextResponse.json({
      url: session.url,
      debug: DEV_VERBOSE ? { requestId, packageIds, sessionId: session.id } : undefined
    })
  } catch (e: any) {
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message })
  }
}
