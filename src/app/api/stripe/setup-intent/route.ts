import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export async function POST() {
  try {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    // Bis SEPA in STRIPE (LIVE) aktiviert ist: nur Kartenzahlungen
    const types: Array<'card' | 'sepa_debit'> =
      process.env.STRIPE_ENABLE_SEPA === '1' ? ['card', 'sepa_debit'] : ['card']

    const si = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: types,
      usage: 'off_session',
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ clientSecret: si.client_secret })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create setup intent' }, { status: 500 })
  }
}
