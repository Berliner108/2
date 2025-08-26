// src/app/api/orders/[id]/release/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: { id: string } }

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const orderId = params?.id
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
    }

    // Auth prüfen (nur Käufer darf freigeben)
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Order + Supplier lesen
    const admin = supabaseAdmin()
    const { data: order, error: ordErr } = await admin
      .from('orders')
      .select('id,buyer_id,supplier_id,amount_cents,fee_cents,currency,charge_id,transfer_id,status,transferred_cents')
      .eq('id', orderId)
      .maybeSingle()

    if (ordErr) throw new Error(`orders read failed: ${ordErr.message}`)
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Nur wenn Zahlung erfolgreich ist, noch nichts transferiert wurde
    if (order.status !== 'succeeded') {
      return NextResponse.json({ error: `Order status not releasable: ${order.status}` }, { status: 409 })
    }
    if (order.transfer_id) {
      return NextResponse.json({ error: 'Already released' }, { status: 409 })
    }
    if (!order.charge_id) {
      return NextResponse.json({ error: 'Missing charge on order' }, { status: 422 })
    }

    // Supplier Connect-ID holen
    const { data: supplier, error: supErr } = await admin
      .from('profiles')
      .select('id,stripe_connect_id')
      .eq('id', order.supplier_id)
      .maybeSingle()

    if (supErr) throw new Error(`profiles read failed: ${supErr.message}`)
    if (!supplier?.stripe_connect_id) {
      return NextResponse.json({ error: 'Supplier not onboarded to Stripe Connect' }, { status: 422 })
    }

    // Auszahlungsbetrag = amount - fee (Fee wurde beim PI als application_fee_amount kassiert)
    const gross = Number(order.amount_cents || 0)
    const fee = Number(order.fee_cents || 0)
    const already = Number(order.transferred_cents || 0)
    const toTransfer = gross - fee - already
    if (toTransfer <= 0) {
      return NextResponse.json({ error: 'Nothing to transfer' }, { status: 409 })
    }

    // Transfer vom Plattform-Guthaben an den Connect-Account; verknüpft mit der Charge
    const tr = await stripe.transfers.create({
      amount: toTransfer,
      currency: order.currency || 'eur',
      destination: supplier.stripe_connect_id,
      source_transaction: order.charge_id, // koppelt Transfer an die ursprüngliche Charge
      metadata: { order_id: String(order.id), supplier_id: String(order.supplier_id) },
    })

    // Order updaten
    const { error: updErr } = await admin
      .from('orders')
      .update({
        transfer_id: tr.id,
        transferred_cents: already + toTransfer,
        released_at: new Date().toISOString(),
        status: 'released',
      })
      .eq('id', order.id)

    if (updErr) throw new Error(`orders update failed: ${updErr.message}`)

    return NextResponse.json({ ok: true, transferId: tr.id })
  } catch (err: any) {
    const msg = err?.message || 'Release failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
