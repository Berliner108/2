// src/app/api/promo/packages/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = supabaseAdmin()

    // Holt nur die Spalten, die es in promo_packages gibt
    const { data, error } = await admin
      .from('promo_packages')
      .select('code,label,amount_cents,currency,score_delta')
      .order('amount_cents', { ascending: true })

    if (error) throw error

    // Auf das vom Frontend erwartete Schema normalisieren
    const items = (data ?? [])
  .map((r: any) => ({
    id: String(r.code ?? ''),                      // UI erwartet string
    code: r.code != null ? String(r.code) : null,  // optional lassen → Icons: iconForPackage(p.code)
    title: String(r.label ?? r.code ?? ''),
    subtitle: r.subtitle ?? null,
    price_cents: Number(r.amount_cents ?? 0),
    currency: String(r.currency ?? 'EUR').toUpperCase(), // wird im UI nicht genutzt – ist ok
    score_delta: Number(r.score_delta ?? 0),
    most_popular: Boolean(r.most_popular ?? false),
    stripe_price_id: r.stripe_price_id ?? null,
  }))
  .filter(i => i.id !== ''); // Reihen ohne code rauswerfen


    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] failed:', e?.message)
    // leeres Array, damit das UI sauber bleibt
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
