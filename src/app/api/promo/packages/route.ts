// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ---------- helpers ---------- */
const flag = (v?: string) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim())
const toBool = (v?: string | null) => flag(v ?? '')
const toInt = (v?: string | null, d = 0) => {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : d
}

/* ---------- route ---------- */
export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[promo/packages] STRIPE_SECRET_KEY fehlt')
    return NextResponse.json({ items: [] }, { status: 200 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  // Optional: nur bestimmte Produkte zulassen (kommaseparierte IDs)
  const allowIds = (process.env.PROMO_PRODUCT_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Optional: nur Produkte mit metadata.promo=true/1
  const REQUIRE_PROMO_FLAG = flag(process.env.PROMO_REQUIRE_FLAG ?? 'false')

  try {
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const items = (products.data ?? [])
      .filter((p: Stripe.Product) => {
        if (allowIds.length && !allowIds.includes(p.id)) return false
        const md = p.metadata ?? {}
        const code = (md.code ?? '').toLowerCase()
        if (!code) return false
        if (REQUIRE_PROMO_FLAG && !flag(md.promo)) return false
        // nur wenn Default Price existiert
        const price = typeof p.default_price === 'object' ? (p.default_price as Stripe.Price) : null
        if (!price || typeof price.unit_amount !== 'number' || price.unit_amount <= 0) return false
        return true
      })
      .map((p: Stripe.Product) => {
        const md = p.metadata ?? {}
        const code = String(md.code ?? '').toLowerCase()
        const priceObj = typeof p.default_price === 'object' ? (p.default_price as Stripe.Price) : null
        const unit = priceObj?.unit_amount ?? 0
        const curr = (priceObj?.currency ?? 'eur').toUpperCase()

        return {
          id: code,                              // UI erwartet string
          code,                                  // für Icons & Checkout
          title: p.name || code,                 // Produktname
          subtitle: md.subtitle ?? null,
          price_cents: unit,                     // aus Default Price
          currency: curr,
          score_delta: toInt(md.score_delta, 0),
          most_popular: toBool(md.most_popular),
          stripe_price_id: priceObj?.id ?? null, // für Checkout per { price }
        }
      })
      .filter(i => i.id && i.price_cents > 0)

    // Optional sortieren: most_popular zuerst, dann nach Titel
    items.sort((a, b) => {
      if (a.most_popular && !b.most_popular) return -1
      if (!a.most_popular && b.most_popular) return 1
      return a.title.localeCompare(b.title, 'de')
    })

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] Stripe error:', e?.message)
    return NextResponse.json({ items: [] }, { status: 200, headers: { 'x-promo-error': e?.message ?? 'stripe' } })
  }
}
