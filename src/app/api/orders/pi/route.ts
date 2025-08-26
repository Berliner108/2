// /src/app/api/orders/pi/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId missing' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Order lesen – Zugriff: buyer oder supplier
    const { data: ord, error: ordErr } = await sb
      .from('orders')
      .select('id, payment_intent_id, buyer_id, supplier_id, status')
      .eq('id', orderId)
      .maybeSingle()

    if (ordErr)  return NextResponse.json({ error: ordErr.message }, { status: 400 })
    if (!ord)    return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (ord.buyer_id !== user.id && ord.supplier_id !== user.id) {
      return NextResponse.json({ error: 'No access' }, { status: 403 })
    }
    if (!ord.payment_intent_id) {
      return NextResponse.json({ error: 'PaymentIntent not yet created' }, { status: 400 })
    }

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const pi = await stripe.paymentIntents.retrieve(ord.payment_intent_id)
    if (!pi.client_secret) {
      return NextResponse.json({ error: 'No client_secret on PI' }, { status: 400 })
    }

    return NextResponse.json({ clientSecret: pi.client_secret })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get PI' }, { status: 500 })
  }
}
