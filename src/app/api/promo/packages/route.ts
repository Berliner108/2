// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Flag-Helper: 1/true/yes/on -> true
const flag = (v?: string) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim())

// Optional: falls du im UI einen Hinweis zeigen willst (später mit Stripe Tax)
const USE_TAX = flag(process.env.PROMO_USE_AUTOMATIC_TAX)

// Fallback-Mapping (ENV), falls in der DB keine stripe_price_id steht
const PRICE_MAP: Record<string, string | undefined> = {
  homepage:     process.env.PROMO_PRICE_ID_HOMEPAGE,
  search_boost: process.env.PROMO_PRICE_ID_SEARCH_BOOST,
  premium:      process.env.PROMO_PRICE_ID_PREMIUM,
}

export async function GET() {
  try {
    const admin = supabaseAdmin()

    // ► WICHTIG: alle benötigten Spalten selektieren
    const { data, error } = await admin
      .from('promo_packages')
      .select('code,label,subtitle,amount_cents,currency,score_delta,most_popular,stripe_price_id,active,sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })

    if (error) throw error

    const rows = (data ?? []).filter(r => r?.code)

    // Stripe nur initialisieren, wenn ein Secret da ist
    const secret = process.env.STRIPE_SECRET_KEY
    const stripe = secret ? new Stripe(secret) : null

    const items = await Promise.all(
      rows.map(async (r: any) => {
        const code = String(r.code).toLowerCase()

        // DB-ID > ENV-Fallback
        const priceId = (r.stripe_price_id ? String(r.stripe_price_id) : undefined) ?? PRICE_MAP[code]

        // Defaults aus DB
        let price_cents = Number(r.amount_cents ?? 0)
        let currency = String(r.currency ?? 'EUR').toUpperCase()
        let tax_behavior: 'inclusive' | 'exclusive' | 'unspecified' = 'unspecified'

        // Wenn Stripe-Preis vorhanden: Preis/Währung aus Stripe überschreiben
        if (stripe && priceId) {
          try {
            const price = await stripe.prices.retrieve(priceId)
            if (typeof price.unit_amount === 'number') price_cents = price.unit_amount
            if (price.currency) currency = price.currency.toUpperCase() as any
            // @ts-ignore tax_behavior existiert auf Price
            if (price.tax_behavior === 'inclusive' || price.tax_behavior === 'exclusive') {
              // @ts-ignore
              tax_behavior = price.tax_behavior
            }
          } catch (e: any) {
            console.warn('[promo/packages] Stripe price fetch failed for', priceId, e?.message)
            // leise auf DB-Werte zurückfallen
          }
        }

        return {
          id: code,                                  // UI erwartet id = code
          code,
          title: String(r.label ?? r.code),
          subtitle: r.subtitle ?? null,
          price_cents,
          currency,
          score_delta: Number(r.score_delta ?? 0),
          most_popular: Boolean(r.most_popular ?? false),
          stripe_price_id: priceId ?? null,
          // optional ans UI: späterer Hinweis für Automatic Tax
          tax_behavior,
          tax_note: USE_TAX ? 'Steuer wird im Checkout automatisch berechnet.' : null,
        }
      })
    )

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] failed:', e?.message)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
