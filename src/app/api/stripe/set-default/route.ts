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

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ ok: false, error: 'stripe_not_configured' }, { status: 503 })
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const pmId = (body?.pmId || '').toString().trim()
  if (!pmId) {
    return NextResponse.json({ ok: false, error: 'pmId_required' }, { status: 400 })
  }

  const customerId = await getCustomerId(user.id)
  if (!customerId) {
    return NextResponse.json({ ok: false, error: 'no_customer' }, { status: 400 })
  }

  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pmId },
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'set_default_failed' }, { status: 500 })
  }
}
