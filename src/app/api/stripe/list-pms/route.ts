import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getCustomerId(userId: string) {
  const admin = supabaseAdmin()
  try {
    const { data: prof } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle()
    return prof?.stripe_customer_id || null
  } catch {
    return null
  }
}

export async function GET() {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 503 })
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  const customerId = await getCustomerId(user.id)
  if (!customerId) {
    return NextResponse.json({ ok: true, items: [], defaultPm: null })
  }

  try {
    // Default-PM herausfinden
    const customer = await stripe.customers.retrieve(customerId)
    let defaultPm: string | null = null
    if (!('deleted' in customer) && customer) {
      // new API: invoice_settings.default_payment_method
      // fallback: default_source (Cards als Source sind legacy)
      defaultPm = (customer as any).invoice_settings?.default_payment_method || null
    }

    // Karten
    const cards = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 100,
    })

    // SEPA
    const sepa = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'sepa_debit',
      limit: 100,
    })

    const items = [
      ...cards.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        brand: pm.card?.brand || undefined,
        last4: pm.card?.last4 || undefined,
        exp: pm.card ? `${String(pm.card.exp_month).padStart(2, '0')}/${String(pm.card.exp_year).slice(-2)}` : null,
        bank: null as string | null,
      })),
      ...sepa.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        brand: undefined,
        last4: pm.sepa_debit?.last4 || undefined,
        exp: null as string | null,
        bank: pm.sepa_debit?.bank_code || null,
      })),
    ]

    return NextResponse.json({ ok: true, items, defaultPm })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'list_failed', items: [], defaultPm: null }, { status: 500 })
  }
}
