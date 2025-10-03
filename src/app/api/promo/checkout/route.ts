import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEV_VERBOSE = process.env.NODE_ENV !== 'production'
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1'

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

    const url = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${url.protocol}//${url.host}`

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err('Not authenticated', 401)

    const admin = supabaseAdmin()

    // Anfrage holen + optional Besitzer prüfen
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

    // Pakete aus promo_packages lesen
    const { data: rows, error: pkgErr } = await admin
      .from('promo_packages')
      .select('code,title,price_cents,currency,score_delta')
      .in('code', packageIds)
    if (pkgErr) return err('DB error (packages)', 500, { db: pkgErr.message, packageIds })

    const packages = (rows ?? []).map((r: any) => ({
      code: String(r.code),
      title: String(r.title ?? r.code),
      price_cents: Number(r.price_cents ?? 0),
      currency: String(r.currency ?? 'eur').toLowerCase(),
      score_delta: Number(r.score_delta ?? 0),
    }))
    if (!packages.length) return err('Keine passenden Pakete gefunden.', 400, { packageIds })

    // Validierung Preise/Währung
    if (packages.some(p => !Number.isFinite(p.price_cents) || p.price_cents <= 0)) {
      return err('Ungültiger Paketpreis (price_cents) in promo_packages.', 500, { packages })
    }
    const currencies = new Set(packages.map(p => p.currency))
    if (currencies.size > 1) {
      return err('Pakete müssen dieselbe Währung haben.', 400, { currencies: Array.from(currencies) })
    }
    const currency = packages[0].currency

    const totalCents  = packages.reduce((s, p) => s + p.price_cents, 0)
    const totalScore  = packages.reduce((s, p) => s + p.score_delta, 0)
    const codesCsv    = packages.map(p => p.code).join(',')

    // Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    // line_items per price_data
    const line_items = packages.map(p => ({
      price_data: {
        currency,
        unit_amount: p.price_cents,
        product_data: { name: `Bewerbung: ${p.title}` },
      },
      quantity: 1,
    }))

    // Metadata (für Webhook/Fallback)
    const metadata = {
      request_id: requestId,
      package_ids: codesCsv,
      user_id: user.id,
    }

    // Ziel-URLs
    const successUrl = new URL(`${origin}/konto/lackanfragen`)
    successUrl.searchParams.set('published', '1')
    successUrl.searchParams.set('promo', 'success')
    successUrl.searchParams.set('requestId', requestId)

    const cancelUrl = new URL(`${origin}/konto/lackanfragen`)
    cancelUrl.searchParams.set('published', '1')
    cancelUrl.searchParams.set('promo', 'cancel')
    cancelUrl.searchParams.set('requestId', requestId)

    // Stripe-Session erstellen
    let session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        line_items,
        payment_intent_data: { metadata },
        metadata,
      })
    } catch (se: any) {
      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, { stripe: se?.message })
    }
    if (!session?.id || !session?.url) return err('Stripe-Session fehlerhaft.', 500, { session })

    // ► Order jetzt anlegen (status=created), 1 Zeile pro Session
    const { error: insErr } = await admin.from('promo_orders').insert({
      request_id: requestId,
      buyer_id: user.id,
      package_code: codesCsv,            // CSV aller Packages
      score_delta: totalScore,           // Summe
      amount_cents: totalCents,          // Summe
      currency,
      stripe_session_id: session.id,
      status: 'created',
    } as any)
    if (insErr) {
      // harte Fehlermeldung – wir wollen die Order sichtbar haben
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
