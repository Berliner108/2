import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const { pmId } = await req.json() as { pmId?: string }
  if (!pmId) return NextResponse.json({ error: 'pmId required' }, { status: 400 })

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Optional: prüfen, ob pmId wirklich zum Customer gehört (Security)
  await stripe.paymentMethods.detach(pmId)

  return NextResponse.json({ ok: true })
}
