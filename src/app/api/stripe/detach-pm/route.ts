import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  try {
    await stripe.paymentMethods.detach(pmId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'detach_failed' }, { status: 500 })
  }
}
