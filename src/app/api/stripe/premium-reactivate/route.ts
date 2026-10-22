// src/app/api/stripe/premium-reactivate/route.ts

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
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
        stripe_subscription_id,
        premium_exempt
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('[premium-reactivate] Profilfehler:', profileError)

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

    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Keine Premium Mitgliedschaft gefunden.' },
        { status: 400 }
      )
    }

    const subscription = await stripe.subscriptions.retrieve(
      profile.stripe_subscription_id
    )

    if (subscription.metadata?.purpose !== 'scouti_premium') {
      return NextResponse.json(
        { error: 'Ungültige Premium Mitgliedschaft.' },
        { status: 400 }
      )
    }

    if (
      subscription.metadata?.scouti_user_id &&
      subscription.metadata.scouti_user_id !== user.id
    ) {
      return NextResponse.json(
        { error: 'Premium Mitgliedschaft gehört nicht zu diesem Account.' },
        { status: 403 }
      )
    }

    const updated = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    )

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
    })
  } catch (error: any) {
    console.error(
      '[premium-reactivate] Fehler:',
      error?.message || error
    )

    return NextResponse.json(
      { error: 'Kündigung konnte nicht zurückgenommen werden.' },
      { status: 500 }
    )
  }
}
