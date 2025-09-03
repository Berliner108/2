// /src/app/api/orders/create-payment-intent/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

type Body = {
  kind: 'lack' | 'auftrag'
  requestId: string
  offerId: string
}

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = (await req.json()) as Body
    const kind      = body?.kind
    const requestId = body?.requestId
    const offerId   = body?.offerId

    if (kind !== 'lack' && kind !== 'auftrag') {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }
    if (!requestId || !offerId) {
      return NextResponse.json({ error: 'Missing/invalid input' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // === 0) Sicherstellen: der aktuelle User ist Eigentümer (Ersteller) der Anfrage ===
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('id, owner_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })
    if (!reqRow) return NextResponse.json({ error: 'REQUEST_NOT_FOUND' }, { status: 404 })
    if (reqRow.owner_id !== user.id) {
      return NextResponse.json({ error: 'NOT_REQUEST_OWNER' }, { status: 403 })
    }

    // === 1) Angebot holen (deine Spalten) ===
    const { data: offer, error: offErr } = await admin
      .from('lack_offers')
      .select('id, request_id, amount_cents, currency, supplier_id, vendor_id, expires_at, status')
      .eq('id', offerId)
      .eq('request_id', requestId)
      .maybeSingle()

    if (offErr) return NextResponse.json({ error: offErr.message }, { status: 500 })
    if (!offer)  return NextResponse.json({ error: 'OFFER_NOT_FOUND' }, { status: 404 })

    // Status/Expiry prüfen
    if (offer.status !== 'active') {
      return NextResponse.json({ error: 'OFFER_NOT_ACTIVE' }, { status: 400 })
    }
    if (offer.expires_at && +new Date(offer.expires_at) <= Date.now()) {
      return NextResponse.json({ error: 'OFFER_EXPIRED' }, { status: 400 })
    }

    const amountCents = Number(offer.amount_cents)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'Invalid offer amount' }, { status: 400 })
    }

    const currency = String(offer.currency || 'eur').toLowerCase()
    if (currency !== 'eur') {
      return NextResponse.json({ error: 'UNSUPPORTED_CURRENCY' }, { status: 400 })
    }

    // Verkäufer-ID bestimmen:
    // bevorzugt supplier_id (auth.users), fallback vendor_id (profiles)
    const sellerId = String(offer.supplier_id ?? offer.vendor_id ?? '')
    if (!sellerId) {
      return NextResponse.json({ error: 'SELLER_UNKNOWN' }, { status: 400 })
    }
    if (sellerId === user.id) {
      return NextResponse.json({ error: 'Buyer and supplier cannot be the same' }, { status: 400 })
    }

    // === 2) Stripe-Connect-Gate: Verkäufer muss verbunden & bereit sein ===
    const { data: supProf, error: profErr } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', sellerId)
      .maybeSingle()

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

    const connectId = supProf?.stripe_connect_id as string | undefined
    if (!connectId) {
      // FE kann "Anbieter nicht verbunden" anzeigen
      return NextResponse.json({ error: 'SELLER_NOT_CONNECTED' }, { status: 400 })
    }

    const acct = await stripe.accounts.retrieve(connectId)
    const payoutsEnabled = (acct as any)?.payouts_enabled === true
    const chargesEnabled = (acct as any)?.charges_enabled === true
    if (!payoutsEnabled || !chargesEnabled) {
      return NextResponse.json({ error: 'SELLER_NOT_READY' }, { status: 400 })
    }

    // === 3) Buyer → Stripe Customer ===
    const customerId = await getOrCreateStripeCustomer(user.id, user.email || undefined)

    // === 4) Order anlegen (requires_confirmation bis FE bestätigt) ===
    const autoReleaseAt = new Date(Date.now() + FOUR_WEEKS_MS).toISOString()
    const { data: orderRow, error: insErr } = await admin
      .from('orders')
      .insert({
        buyer_id: user.id,
        supplier_id: sellerId,
        kind,
        request_id: requestId,
        offer_id: offerId,
        amount_cents: amountCents,
        currency,
        status: 'requires_confirmation',
        auto_release_at: autoReleaseAt,
      })
      .select('id')
      .single()

    if (insErr || !orderRow) {
      return NextResponse.json({ error: insErr?.message || 'Failed to create order' }, { status: 500 })
    }

    // === 5) PaymentIntent erstellen (PaymentElement bestätigt clientseitig) ===
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      description: `Order ${orderRow.id} (${kind})`,
      metadata: {
        order_id: orderRow.id,
        buyer_id: user.id,
        supplier_id: sellerId,
        kind,
        request_id: requestId,
        offer_id: offerId,
      },
      // Wenn ihr später per Transfers an den Anbieter auszahlt:
      transfer_group: `order_${orderRow.id}`,
    })

    // Order mit PI verknüpfen
    await admin.from('orders').update({ payment_intent_id: pi.id }).eq('id', orderRow.id)

    if (!pi.client_secret) {
      return NextResponse.json({ error: 'No client_secret on PaymentIntent' }, { status: 500 })
    }

    return NextResponse.json({
      orderId: orderRow.id,
      clientSecret: pi.client_secret,
    })
  } catch (e: any) {
    console.error('[orders/create-payment-intent] fatal', e)
    return NextResponse.json({ error: e?.message || 'Failed to create PI' }, { status: 500 })
  }
}
