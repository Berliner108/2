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

    // Default merken
    const cust = await stripe.customers.retrieve(customerId)
    const defaultPm: string | null = (cust as any)?.invoice_settings?.default_payment_method ?? null

    // Detach
    await stripe.paymentMethods.detach(pmId)

    // Wenn default entfernt wurde → neue default setzen (falls vorhanden), sonst leeren
    if (defaultPm === pmId) {
      const rest = await stripe.paymentMethods.list({ customer: customerId, type: 'card' })
      const next = rest.data[0]?.id
      if (next) {
        await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: next } })
      } else {
        // TS lässt null nicht zu → casten (Stripe akzeptiert null serverseitig)
        await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: null as any } })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to detach PM' }, { status: 500 })
  }
}
