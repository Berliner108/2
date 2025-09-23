import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

type Body = { kind: 'lack' | 'auftrag'; requestId: string; offerId: string }
const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { kind, requestId, offerId } = (await req.json()) as Body
    if (!kind || !requestId || !offerId) {
      return NextResponse.json({ error: 'Missing/invalid input' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // --- Offer prüfen ---
    const { data: offer, error: offErr } = await admin
      .from('lack_offers')
      .select('id, request_id, supplier_id, amount_cents, currency, status, expires_at')
      .eq('id', offerId)
      .eq('request_id', requestId)
      .maybeSingle()
    if (offErr) return NextResponse.json({ error: offErr.message }, { status: 500 })
    if (!offer)  return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })
    if (offer.status !== 'active') return NextResponse.json({ error: 'OFFER_NOT_ACTIVE' }, { status: 400 })
    if (offer.expires_at && +new Date(offer.expires_at) < Date.now()) {
      return NextResponse.json({ error: 'OFFER_EXPIRED' }, { status: 400 })
    }

    const amountCents = Number(offer.amount_cents)
    const supplierId  = String(offer.supplier_id)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid offer price' }, { status: 400 })
    }
    if (supplierId === user.id) {
      return NextResponse.json({ error: 'Buyer and supplier cannot be the same' }, { status: 400 })
    }

    // --- Verkäufer (Connect) prüfen ---
    const { data: supProf } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', supplierId)
      .maybeSingle()
    const connectId = supProf?.stripe_connect_id as string | undefined
    if (!connectId) return NextResponse.json({ error: 'SELLER_NOT_CONNECTED' }, { status: 400 })
    const acct = await stripe.accounts.retrieve(connectId)
    if (!(acct as any)?.payouts_enabled || !(acct as any)?.charges_enabled) {
      return NextResponse.json({ error: 'SELLER_NOT_READY' }, { status: 400 })
    }

    // --- Request dem Käufer zuordnen & offen? ---
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('id, owner_id, status, published')
      .eq('id', requestId)
      .single()
    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })
    if (!reqRow || reqRow.owner_id !== user.id) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    if (reqRow.status !== 'open' || reqRow.published === false) {
      return NextResponse.json({ error: 'REQUEST_NOT_OPEN' }, { status: 400 })
    }

    // --- Stripe Customer (Buyer) ---
    const customerId = await getOrCreateStripeCustomer(user.id, user.email || undefined)

    // --- Order anlegen (noch nicht vergeben; keine Request-Änderung hier!) ---
    const feeCents = Math.round(amountCents * 0.07)
    const autoReleaseAt = new Date(Date.now() + FOUR_WEEKS_MS).toISOString()
    const { data: orderRow, error: insErr } = await admin
      .from('orders')
      .insert({
        buyer_id: user.id,
        supplier_id: supplierId,
        kind,
        request_id: requestId,
        offer_id: offerId,
        amount_cents: amountCents,
        fee_cents: feeCents,
        currency: (offer.currency || 'eur').toLowerCase(),
        status: 'requires_confirmation',
        auto_release_at: autoReleaseAt,
      })
      .select('id')
      .single()
    if (insErr || !orderRow) {
      return NextResponse.json({ error: insErr?.message || 'Failed to create order' }, { status: 500 })
    }

    // --- PaymentIntent erstellen ---
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: (offer.currency || 'eur').toLowerCase(),
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      description: `Order ${orderRow.id} (${kind})`,
      metadata: {
        order_id: orderRow.id,
        buyer_id: user.id,
        supplier_id: supplierId,
        kind,
        request_id: requestId,
        lack_request_id: requestId,
        offer_id: offerId,
      },
      transfer_group: `order_${orderRow.id}`,
    })

    await admin.from('orders').update({ payment_intent_id: pi.id }).eq('id', orderRow.id)
    if (!pi.client_secret) return NextResponse.json({ error: 'No client_secret' }, { status: 500 })

    return NextResponse.json({ orderId: orderRow.id, clientSecret: pi.client_secret })
  } catch (e: any) {
    console.error('[orders/create-payment-intent] fatal', e)
    return NextResponse.json({ error: e?.message || 'Failed to create PI' }, { status: 500 })
  }
}
