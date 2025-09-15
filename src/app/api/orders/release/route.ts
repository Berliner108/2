import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: order } = await admin
      .from('orders')
      .select('id, buyer_id, supplier_id, amount_cents, fee_cents, currency, status, charge_id, transfer_id, request_id')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Nur Buyer (Freigeben) ODER Admin erlauben
    if (order.buyer_id !== user.id && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (order.status !== 'funds_held') {
      return NextResponse.json({ error: 'Order not in releasable state' }, { status: 400 })
    }
    if (!order.charge_id) {
      return NextResponse.json({ error: 'Missing charge' }, { status: 400 })
    }
    if (order.transfer_id) {
      // idempotent
      return NextResponse.json({ ok: true, transferId: order.transfer_id }, { status: 200 })
    }

    // Connect-Ziel
    const { data: prof } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', order.supplier_id)
      .maybeSingle()
    const destination = prof?.stripe_connect_id as string | undefined
    if (!destination) return NextResponse.json({ error: 'SELLER_NOT_CONNECTED' }, { status: 400 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const fee = Number.isFinite(order.fee_cents) ? Number(order.fee_cents) : Math.round(order.amount_cents * 0.07)
    const sellerAmount = Math.max(0, Number(order.amount_cents) - fee)

    // Transfer vom Platform-Balance zum Verkäufer (separate charges & transfers)
    const tr = await stripe.transfers.create({
      amount: sellerAmount,
      currency: (order.currency || 'eur').toLowerCase(),
      destination,
      source_transaction: order.charge_id,
      transfer_group: `order_${order.id}`,
      metadata: { order_id: order.id, request_id: order.request_id, role: 'release' },
    })

    await admin.from('orders').update({
      transfer_id: tr.id,
      transferred_cents: sellerAmount,
      status: 'released',
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)

    // Request abschließen (Enum später migrieren; jetzt „closed”) und accepted_at setzen
    await admin.from('lack_requests').update({
      status: 'closed',
      data: ({} as any), // optional: jsonb_set – hier minimal
      updated_at: new Date().toISOString(),
    }).eq('id', order.request_id)

    return NextResponse.json({ ok: true, transferId: tr.id }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Release failed' }, { status: 500 })
  }
}
