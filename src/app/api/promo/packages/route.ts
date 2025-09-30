import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fallbackItems() {
  return [
    { id: 'homepage', code: 'homepage',
      title: 'Anzeige auf Startseite hervorheben',
      subtitle: 'Startseiten-Hervorhebung',
      price_cents: 3999, currency: 'EUR', score_delta: 30,
      most_popular: true, stripe_price_id: null, sort_order: 10, active: true },
    { id: 'search_boost', code: 'search_boost',
      title: 'Anzeige in Suche priorisieren',
      subtitle: 'Ranking-Boost in der Suche',
      price_cents: 1799, currency: 'EUR', score_delta: 15,
      most_popular: false, stripe_price_id: null, sort_order: 20, active: true },
    { id: 'premium', code: 'premium',
      title: 'Premium-Anzeige aktivieren',
      subtitle: 'Premium-Badge & Listing',
      price_cents: 1999, currency: 'EUR', score_delta: 20,
      most_popular: false, stripe_price_id: null, sort_order: 30, active: true },
  ]
}

export async function GET() {
  try {
    const sb = await supabaseServer()
    const { data, error } = await sb
      .from('promo_packages')
      .select(`
        code,              -- <-- kein id
        label, description,
        amount_cents, price_cents, currency,
        score_delta, sort_order,
        is_active, active,
        most_popular, stripe_price_id
      `)
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ items: fallbackItems(), note: 'fallback_due_to_error' })
    }

    const rows = (data ?? []).filter(r =>
      (typeof r.is_active === 'boolean' ? r.is_active : r.active) === true
    )

    const items = rows.map((r: any) => ({
      id: String(r.code),                 // <-- id = code
      code: r.code,
      title: r.label,
      subtitle: r.description ?? '',
      price_cents: (r.amount_cents ?? r.price_cents) ?? 0,
      currency: String(r.currency ?? 'EUR').toUpperCase(),
      score_delta: r.score_delta ?? 0,
      most_popular: !!r.most_popular,
      stripe_price_id: r.stripe_price_id ?? null,
      sort_order: r.sort_order ?? 999,
      active: true,
    }))

    if (!items.length) {
      return NextResponse.json({ items: fallbackItems(), note: 'fallback_no_rows' })
    }

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: fallbackItems(), note: 'fallback_exception' })
  }
}
