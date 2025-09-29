// /src/app/api/promo/packages/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const sb = await supabaseServer()

  const { data, error } = await sb
    .from('promo_packages')
    .select(`
      id,
      label,
      description,
      amount_cents,
      currency,
      score_delta,
      sort_order,
      stripe_price_id,
      is_active
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    // wichtig fürs Debugging
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Normalisiere hier für dein Frontend (entkoppelt vom DB-Namen):
  const items = (data ?? []).map(row => ({
    id: row.id,
    title: row.label,            // Frontend erwartet title
    subtitle: row.description ?? '',
    price_cents: row.amount_cents,
    currency: row.currency ?? 'EUR',
    score_delta: row.score_delta ?? 0,
    duration_days: row.duration_days ?? null,   // falls nicht vorhanden -> null
    most_popular: row.most_popular ?? false,    // falls nicht vorhanden -> false
    stripe_price_id: row.stripe_price_id ?? null,
    sort_order: row.sort_order ?? 999,
    active: row.is_active === true,
  }))

  return NextResponse.json({ items })
}
