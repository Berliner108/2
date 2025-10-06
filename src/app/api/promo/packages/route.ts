// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SCORE_FALLBACK: Record<string, number> = { homepage: 30, search_boost: 15, premium: 12 }

export async function GET() {
  try {
    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) throw new Error('STRIPE_SECRET_KEY fehlt')
    const stripe = new Stripe(sk)

    // Optional: Codes whitelisten via ENV (z.B. PROMO_ALLOW_CODES=homepage,search_boost,premium)
    const allow = new Set(
      (process.env.PROMO_ALLOW_CODES ?? '')
        .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    )

    const prods = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const items = []
    for (const p of prods.data) {
      const code = String(p.metadata?.code ?? '').toLowerCase()
      if (!code) continue
      if (allow.size && !allow.has(code)) continue

      // Preis: bevorzugt default_price; sonst 1. aktiver Preis
      let price = p.default_price as Stripe.Price | null
      if (!price || typeof price !== 'object') {
        const list = await stripe.prices.list({ product: p.id, active: true, limit: 1 })
        price = list.data[0] ?? null
      }
      if (!price || typeof price !== 'object' || typeof price.unit_amount !== 'number') continue

      items.push({
        id: code,
        code,
        title: p.name,
        subtitle: p.description ?? null,
        price_cents: price.unit_amount,
        currency: String(price.currency).toUpperCase(),
        tax_behavior: price.tax_behavior ?? 'unspecified',
        score_delta: Number(p.metadata?.score_delta ?? '') || SCORE_FALLBACK[code] || 0,
        most_popular: String(p.metadata?.most_popular ?? '').toLowerCase() === 'true',
        stripe_price_id: price.id,
        sort_order: Number(p.metadata?.sort_order ?? '') || 999,
      })
    }

    items.sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] stripe failed:', e?.message)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
