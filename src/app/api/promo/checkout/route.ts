// src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEV_VERBOSE = process.env.NODE_ENV !== 'production'
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1'
const USE_TAX = process.env.PROMO_USE_AUTOMATIC_TAX === 'true'

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
    packageIds = Array.from(new Set(packageIds.map((s: any) => String(s).toLowerCase())))

    const url = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${url.protocol}//${url.host}`

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err('Not authenticated', 401)

    // Besitzercheck
    const admin = supabaseAdmin()
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

    // Stripe init
    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)
    const stripe = new Stripe(sk)

    // 1) Alle aktiven Produkte aus Stripe holen und per metadata.code mappen
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const priceByCode = new Map<string, Stripe.Price>()
    for (const prod of products.data as Stripe.Product[]) {
      const code = String(prod.metadata?.code ?? '').toLowerCase()
      if (!code) continue
      const price = prod.default_price as Stripe.Price | null
      if (!price || typeof price !== 'object') continue
      priceByCode.set(code, price)
    }

    // 2) Gewählte Codes → Price-IDs
    const notFound: string[] = []
    const prices: Stripe.Price[] = []
    for (const code of packageIds) {
      const price = priceByCode.get(code)
      if (!price) notFound.push(code)
      else prices.push(price)
    }
    if (notFound.length) {
      return err('Für folgende Pakete fehlt der Stripe-Preis (metadata.code / default price): ' + notFound.join(', '), 400)
    }

    // 3) Währungs-Kohärenz prüfen (Stripe verlangt pro Session nur eine Currency)
    const currSet = new Set(prices.map(p => String(p.currency).toLowerCase()))
    if (currSet.size > 1) {
      return err('Alle Pakete müssen dieselbe Währung haben.', 400, { currencies: Array.from(currSet) })
    }
    const currency = prices[0].currency

    // 4) Line items nur mit price IDs (kein DB-Fallback)
    const line_items = prices.map((pr) => ({ price: pr.id, quantity: 1 }))

    // Summen rein informativ (für deine promo_orders)
    const totalCents = prices.reduce((s, pr) => s + Number(pr.unit_amount ?? 0), 0)
    const codesCsv   = packageIds.join(',')

    // Metadata
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

    // 5) Session erzeugen – Stripe sammelt Adresse; Steuer später per ENV einschaltbar
    let session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        line_items,

        billing_address_collection: 'required',
        customer_creation: 'always',
        customer_update: { address: 'auto' },
        automatic_tax: { enabled: USE_TAX },
        tax_id_collection: USE_TAX ? { enabled: true } : undefined,

        payment_intent_data: { metadata },
        metadata,
      })
    } catch (se: any) {
      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, { stripe: se?.message })
    }
    if (!session?.id || !session?.url) return err('Stripe-Session fehlerhaft.', 500, { session })

    // 6) Order als "created" speichern (Beträge rein informativ)
    const { error: insErr } = await admin.from('promo_orders').insert({
      request_id: requestId,
      buyer_id: user.id,
      package_code: codesCsv,
      score_delta: null,        // Score ermittelst du im Webhook (aus Code → DB/Mapping)
      amount_cents: totalCents, // Info – Abrechnung macht Stripe
      currency: String(currency).toLowerCase(),
      stripe_session_id: session.id,
      status: 'created',
    } as any)
    if (insErr) return err('Order konnte nicht gespeichert werden.', 500, { db: insErr.message })

    return NextResponse.json({
      url: session.url,
      debug: DEV_VERBOSE ? { requestId, packageIds, sessionId: session.id } : undefined
    })
  } catch (e: any) {
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message })
  }
}
