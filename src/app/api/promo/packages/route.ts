// /src/app/api/promo/packages/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const sb = await supabaseServer()
  // Auth ist optional – deine RLS lässt authenticated SELECT auf aktive Pakete zu.
  const { data, error } = await sb
    .from('promo_packages')
    .select('id,title,subtitle,price_cents,score_delta,duration_days,most_popular,active,sort_order,stripe_price_id')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}
