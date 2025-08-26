// src/app/api/stripe/list-pms/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getOrCreateStripeCustomer } from '@/lib/stripe-customer'
import { getStripe, type Stripe } from '@/lib/stripe'

export async function GET() {
  try {
    const sb = await supabaseServer()
    const { data: { user }, error } = await sb.auth.getUser()
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    if (!user)   return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const customerId = await getOrCreateStripeCustomer(user.id, user.email)

    const [cards, sepa, customer] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: 'card',       limit: 100 }),
      stripe.paymentMethods.list({ customer: customerId, type: 'sepa_debit', limit: 100 }),
      stripe.customers.retrieve(customerId) as Promise<Stripe.Customer>,
    ])

    const def = customer.invoice_settings?.default_payment_method
    const defaultPm =
      typeof def === 'string' ? def : (def && 'id' in def ? def.id : null)

    const items = [
      ...cards.data.map(pm => ({
        id: pm.id,
        type: 'card' as const,
        brand: pm.card?.brand || '',
        last4: pm.card?.last4 || '',
        exp: pm.card ? `${pm.card.exp_month}/${pm.card.exp_year}` : null,
        bank: null as string | null,
      })),
      ...sepa.data.map(pm => ({
        id: pm.id,
        type: 'sepa_debit' as const,
        brand: 'sepa',
        last4: pm.sepa_debit?.last4 || '',
        exp: null as string | null,
        bank: pm.sepa_debit?.bank_code || null,
      })),
    ]

    return NextResponse.json({ items, defaultPm }, { status: 200 })
  } catch (e: any) {
    console.error('[list-pms] fatal', e)
    return NextResponse.json({ error: e?.message || 'Failed to list PMs' }, { status: 500 })
  }
}
