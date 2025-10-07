// src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Konfiguration ──────────────────────────────────────────────────────────────
const DEV = process.env.NODE_ENV !== 'production'
// ⚠️ Schalter: setze PROMO_DEBUG=1 in Vercel → dann kommen Fehlerdetails auch in Prod zurück
const PROMO_DEBUG = process.env.PROMO_DEBUG === '1'
const USE_TAX = process.env.PROMO_USE_AUTOMATIC_TAX === 'true'
// richtige Logik: 1 = Check deaktiviert, 0/leer = Check (falls du ihn implementierst)
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1'

// interne Helper, um optional pro-Request zu debuggen (?debug=1 oder Header x-debug:1)
function isDebug(req: NextRequest) {
  const url = new URL(req.url)
  return PROMO_DEBUG || DEV || url.searchParams.get('debug') === '1' || req.headers.get('x-debug') === '1'
}

function err(req: NextRequest, msg: string, status = 400, extra?: Record<string, any>) {
  const dbg = isDebug(req)
  if (dbg && extra) {
    console.error('[promo/checkout:error]', msg, extra)
  } else {
    console.error('[promo/checkout:error]', msg)
  }
  return NextResponse.json(
    { error: msg, ...(dbg && extra ? { details: extra } : {}) },
    { status }
  )
}

// ── POST: eigentlicher Checkout ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const requestId: string = body?.request_id
    let packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : []
    let priceIds: string[]   = Array.isArray(body?.price_ids)   ? body.price_ids   : []

    if (!requestId || (packageIds.length === 0 && priceIds.length === 0)) {
      return err(req, 'request_id und (package_ids[] ODER price_ids[]) sind erforderlich.', 400, { body })
    }

    // Codes normalisieren (nur für Metadaten/Gleichheit)
    packageIds = Array.from(new Set(packageIds.map((s: string) => String(s).toLowerCase())))

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err(req, 'Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err(req, 'Not authenticated', 401)

    // Optional: Owner-Check (nur wenn NICHT deaktiviert)
    if (!DISABLE_OWNER_CHECK) {
      // TODO: prüfen, ob requestId zu user.id gehört
    }

    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) return err(req, 'Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)

    // Stripe-Client (ohne apiVersion fixen → Typsystem happy)
    const stripe = new Stripe(sk)

    // Line Items bauen
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    let totalCents = 0

    if (priceIds.length > 0) {
      // direkte Price-IDs bevorzugt
      const seen = new Set<string>()
      for (const pidRaw of priceIds) {
        const pid = String(pidRaw)
        if (!pid || seen.has(pid)) continue
        seen.add(pid)

        let pr: Stripe.Price
        try {
          pr = await stripe.prices.retrieve(pid)
        } catch (e: any) {
          return err(req, `Stripe-Preis ${pid} konnte nicht geladen werden.`, 400, {
            pid,
            stripe: { message: e?.message, code: e?.code, type: e?.type },
          })
        }
        if (!pr?.active || typeof pr.unit_amount !== 'number') {
          return err(req, `Stripe-Preis ungültig/inaktiv: ${pid}`, 400, { pid })
        }
        if (pr.type === 'recurring') {
          return err(req, `Preis ${pid} ist als subscription angelegt. Verwende one_time.`, 400, { pid, type: pr.type })
        }
        line_items.push({ price: pr.id, quantity: 1 })
        totalCents += pr.unit_amount
      }
    } else {
      // Fallback über product.metadata.code
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
        if (price && typeof price === 'object') priceByCode.set(code, price)
      }

      const prices: Stripe.Price[] = []
      const missing: string[] = []
      const recurring: string[] = []

      for (const code of packageIds) {
        const pr = priceByCode.get(code)
        if (!pr || !pr.active || typeof pr.unit_amount !== 'number') {
          missing.push(code)
        } else if (pr.type === 'recurring') {
          recurring.push(code)
        } else {
          prices.push(pr)
        }
      }

      if (missing.length) return err(req, 'Stripe-Preis fehlt/ungültig für: ' + missing.join(', '), 400, { missing })
      if (recurring.length) {
        return err(req,
          'Diese Pakete sind als wiederkehrender Preis (subscription) angelegt: ' + recurring.join(', ') +
          '. Entweder in Stripe auf one-time umstellen oder Checkout-Mode ändern.',
          400, { recurring }
        )
      }

      const currencies = Array.from(new Set(prices.map(p => String(p.currency).toLowerCase())))
      if (currencies.length > 1) return err(req, 'Alle Pakete müssen dieselbe Währung haben.', 400, { currencies })

      line_items = prices.map(pr => ({ price: pr.id, quantity: 1 }))
      totalCents = prices.reduce((s, pr) => s + Number(pr.unit_amount ?? 0), 0)
    }

    if (line_items.length === 0) return err(req, 'Keine gültigen line_items.', 400)

    // URLs & Meta
    const u = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${u.protocol}//${u.host}`
    const successUrl = `${origin}/konto/lackanfragen?published=1&promo=success&requestId=${encodeURIComponent(requestId)}`
    const cancelUrl  = `${origin}/konto/lackanfragen?published=1&promo=cancel&requestId=${encodeURIComponent(requestId)}`
    const metadata   = { request_id: requestId, package_ids: packageIds.join(','), user_id: user?.id ?? '' }

    // Session erstellen
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items,
        billing_address_collection: 'required',
        customer_creation: 'always',
        customer_update: { address: 'auto' },
        automatic_tax: { enabled: !!USE_TAX },
        tax_id_collection: USE_TAX ? { enabled: true } : undefined,
        payment_intent_data: { metadata },
        metadata,
      })

      if (!session?.url) return err(req, 'Stripe-Session fehlerhaft (keine URL).', 500, { session })

      if (isDebug(req)) {
        console.log('[promo/checkout:ok]', { requestId, packageIds, priceIds, sessionId: session.id, totalCents })
      }

      return NextResponse.json({
        url: session.url,
        debug: isDebug(req) ? { requestId, packageIds, priceIds, sessionId: session.id, totalCents } : undefined,
      })
    } catch (se: any) {
      // ausführlich loggen und optional auch zurückgeben
      const details = {
        type: se?.type,
        code: se?.code,
        message: se?.message,
        param: se?.param,
        decline_code: se?.decline_code,
        statusCode: se?.statusCode,
        requestId: se?.requestId,
      }
      console.error('Stripe checkout.sessions.create error:', { ...details })
      return err(req, 'Stripe-Checkout konnte nicht erstellt werden.', 500, { stripe: details })
    }
  } catch (e: any) {
    return err(req, 'Checkout konnte nicht erstellt werden.', 500, { reason: e?.message })
  }
}

// Optional: GET freundlich ablehnen, statt nacktem 405
export async function GET() {
  return NextResponse.json({ error: 'Use POST for /api/promo/checkout' }, { status: 405 })
}
