// src/app/api/orders/refund/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId missing' }, { status: 400 })

    const admin = supabaseAdmin()

    // 1) Order laden (admin = RLS-frei), gehört dem Buyer?
    const { data: o, error } = await admin
      .from('orders')
      .select('id,buyer_id,request_id,status,payment_intent_id,released_at,refunded_at')
      .eq('id', orderId)
      .maybeSingle()
    if (error || !o) return NextResponse.json({ error: error?.message || 'Order not found' }, { status: 404 })
    if (o.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 2) Regeln: bezahlt, nicht released, nicht schon refunded
    const okStatuses = new Set(['succeeded', 'funds_held']) // akzeptiere beide Bezeichner
    if (!okStatuses.has(String(o.status))) {
      return NextResponse.json({ error: `Invalid status ${o.status}` }, { status: 400 })
    }
    if (o.released_at) return NextResponse.json({ error: 'Already released to seller' }, { status: 400 })
    if (o.refunded_at) return NextResponse.json({ error: 'Already refunded' }, { status: 400 })
    if (!o.payment_intent_id) return NextResponse.json({ error: 'PaymentIntent missing' }, { status: 400 })

    // 3) Lieferdatum prüfen (delivery_at ODER lieferdatum) → Refund NUR ab Lieferdatum
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('delivery_at, lieferdatum')
      .eq('id', o.request_id)
      .maybeSingle()
    if (reqErr) return NextResponse.json({ error: `request read failed: ${reqErr.message}` }, { status: 400 })

    const deliveryDate: string | null =
      (reqRow?.delivery_at as any) ?? (reqRow?.lieferdatum as any) ?? null
    if (!deliveryDate) return NextResponse.json({ error: 'No delivery date set' }, { status: 400 })
    if (new Date(deliveryDate).getTime() > Date.now()) {
      return NextResponse.json({ error: 'Refund only after delivery date' }, { status: 400 })
    }

    // 4) Voll-Refund (keine Teilbeträge)
    const refund = await stripe.refunds.create({
      payment_intent: o.payment_intent_id,
      metadata: {
        order_id: String(o.id),
        request_id: String(o.request_id),
        reason: 'buyer_requested_after_delivery',
      },
    })

    // 5) Sofort in DB markieren (Webhook 'charge.refunded' ist zusätzlich idempotent)
    const now = new Date().toISOString()
    const { error: updErr } = await admin
      .from('orders')
      .update({ status: 'canceled', refunded_at: now, updated_at: now })
      .eq('id', o.id)
    if (updErr) return NextResponse.json({ error: `order update failed: ${updErr.message}` }, { status: 400 })

    return NextResponse.json({ ok: true, refundId: refund.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to refund' }, { status: 500 })
  }
}
