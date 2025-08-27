// src/app/api/orders/[id]/review/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  rating: 'good' | 'neutral'
  comment: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { rating, comment } = (await req.json()) as Body
    const r = String(rating || '').toLowerCase()
    const c = String(comment || '').trim()

    if (r !== 'good' && r !== 'neutral') {
      return NextResponse.json({ error: "rating must be 'good' or 'neutral'" }, { status: 400 })
    }
    if (!c) {
      return NextResponse.json({ error: 'comment is required' }, { status: 400 })
    }

    // Order laden, um supplier_id zu kennen & Buyer-Eigentum zu verifizieren
    const { data: order, error: oErr } = await sb
      .from('orders')
      .select('id, buyer_id, supplier_id, status, released_at, refunded_at')
      .eq('id', params.id)
      .maybeSingle()

    if (oErr)  return NextResponse.json({ error: `order read failed: ${oErr.message}` }, { status: 400 })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Only buyer can review this order' }, { status: 403 })
    }

    const finished =
      (order.status === 'succeeded' && !!order.released_at) || !!order.refunded_at
    if (!finished) {
      return NextResponse.json({ error: 'Review only after release or refund' }, { status: 400 })
    }

    // Upsert: genau eine Bewertung pro (order_id, rater_id)
    const { data, error } = await sb
      .from('reviews')
      .upsert(
        {
          order_id: order.id,
          rater_id: user.id,
          ratee_id: order.supplier_id,
          rating: r as 'good' | 'neutral',
          comment: c,
        },
        { onConflict: 'order_id,rater_id' } // existiert? -> update
      )
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create review' }, { status: 500 })
  }
}
