// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Fallback-Score, falls kein metadata.score_delta gesetzt ist
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

    // Optionales Whitelisting via ENV: PROMO_ALLOW_CODES=homepage,search_boost,premium
    const allow = new Set<string>(
      (process.env.PROMO_ALLOW_CODES ?? '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
    )

    // 1) Produkte laden (+ default_price mit expand)
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const items = []
    for (const p of products.data as Stripe.Product[]) {
      const code = String(p.metadata?.code ?? '').toLowerCase()
      if (!code) continue
      if (allow.size && !allow.has(code)) continue

      // 2) Preis besorgen: bevorzugt default_price, sonst 1. aktiven Preis nachladen
      let price = p.default_price as Stripe.Price | null
      if (!price || typeof price !== 'object') {
        const prices = await stripe.prices.list({ product: p.id, active: true, limit: 1 })
        price = prices.data[0] ?? null
      }
      if (!price || typeof price !== 'object') continue // ohne Preis nicht anzeigen

      const unit = Number(price.unit_amount ?? 0)
      const curr = String(price.currency ?? 'eur').toUpperCase()

      // 3) Score/Popular aus Metadaten oder Fallback
      const score =
        Number(p.metadata?.score_delta ?? '') ||
        SCORE_BY_CODE[code] ||
        0
      const mostPopular =
        String(p.metadata?.most_popular ?? '').toLowerCase() === 'true'

      items.push({
        id: code,                 // <- Frontend erwartet id = code
        code,
        title: p.name,
        subtitle: p.description || null,
        price_cents: unit,
        currency: curr,
        score_delta: score,
        most_popular: mostPopular,
        stripe_price_id: price.id,
      })
    }

    // Optional: sortieren (erst sort_order aus metadata, sonst Preis/Code)
    items.sort((a, b) => {
      const sa = Number((products.data.find(pr => (pr.metadata?.code ?? '').toLowerCase() === a.code)?.metadata?.sort_order) ?? NaN)
      const sb = Number((products.data.find(pr => (pr.metadata?.code ?? '').toLowerCase() === b.code)?.metadata?.sort_order) ?? NaN)
      if (!Number.isNaN(sa) && !Number.isNaN(sb)) return sa - sb
      return a.code.localeCompare(b.code)
    })

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] stripe failed:', e?.message)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
