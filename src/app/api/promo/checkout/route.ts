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
  return NextResponse.json(
    { error: msg, ...(DEV_VERBOSE && extra ? { details: extra } : {}) },
    { status }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const requestId: string | undefined = body?.request_id
    let packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : []

    if (!requestId || packageIds.length === 0) {
      return err('request_id und package_ids[] sind erforderlich.', 400)
    }

    // normalisieren / doppelte entfernen
    packageIds = Array.from(new Set(packageIds.map(s => String(s).toLowerCase())))

    // Auth via Supabase
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err('Not authenticated', 401)

    // Optional: Owner-Check (deaktiviert, wenn DISABLE_OWNER_CHECK=1)
    if (!DISABLE_OWNER_CHECK) {
      // hier ggf. prüfen, ob requestId dem eingeloggten User gehört
    }

    // Stripe initialisieren (API-Version explizit setzen)
    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)
    const stripe = new Stripe(sk)

    // Stripe Products/Prices anhand metadata.code einsammeln
    const prods = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const priceByCode = new Map<string, Stripe.Price>()
    for (const p of prods.data) {
      const code = String(p.metadata?.code ?? '').toLowerCase()
      if (!code) continue

      let price: Stripe.Price | null =
        typeof p.default_price === 'object' && p.default_price !== null
          ? (p.default_price as Stripe.Price)
          : null

      if (!price) {
        const list = await stripe.prices.list({ product: p.id, active: true, limit: 1 })
        price = list.data[0] ?? null
      }

      if (price) priceByCode.set(code, price)
    }

    // gewünschte Pakete → Prices auflösen
    const prices: Stripe.Price[] = []
    const missing: string[] = []
    for (const code of packageIds) {
      const pr = priceByCode.get(code)
      if (!pr || !pr.active || typeof pr.unit_amount !== 'number') {
        missing.push(code)
      } else {
        prices.push(pr)
      }
    }
    if (missing.length) {
      return err('Stripe-Preis fehlt/ungültig für: ' + missing.join(', '), 400, { missing })
    }

    // alle gleiche Währung?
    const currencies = Array.from(new Set(prices.map(p => String(p.currency).toLowerCase())))
    if (currencies.length > 1) {
      return err('Alle Pakete müssen dieselbe Währung haben.', 400, { currencies })
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      prices.map(pr => ({ price: pr.id, quantity: 1 }))

    const totalCents = prices.reduce((s, pr) => s + Number(pr.unit_amount ?? 0), 0)
    const codesCsv = packageIds.join(',')

    // Redirect-URLs
    const u = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${u.protocol}//${u.host}`
    const successUrl = `${origin}/konto/lackanfragen?published=1&promo=success&requestId=${encodeURIComponent(requestId)}`
    const cancelUrl  = `${origin}/konto/lackanfragen?published=1&promo=cancel&requestId=${encodeURIComponent(requestId)}`
    const metadata: Record<string, string> = {
      request_id: requestId,
      package_ids: codesCsv,
      user_id: user?.id ?? '',
    }

    // Session-Params aufbauen (Tax-Felder nur setzen, wenn USE_TAX = true)
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      billing_address_collection: 'required',
      customer_creation: 'always',
      customer_update: { address: 'auto' },
      payment_intent_data: { metadata },
      metadata,
    }
    if (USE_TAX) {
      params.automatic_tax = { enabled: true }
      params.tax_id_collection = { enabled: true }
    }

    // Session erstellen
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create(params)
    } catch (se: any) {
      // ausführliches Logging + durchreichen (in DEV)
      console.error('Stripe checkout.sessions.create error:', {
        type: se?.type,
        code: se?.code,
        message: se?.message,
        param: se?.param,
        statusCode: se?.statusCode,
        requestId: se?.requestId,
      })
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

    if (!session?.url) return err('Stripe-Session fehlerhaft.', 500)

    return NextResponse.json({
      url: session.url,
      debug: DEV_VERBOSE ? { requestId, packageIds, sessionId: session.id, totalCents } : undefined,
    })
  } catch (e: any) {
    console.error('Promo checkout route fatal error:', e)
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message })
  }
}
