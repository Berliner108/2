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
      .select('id,buyer_id,status,charge_id,transfer_id,request_id,refunded_at')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Nur der Käufer
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Idempotenz: schon storniert/erstattet?
    const s = String(order.status || '').toLowerCase()
    if (s === 'canceled' || order.refunded_at) {
      return NextResponse.json({ ok: true, already: true }, { status: 200 })
    }

    // Nur solange Gelder noch bei der Plattform liegen
    if (s !== 'funds_held') {
      return NextResponse.json({ error: 'Order not refundable' }, { status: 400 })
    }
    if (!order.charge_id) {
      return NextResponse.json({ error: 'Missing charge' }, { status: 400 })
    }

    // Wurde bereits an den Verkäufer transferiert? -> hier KEIN normaler Refund mehr möglich
    if (order.transfer_id) {
      return NextResponse.json({ error: 'Already transferred to seller' }, { status: 409 })
    }

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    // Vollständige Rückerstattung
    const rf = await stripe.refunds.create({
      charge: order.charge_id,
      reason: typeof reason === 'string' && reason.trim() ? 'requested_by_customer' : undefined,
      metadata: { order_id: String(order.id), request_id: String(order.request_id) },
    })

    const nowIso = new Date().toISOString()

    await admin.from('orders').update({
      refunded_at: nowIso,
      status: 'canceled',
      updated_at: nowIso,
    }).eq('id', order.id)

    // Anfrage NICHT neu veröffentlichen; nur Status setzen
    await admin.from('lack_requests').update({
      status: 'cancelled',
      updated_at: nowIso,
    }).eq('id', order.request_id)

    return NextResponse.json({ ok: true, refundId: rf.id }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Refund failed' }, { status: 500 })
  }
}
