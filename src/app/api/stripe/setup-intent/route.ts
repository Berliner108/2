import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getOrCreateCustomerId(user: any) {
  const admin = supabaseAdmin()

  // 1) Versuch: aus profiles lesen
  try {
    const { data: prof } = await admin
      .from('profiles')
      .select('stripe_customer_id, username')
      .eq('id', user.id)
      .maybeSingle()

    if (prof?.stripe_customer_id) return prof.stripe_customer_id

    // 2) Stripe-Customer anlegen
    const stripe = getStripe()
    if (!stripe) return null

    const md: any = user.user_metadata || {}
    const name = [md.firstName, md.lastName].filter(Boolean).join(' ').trim() || prof?.username || ''
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: name || undefined,
      metadata: { supabase_user_id: user.id },
    })

    // 3) In profiles speichern (best effort)
    await admin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)

    return customer.id
  } catch {
    return null
  }
}

export async function POST() {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 503 })
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  const customerId = await getOrCreateCustomerId(user)
  if (!customerId) {
    return NextResponse.json({ ok: false, error: 'no_customer' }, { status: 500 })
  }

  try {
    const si = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      usage: 'off_session',
    })
    return NextResponse.json({ ok: true, clientSecret: si.client_secret })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'setup_intent_failed' }, { status: 500 })
  }
}
