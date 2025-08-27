// /src/app/api/lack/accept-offer/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export const dynamic = 'force-dynamic'

type Body = {
  requestId?: string
  offerId?: string
}

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { requestId, offerId } = (await req.json()) as Body
    if (!requestId || !offerId) {
      return NextResponse.json({ error: 'requestId and offerId required' }, { status: 400 })
    }

    // 1) Anfrage prüfen – gehört dem Buyer?
    const { data: reqRow, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, owner_id, status, delivery_at, lieferdatum')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr)  return NextResponse.json({ error: `request read failed: ${reqErr.message}` }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (reqRow.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not your request' }, { status: 403 })
    }

    // 2) Angebot prüfen – aktiv, nicht abgelaufen, gehört nicht dem Buyer
    const { data: offer, error: offErr } = await sb
      .from('lack_offers')
      .select('id, request_id, supplier_id, amount_cents, currency, status, expires_at')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr)  return NextResponse.json({ error: `offer read failed: ${offErr.message}` }, { status: 400 })
    if (!offer)  return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    if (String(offer.request_id) !== String(reqRow.id)) {
      return NextResponse.json({ error: 'Offer does not belong to request' }, { status: 400 })
    }
    if (offer.supplier_id === user.id) {
      return NextResponse.json({ error: 'Cannot accept your own offer' }, { status: 400 })
    }
    if (offer.status !== 'active') {
      return NextResponse.json({ error: 'Offer is not active' }, { status: 400 })
    }
    if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Offer expired' }, { status: 400 })
    }

    // 2.5) Angebot/Anfrage markieren (accepted) & konkurrierende Angebote ablehnen
    {
      const { error: accErr } = await sb
        .from('lack_offers')
        .update({ status: 'accepted' })
        .eq('id', offer.id)
        .eq('status', 'active')
      if (accErr) return NextResponse.json({ error: `offer accept failed: ${accErr.message}` }, { status: 400 })

      const { error: rejErr } = await sb
        .from('lack_offers')
        .update({ status: 'declined' })
        .eq('request_id', requestId)
        .neq('id', offer.id)
        .eq('status', 'active')
      if (rejErr) return NextResponse.json({ error: `other offers decline failed: ${rejErr.message}` }, { status: 400 })

      const { error: reqUpdErr } = await sb
        .from('lack_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
      if (reqUpdErr) return NextResponse.json({ error: `request update failed: ${reqUpdErr.message}` }, { status: 400 })
    }

    // 3) Stripe Customer (Buyer)
    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    // 4) Offene Order zu (offer, buyer) wiederverwenden
    let existingOrderId: string | null = null
    let existingPiId: string | null = null

    {
      const { data: ord, error: ordErr } = await sb
        .from('orders')
        .select('id, payment_intent_id, status')
        .eq('offer_id', offer.id)
        .eq('buyer_id', user.id)
        .in('status', ['processing'])
        .maybeSingle()

      if (ordErr) {
        return NextResponse.json({ error: `order read failed: ${ordErr.message}` }, { status: 400 })
      }
      if (ord) {
        existingOrderId = ord.id
        existingPiId = ord.payment_intent_id || null
      }
    }

    // 5) Falls PI existiert → client_secret zurückgeben (Metadata-Backfill)
    if (existingOrderId && existingPiId) {
      const pi = await stripe.paymentIntents.retrieve(existingPiId)
      if (!pi) return NextResponse.json({ error: 'PaymentIntent missing' }, { status: 400 })

      const newMeta = {
        ...(pi.metadata ?? {}),
        order_id: String(existingOrderId),
        request_id: String(reqRow.id),
        lack_request_id: String(reqRow.id),
      }
      // nur updaten, wenn nötig
      if (
        pi.metadata?.order_id !== newMeta.order_id ||
        pi.metadata?.lack_request_id !== newMeta.lack_request_id ||
        pi.metadata?.request_id !== newMeta.request_id
      ) {
        await stripe.paymentIntents.update(pi.id, { metadata: newMeta })
      }

      return NextResponse.json({
        orderId: existingOrderId,
        clientSecret: pi.client_secret,
      })
    }

    // 6) Neue Order anlegen (status: processing als „offen“)
    const feeCents = Math.round(offer.amount_cents * 0.07)
    const autoReleaseAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString()

    const { data: ins, error: insErr } = await sb
      .from('orders')
      .insert({
        buyer_id: user.id,
        supplier_id: offer.supplier_id,
        kind: 'lack',
        request_id: reqRow.id,
        offer_id: offer.id,
        amount_cents: offer.amount_cents,
        currency: offer.currency || 'EUR',
        fee_cents: feeCents,
        status: 'processing',
        auto_release_at: autoReleaseAt,
      })
      .select('id')
      .maybeSingle()

    if (insErr) {
      return NextResponse.json({ error: `order insert failed: ${insErr.message}` }, { status: 400 })
    }
    const orderId = ins!.id as string

    // 7) PaymentIntent erstellen (Escrow-Ansatz: Auszahlung beim späteren Release)
    const pi = await stripe.paymentIntents.create({
      amount: offer.amount_cents,
      currency: (offer.currency || 'EUR').toLowerCase(),
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: orderId,
        offer_id: offer.id,
        request_id: reqRow.id,
        lack_request_id: reqRow.id, // Alias, falls der Webhook darauf hört
        buyer_id: user.id,
        supplier_id: offer.supplier_id,
        kind: 'lack',
      },
    })

    // 8) PI in Order schreiben
    const { error: updErr } = await sb
      .from('orders')
      .update({ payment_intent_id: pi.id })
      .eq('id', orderId)

    if (updErr) {
      return NextResponse.json({ error: `order update failed: ${updErr.message}` }, { status: 400 })
    }

    return NextResponse.json({
      orderId,
      clientSecret: pi.client_secret,
    })
  } catch (err: any) {
    console.error('[accept-offer] fatal', err)
    return NextResponse.json({ error: err?.message || 'Failed to accept offer' }, { status: 500 })
  }
}
