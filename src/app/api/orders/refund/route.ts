// src/app/api/orders/refund/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

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
    const { data: o, error } = await admin
      .from('orders')
      .select('id,buyer_id,status,payment_intent_id')
      .eq('id', orderId)
      .maybeSingle()
    if (error || !o) return NextResponse.json({ error: error?.message || 'Order not found' }, { status: 404 })
    if (o.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (o.status !== 'funds_held') return NextResponse.json({ error: `Invalid status ${o.status}` }, { status: 400 })
    if (!o.payment_intent_id) return NextResponse.json({ error: 'PaymentIntent missing' }, { status: 400 })

    await stripe.refunds.create({ payment_intent: o.payment_intent_id, reason: 'requested_by_customer' })

    await admin.from('orders')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', o.id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to refund' }, { status: 500 })
  }
}
