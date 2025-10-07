// src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEV_VERBOSE = process.env.NODE_ENV !== 'production'
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1'
const USE_TAX = process.env.PROMO_USE_AUTOMATIC_TAX === 'true'

function err(msg: string, status = 400, extra?: Record<string, any>) {
  if (DEV_VERBOSE && extra) {
    console.error('[checkout:error]', msg, extra)
  } else {
    console.error('[checkout:error]', msg)
  }
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
      return err('request_id und package_ids[] sind erforderlich.', 400, { body })
    }
    packageIds = Array.from(new Set(packageIds.map((s: string) => String(s).toLowerCase())))

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err('Not authenticated', 401)

    // Optional: Owner-Check
    if (!DISABLE_OWNER_CHECK) {
      // TODO: prüfen, ob requestId dem user gehört
    }

    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)

    // Hinweis: apiVersion weglassen, damit Typen nicht meckern
    const stripe = new Stripe(sk)

    // 1) Stripe-Produkte laden und priceByCode aufbauen
    const prods = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] })

    const priceByCode = new Map<string, Stripe.Price>()
    for (const p of prods.data) {
      const code = String(p.metadata?.code ?? '').toLowerCase()
      if (!code) continue

      let price = p.default_price as Stripe.Price | null
      if (!price || typeof price !== 'object') {
        const list = await stripe.prices.list({ product: p.id, active: true, limit: 1 })
        price = list.data[0] ?? null
      }
      if (price && typeof price === 'object') {
        priceByCode.set(code, price)
      }
    }

    // 2) Ausgewählte Preise einsammeln + prüfen
    const prices: Stripe.Price[] = []
    const missing: string[] = []
    const recurring: string[] = []

    for (const code of packageIds) {
      const pr = priceByCode.get(code)
      if (!pr || !pr.active || typeof pr.unit_amount !== 'number') {
        missing.push(code)
      } else {
        if (pr.type === 'recurring') recurring.push(code) // Checkout-Mode payment != subscription
        prices.push(pr)
      }
    }

    if (missing.length) {
      return err('Stripe-Preis fehlt/ungültig für: ' + missing.join(', '), 400, { missing })
    }
    if (recurring.length) {
      return err(
        'Diese Pakete sind als wiederkehrender Preis (subscription) angelegt: ' + recurring.join(', ') +
        '. Entweder in Stripe auf one-time umstellen oder Checkout-Mode ändern.',
        400,
        { recurring }
      )
    }

    const currencies = Array.from(new Set(prices.map(p => String(p.currency).toLowerCase())))
    if (currencies.length > 1) {
      return err('Alle Pakete müssen dieselbe Währung haben.', 400, { currencies })
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      prices.map(pr => ({ price: pr.id, quantity: 1 }))

    if (line_items.length === 0) {
      return err('Keine gültigen line_items.', 400)
    }

    const totalCents = prices.reduce((s, pr) => s + Number(pr.unit_amount ?? 0), 0)
    const codesCsv   = packageIds.join(',')

    // 3) Redirect-URLs
    const u = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${u.protocol}//${u.host}`
    const successUrl = `${origin}/konto/lackanfragen?published=1&promo=success&requestId=${encodeURIComponent(requestId)}`
    const cancelUrl  = `${origin}/konto/lackanfragen?published=1&promo=cancel&requestId=${encodeURIComponent(requestId)}`
    const metadata = { request_id: requestId, package_ids: codesCsv, user_id: user?.id ?? '' }

    // 4) Session erstellen
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items,
        billing_address_collection: 'required',
        customer_creation: 'always',
        customer_update: { address: 'auto' },
        // falls du AutoTax wirklich aus hast, ist das false:
        automatic_tax: { enabled: !!USE_TAX },
        tax_id_collection: USE_TAX ? { enabled: true } : undefined,
        payment_intent_data: { metadata },
        metadata,
      })

      if (!session?.url) {
        return err('Stripe-Session fehlerhaft (keine URL).', 500, { session })
      }

      if (DEV_VERBOSE) {
        console.log('[checkout:ok]', { requestId, packageIds, sessionId: session.id, totalCents })
      }

      return NextResponse.json({
        url: session.url,
        debug: DEV_VERBOSE ? { requestId, packageIds, sessionId: session.id, totalCents } : undefined
      })
    } catch (se: any) {
      // Vollständiges Stripe-Fehlerobjekt rausgeben (nur in DEV)
      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, {
        stripe: {
          type: se?.type,
          code: se?.code,
          message: se?.message,
          param: se?.param,
          statusCode: se?.statusCode,
          requestId: se?.requestId,
        }
      })
    }
  } catch (e: any) {
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message })
  }
}
