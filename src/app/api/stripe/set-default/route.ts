import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { pmId } = await req.json() as { pmId?: string }
  if (!pmId) return NextResponse.json({ error: 'pmId required' }, { status: 400 })

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const sb = await supabaseServer()
  const { data: { user }, error: authErr } = await sb.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: prof } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  const customerId = prof?.stripe_customer_id
  if (!customerId) return NextResponse.json({ error: 'No stripe_customer_id' }, { status: 400 })

  // Nur SETZEN, niemals null schicken:
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pmId },
  })

  return NextResponse.json({ ok: true })
}
