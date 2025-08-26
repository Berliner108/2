// src/app/api/stripe/setup-intent/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'
import { getStripe } from '@/lib/stripe'

export async function POST() {
  try {
    const sb = await supabaseServer()
    const { data: { user }, error } = await sb.auth.getUser()
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    if (!user)   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const intent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      usage: 'off_session',
      metadata: { supabase_user_id: user.id },
    })

    return NextResponse.json({ clientSecret: intent.client_secret }, { status: 200 })
  } catch (e: any) {
    console.error('[setup-intent] fatal', e)
    return NextResponse.json({ error: e?.message || 'Setup failed' }, { status: 500 })
  }
}
