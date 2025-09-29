// /src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await supabaseServer()
  const { data, error } = await sb
    .from('promo_packages')
    .select('id, code, label, description, amount_cents, currency, score_delta, sort_order, active')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map(r => ({
    id: r.id,
    code: r.code,
    title: r.label,                // <- Frontend erwartet title
    subtitle: r.description ?? '',
    price_cents: r.amount_cents,   // <- Frontend erwartet price_cents
    currency: (r.currency ?? 'EUR').toUpperCase(),
    score_delta: r.score_delta ?? 0,
    duration_days: null,
    most_popular: false,
    stripe_price_id: null,
    sort_order: r.sort_order ?? 999,
    active: r.active === true,
  }))

  return NextResponse.json({ items })
}
