import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = supabaseAdmin()

    // Keine Filter (kein "active"), wir nehmen alles was in promo_packages liegt
    const { data, error } = await admin
      .from('promo_packages')
      .select('*') // robust: falls Spalten leicht abweichen

    if (error) throw error

    // Auf das vom Frontend erwartete Schema normalisieren
    const items = (data ?? []).map((r: any) => ({
      id: String(r.code ?? r.id),        // wichtig: id = code
      code: r.code ?? null,
      title: r.title ?? '',
      subtitle: r.subtitle ?? null,
      price_cents: Number(r.price_cents ?? r.priceCents ?? 0),
      score_delta: Number(r.score_delta ?? r.scoreDelta ?? 0),
      most_popular: Boolean(r.most_popular ?? r.mostPopular ?? false),
      stripe_price_id: r.stripe_price_id ?? r.stripePriceId ?? null,
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] failed:', e?.message)
    // Lieber leeres Array zurückgeben, damit das UI sauber bleibt
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
