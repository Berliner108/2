// /src/app/api/orders/refund/route.ts
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

    // Nur Buyer darf reklamieren/erstatten (kein Admin-Bypass)
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'funds_held') {
      return NextResponse.json({ error: 'Order not refundable' }, { status: 400 })
    }
    if (!order.charge_id) return NextResponse.json({ error: 'Missing charge' }, { status: 400 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    // Noch kein Transfer → vollständige Rückerstattung an den Käufer
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

    // WICHTIG: Anfrage NICHT wieder veröffentlichen.
    // published bleibt false; Status optional als 'cancelled' markieren.
    await admin.from('lack_requests').update({
      status: 'cancelled',
      // published NICHT ändern – bleibt false
      updated_at: new Date().toISOString(),
    }).eq('id', order.request_id)

    return NextResponse.json({ ok: true, refundId: rf.id }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Refund failed' }, { status: 500 })
  }
}
