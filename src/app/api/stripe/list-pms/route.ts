import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'

export async function GET() {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const [cards, sepa, cust] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
      stripe.paymentMethods.list({ customer: customerId, type: 'sepa_debit' }),
      stripe.customers.retrieve(customerId),
    ])

    const defaultPm = (cust as any)?.invoice_settings?.default_payment_method ?? null

    const items = [
      ...cards.data.map(pm => ({
        id: pm.id,
        type: 'card',
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        exp: pm.card ? `${pm.card.exp_month}/${String(pm.card.exp_year).slice(-2)}` : null,
      })),
      ...sepa.data.map(pm => ({
        id: pm.id,
        type: 'sepa_debit',
        bank: pm.sepa_debit?.bank_code || null,
        last4: pm.sepa_debit?.last4 || null,
        exp: null,
      })),
    ]

    return NextResponse.json({ items, defaultPm })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to list payment methods' }, { status: 500 })
  }
}
