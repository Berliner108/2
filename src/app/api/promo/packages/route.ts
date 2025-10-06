// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'

// Hilfen
const flag = (v?: string) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim())
const toBool = (v?: string | null) => flag(v ?? '')
const toInt = (v?: string | null, d = 0) => {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : d
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let StripeCtor: any = null
try { StripeCtor = require('stripe').default ?? require('stripe') } catch {}

export async function GET() {
  if (!StripeCtor || !process.env.STRIPE_SECRET_KEY) {
    console.error('[promo/packages] Stripe fehlt/fehlerhaft')
    // UI nicht crashen lassen
    return NextResponse.json({ items: [] }, { status: 200 })
  }

  const stripe = new StripeCtor(process.env.STRIPE_SECRET_KEY)

  // Optional: explizite Allowlist der Produkt-IDs (kommasepariert)
  // z.B. PROMO_PRODUCT_IDS=prod_A,prod_B,prod_C
  const allowIds = (process.env.PROMO_PRODUCT_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Optional: nur Produkte mit metadata.promo=1 berücksichtigen
  const REQUIRE_PROMO_FLAG = flag(process.env.PROMO_REQUIRE_FLAG ?? 'true')

  try {
    // Alle aktiven Produkte inkl. Default Price laden
    const products = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    })

    const items = (products.data ?? [])
      .filter(p => {
        if (allowIds.length && !allowIds.includes(p.id)) return false
        const code = (p.metadata?.code ?? '').toLowerCase()
        if (!code) return false
        if (REQUIRE_PROMO_FLAG && !flag(p.metadata?.promo)) return false
        return true
      })
      .map(p => {
        const code = String(p.metadata.code).toLowerCase()
        const price: any = p.default_price
        const unit = typeof price?.unit_amount === 'number' ? price.unit_amount : 0
        const curr = (price?.currency ?? 'eur').toString().toUpperCase()

        return {
          id: code,                      // UI erwartet string
          code,                          // für Icons & Checkout
          title: p.name || code,         // Produktname als Titel
          subtitle: p.metadata?.subtitle ?? null,
          price_cents: unit,             // aus Stripe Default Price
          currency: curr,
          score_delta: toInt(p.metadata?.score_delta, 0),
          most_popular: toBool(p.metadata?.most_popular),
          stripe_price_id: price?.id ?? null, // für Checkout per price
        }
      })
      // nur sinnvolle Einträge
      .filter(i => i.id && i.price_cents > 0)

    // Optionale Sortierung: erst most_popular, dann nach Name
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
