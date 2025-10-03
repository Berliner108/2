import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = supabaseAdmin()
    // Wir nehmen ALLE Pakete, kein active-Flag nötig
    const { data, error } = await admin
      .from('promo_packages')
      .select('code,label,amount_cents,currency,score_delta,subtitle,most_popular')
      .order('amount_cents', { ascending: true })

    if (error) throw error

    const items = (data ?? []).map((r: any) => ({
      id: String(r.code),              // <- wichtig: id = code
      title: r.label ?? r.code,
      subtitle: r.subtitle ?? null,
      price_cents: Number(r.amount_cents ?? 0),
      currency: String(r.currency ?? 'EUR').toUpperCase(),
      score_delta: Number(r.score_delta ?? 0),
      most_popular: !!r.most_popular,
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Load failed' }, { status: 500 })
  }
}
