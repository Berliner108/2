import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { pmId } = await req.json()
    if (!pmId) return NextResponse.json({ error: 'pmId missing' }, { status: 400 })

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    // Guard: gehört die PM wirklich dem Customer?
    const pm = await stripe.paymentMethods.retrieve(pmId)
    if ((pm as any).customer !== customerId) {
      return NextResponse.json({ error: 'Payment method does not belong to customer' }, { status: 400 })
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pmId },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to set default PM' }, { status: 500 })
  }
}
