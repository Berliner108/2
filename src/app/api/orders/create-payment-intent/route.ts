// src/app/api/orders/create-payment-intent/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

type Body = {
  kind: 'lack' | 'auftrag'
  requestId: string
  offerId?: string | null
  supplierId: string
  amountCents: number
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { kind, requestId, offerId, supplierId, amountCents } = (await req.json()) as Body
    if (!kind || !requestId || !supplierId || !amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Missing/invalid input' }, { status: 400 })
    }
    if (supplierId === user.id) {
      return NextResponse.json({ error: 'Buyer and supplier cannot be the same' }, { status: 400 })
    }

    // 1) Buyer Stripe-Customer + Default PM
    const customerId = await getOrCreateStripeCustomer(user.id, user.email || undefined)
    const customer = await stripe.customers.retrieve(customerId)
    const defaultPm: string | undefined = (customer as any)?.invoice_settings?.default_payment_method || undefined
    if (!defaultPm) {
      return NextResponse.json({ error: 'No default payment method saved' }, { status: 400 })
    }

    // 2) Order-Zeile anlegen (oder upsert per offerId/requestId)
    const admin = supabaseAdmin()
    const autoReleaseAt = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()

    const { data: orderRow, error: insErr } = await admin
      .from('orders')
      .insert({
        buyer_id: user.id,
        supplier_id: supplierId,
        kind,
        request_id: requestId,
        offer_id: offerId ?? null,
        amount_cents: amountCents,
        currency: 'eur',
        status: 'funds_held',
        auto_release_at: autoReleaseAt,
      })
      .select('id')
      .single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // 3) PaymentIntent erzeugen & (möglichst) bestätigen
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      customer: customerId,
      payment_method: defaultPm,
      confirm: true,
      confirmation_method: 'automatic',
      use_stripe_sdk: true,               // falls 3DS nötig
      description: `Order ${orderRow.id} (${kind})`,
      metadata: {
        order_id: orderRow.id,
        buyer_id: user.id,
        supplier_id: supplierId,
        kind,
        request_id: requestId,
        offer_id: offerId || '',
      },
      transfer_group: `order_${orderRow.id}`, // nützlich für spätere Transfers/Reversals
    })

    // 4) DB updaten
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge as any)?.id
    await admin.from('orders')
      .update({ payment_intent_id: pi.id, charge_id: chargeId ?? null })
      .eq('id', orderRow.id)

    // 5) Falls 3DS nötig → Client muss confirmCardPayment aufrufen
    if (pi.status === 'requires_action' || (pi as any).next_action) {
  return NextResponse.json({
    orderId: orderRow.id,
    clientSecret: pi.client_secret,
    requiresAction: true
  })
}


    if (pi.status !== 'succeeded' && pi.status !== 'processing') {
      return NextResponse.json({ error: `PaymentIntent status: ${pi.status}` }, { status: 400 })
    }

    return NextResponse.json({ orderId: orderRow.id, clientSecret: pi.client_secret, requiresAction: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create PI' }, { status: 500 })
  }
}
