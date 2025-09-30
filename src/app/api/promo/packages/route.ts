import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fallbackItems() {
  return [
    { id: 'homepage',     code: 'homepage',     title: 'Anzeige auf Startseite hervorheben', subtitle: 'Startseiten-Hervorhebung', price_cents: 3999, currency: 'EUR', score_delta: 30, sort_order: 10, active: true },
    { id: 'search_boost', code: 'search_boost', title: 'Anzeige in Suche priorisieren',      subtitle: 'Ranking-Boost in der Suche', price_cents: 1799, currency: 'EUR', score_delta: 15, sort_order: 20, active: true },
    { id: 'premium',      code: 'premium',      title: 'Premium-Anzeige aktivieren',         subtitle: 'Premium-Badge & Listing',   price_cents: 1999, currency: 'EUR', score_delta: 12, sort_order: 30, active: true },
  ]
}

export async function GET() {
  try {
    const sb = await supabaseServer()
    const { data, error } = await sb
      .from('promo_packages')
      .select('code,label,title,description,amount_cents,currency,score_delta,sort_order,active')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ items: fallbackItems(), note: 'fallback_due_to_error' })
    }

    const rows = (data ?? []) as any[]
    const items = rows
      .filter(r => !!r.active)
      .map(r => ({
        id: String(r.code),
        code: r.code,
        title: r.title ?? r.label,
        subtitle: r.description ?? '',
        price_cents: Number(r.amount_cents ?? 0),
        currency: String(r.currency ?? 'EUR').toUpperCase(),
        score_delta: Number(r.score_delta ?? 0),
        sort_order: Number(r.sort_order ?? 999),
        active: true,
      }))

    return NextResponse.json({ items: items.length ? items : fallbackItems(), note: items.length ? undefined : 'fallback_no_rows' })
  } catch {
    return NextResponse.json({ items: fallbackItems(), note: 'fallback_exception' })
  }
}
