// src/app/api/stripe/premium-billing/route.ts

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const stripe = getStripe()

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe ist nicht konfiguriert' },
        { status: 500 }
      )
    }

    const sb = await supabaseServer()

    const {
      data: { user },
      error: userError,
    } = await sb.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Nicht eingeloggt' },
        { status: 401 }
      )
    }

    const admin = supabaseAdmin()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(`
        stripe_customer_id,
        stripe_subscription_id,
        premium_exempt
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('[premium-billing] Profilfehler:', profileError)

      return NextResponse.json(
        { error: 'Profil konnte nicht geladen werden' },
        { status: 500 }
      )
    }

    if (profile.premium_exempt === true) {
      return NextResponse.json(
        { error: 'Für diesen Account besteht keine kostenpflichtige Mitgliedschaft.' },
        { status: 400 }
      )
    }

    if (!profile.stripe_customer_id || !profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Keine aktive Premium Mitgliedschaft gefunden.' },
        { status: 400 }
      )
    }

    const origin = new URL(req.url).origin

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/konto/einstellungen#premium`,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error: any) {
    console.error(
      '[premium-billing] Fehler:',
      error?.message || error
    )

    return NextResponse.json(
      { error: 'Zahlungsmethode konnte nicht geöffnet werden.' },
      { status: 500 }
    )
  }
}
