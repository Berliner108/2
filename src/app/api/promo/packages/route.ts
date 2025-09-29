// /src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await supabaseServer()

  // Ziehen wir beide möglichen Spalten-Namen mit rein (is_active ODER active)
  const { data, error } = await sb
    .from('promo_packages')
    .select(`
      id,
      code,
      label,
      description,
      amount_cents,
      price_cents,
      currency,
      score_delta,
      sort_order,
      is_active,
      active,
      stripe_price_id,
      duration_days,
      most_popular
    `)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map robust gegen unterschiedliche Schemas
  const rows = (data ?? []).filter(r => {
    const isActive = (typeof r.is_active === 'boolean') ? r.is_active : r.active
    return isActive === true
  })

  const items = rows.map((r: any) => ({
    id: String(r.id),
    code: r.code,
    title: r.label,
    subtitle: r.description ?? '',
    price_cents: (r.amount_cents ?? r.price_cents) ?? 0,
    currency: String(r.currency ?? 'EUR').toUpperCase(),
    score_delta: r.score_delta ?? 0,
    duration_days: r.duration_days ?? null,
    most_popular: r.most_popular ?? false,
    stripe_price_id: r.stripe_price_id ?? null,
    sort_order: r.sort_order ?? 999,
    active: true,
  }))

  return NextResponse.json({ items })
}
