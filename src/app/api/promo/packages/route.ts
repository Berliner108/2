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
    const items = (data ?? []).map((r: any) => ({
      id: String(r.code),                            // UI erwartet string
      code: String(r.code),
      title: String(r.label ?? r.code),              // label -> title
      subtitle: null,                                // nicht in Tabelle
      price_cents: Number(r.amount_cents ?? 0),      // amount_cents -> price_cents
      currency: String(r.currency ?? 'EUR').toUpperCase(),
      score_delta: Number(r.score_delta ?? 0),
      most_popular: false,                           // nicht in Tabelle
      stripe_price_id: null,                         // wir nutzen price_data im Checkout
    }))

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[promo/packages] failed:', e?.message)
    // leeres Array, damit das UI sauber bleibt
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}
