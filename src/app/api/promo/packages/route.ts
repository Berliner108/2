// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// wenn du später andere Scores willst, hier anpassen (oder in Stripe-Produkt-Metadaten ablegen)
const SCORE_BY_CODE: Record<string, number> = {
  homepage: 30,
  search_boost: 15,
  premium: 12,
}

export async function GET() {
  try {
    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) throw new Error('STRIPE_SECRET_KEY fehlt')
    const stripe = new Stripe(sk)

    // optional: ?allow=homepage,search_boost,premium
    const allowParam = (typeof globalThis?.URL !== 'undefined') ? null : null // noop in edge
    // Next 14: Request-Objekt bekommst du in GET nicht, daher filtern wir gleich unten per Set:
    const allow = new Set<string>(
      (typeof process !== 'undefined' && process?.env?.PROMO_ALLOW_CODES)
        ? process.env.PROMO_ALLOW_CODES.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : [] // leer => keine Filterung
    )

    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const items = (products.data as Stripe.Product[])
      .filter((p: Stripe.Product) => {
        const code = String(p.metadata?.code ?? '').toLowerCase()
        if (!code) return false
        if (allow.size && !allow.has(code)) return false
        return true
      })
      .map((p: Stripe.Product) => {
        const code = String(p.metadata?.code ?? '').toLowerCase()
        // Default-Preis bevorzugen, andernfalls first active price (falls vorhanden)
        let price = p.default_price as Stripe.Price | null
        if (!price || typeof price !== 'object') {
          // keine weitere API-Call-Schleife – in der Praxis: lege einen Default Price im Dashboard fest
          return null
        }
        const unit = Number(price.unit_amount ?? 0)
        const curr = String(price.currency ?? 'eur').toUpperCase()

        return {
          id: code,                // fürs UI
          code,
          title: p.name,
          subtitle: p.description || null,
          price_cents: unit,       // aus Stripe
          currency: curr,          // aus Stripe
          score_delta: SCORE_BY_CODE[code] ?? 0,
          most_popular: p.metadata?.most_popular === 'true',
          stripe_price_id: price.id,
        }
      })
      .filter((x): x is NonNullable<typeof x> => !!x)

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] stripe failed:', e?.message)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
