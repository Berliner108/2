import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { orderId, reason } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: order } = await admin
      .from('orders')
      .select('id, buyer_id, supplier_id, status, charge_id, transfer_id, request_id')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Buyer darf reklamieren (oder Admin)
    if (order.buyer_id !== user.id && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'funds_held') {
      return NextResponse.json({ error: 'Order not refundable' }, { status: 400 })
    }
    if (!order.charge_id) return NextResponse.json({ error: 'Missing charge' }, { status: 400 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    // Normalfall: noch kein Transfer erstellt → einfache Rückerstattung
    const rf = await stripe.refunds.create({
      charge: order.charge_id,
      reason: reason && typeof reason === 'string' ? 'requested_by_customer' : undefined,
      metadata: { order_id: order.id, request_id: order.request_id },
    })

    await admin.from('orders').update({
      refunded_at: new Date().toISOString(),
      status: 'canceled',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)

    // Anfrage zurücksetzen (wieder sichtbar machen)
    await admin.from('lack_requests').update({
      status: 'open',
      published: true,
      updated_at: new Date().toISOString(),
      // optional: data->disputed_at setzen; weglassen für minimal
    }).eq('id', order.request_id)

    return NextResponse.json({ ok: true, refundId: rf.id }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Refund failed' }, { status: 500 })
  }
}
