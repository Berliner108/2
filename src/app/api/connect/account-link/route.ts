// src/app/api/connect/account-link/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export async function POST(req: Request) {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: prof, error } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', user.id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let connectId = prof?.stripe_connect_id as string | null

    if (!connectId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'DE', // oder 'AT' je nach Default; Stripe leitet im Onboarding entsprechend
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        metadata: { supabase_user_id: user.id },
      })
      connectId = account.id

      const { error: updErr } = await admin
        .from('profiles')
        .update({ stripe_connect_id: connectId })
        .eq('id', user.id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    const origin = new URL(req.url).origin
    const returnUrl = `${origin}/konto/einstellungen?connect=1`
    const refreshUrl = `${origin}/konto/einstellungen?connect_refresh=1`

    const link = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, accountId: connectId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create account link' }, { status: 500 })
  }
}
