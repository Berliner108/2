import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export async function POST() {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const si = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      usage: 'off_session',
    })
    return NextResponse.json({ clientSecret: si.client_secret })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create SetupIntent' }, { status: 500 })
  }
}
