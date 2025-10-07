// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sk = process.env.STRIPE_SECRET_KEY
    if (!sk) throw new Error('STRIPE_SECRET_KEY fehlt')
    const stripe = new Stripe(sk)

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('promo_packages')
      .select('code,label,score_delta,sort_order,active,stripe_price_id,description,title')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    const rows = (data ?? []).filter(p => !!p.stripe_price_id)

    const items: any[] = []
    for (const p of rows) {
      try {
        const price = await stripe.prices.retrieve(p.stripe_price_id as string, { expand: ['product'] })
        if (!price || typeof price !== 'object' || !price.active) continue
        const prod = price.product && typeof price.product === 'object' ? (price.product as Stripe.Product) : null

        items.push({
          id: p.code,
          code: p.code,
          title: p.title ?? p.label ?? prod?.name ?? p.code,
          subtitle: p.description ?? prod?.description ?? null,
          price_cents: Number(price.unit_amount ?? 0),              // **Preis aus Stripe**
          currency: String(price.currency ?? 'eur').toUpperCase(),
          tax_behavior: price.tax_behavior ?? 'unspecified',
          score_delta: Number(p.score_delta ?? 0),                  // **Score aus DB**
          most_popular: false,
          stripe_price_id: price.id,
          sort_order: Number(p.sort_order ?? 999),
        })
      } catch { continue }
    }

    items.sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] failed:', e?.message)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
