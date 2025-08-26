import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export async function POST() {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const si = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({ clientSecret: si.client_secret }, { status: 200 })
  } catch (e: any) {
    console.error('[setup-intent]', e)
    return NextResponse.json({ error: e?.message ?? 'error' }, { status: 400 })
  }
}
