// src/app/api/orders/release/route.ts
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
      .select('id,buyer_id,supplier_id,amount_cents,currency,status,charge_id')
      .eq('id', orderId)
      .maybeSingle()
    if (error || !o) return NextResponse.json({ error: error?.message || 'Order not found' }, { status: 404 })
    if (o.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (o.status !== 'funds_held') return NextResponse.json({ error: `Invalid status ${o.status}` }, { status: 400 })
    if (!o.charge_id) return NextResponse.json({ error: 'Charge not available' }, { status: 400 })

    // Supplier Connect-Konto prüfen
    const { data: sup } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', o.supplier_id)
      .maybeSingle()
    const connectId = sup?.stripe_connect_id as string | undefined
    if (!connectId) return NextResponse.json({ error: 'Supplier not onboarded to Connect' }, { status: 400 })

    // Optional: check account capability
    const acct = await stripe.accounts.retrieve(connectId)
    if (!(acct as any).charges_enabled || !(acct as any).payouts_enabled) {
      return NextResponse.json({ error: 'Supplier account not ready for payouts' }, { status: 400 })
    }

    // 7% Fee → runden
    const fee = Math.round(o.amount_cents * 0.07)
    const transferAmount = o.amount_cents - fee
    if (transferAmount <= 0) return NextResponse.json({ error: 'Transfer amount invalid' }, { status: 400 })

    // Transfer auslösen
    const tr = await stripe.transfers.create({
      amount: transferAmount,
      currency: o.currency || 'eur',
      destination: connectId,
      source_transaction: o.charge_id,   // Mittel an diese Charge „anheften“
      metadata: { order_id: o.id },
      transfer_group: `order_${o.id}`,
    })

    await admin
      .from('orders')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        fee_cents: fee,
        transferred_cents: transferAmount,
        transfer_id: tr.id,
      })
      .eq('id', o.id)

    return NextResponse.json({ ok: true, transferId: tr.id, fee_cents: fee, transferred_cents: transferAmount })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to release funds' }, { status: 500 })
  }
}
