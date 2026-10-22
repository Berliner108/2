import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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
        premium_trial_ends_at,
        premium_until,
        premium_exempt,
        stripe_subscription_id
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('[me/premium] Profilfehler:', profileError)

      return NextResponse.json(
        { error: 'Premium-Status konnte nicht geladen werden' },
        { status: 500 }
      )
    }

    const now = Date.now()

    const trialEndsAt = profile.premium_trial_ends_at
      ? new Date(profile.premium_trial_ends_at).getTime()
      : 0

    const premiumUntil = profile.premium_until
      ? new Date(profile.premium_until).getTime()
      : 0

    const trialActive = trialEndsAt > now
    const premiumActive = premiumUntil > now

    let cancelAtPeriodEnd = false

    // Nur bei bestehendem bezahltem Abo Stripe abfragen
    if (profile.stripe_subscription_id) {
      try {
        const stripe = getStripe()

        if (stripe) {
          const subscription = await stripe.subscriptions.retrieve(
            profile.stripe_subscription_id
          )

          cancelAtPeriodEnd = subscription.cancel_at_period_end
        }
      } catch (error) {
        console.error(
          '[me/premium] Stripe-Abo konnte nicht geladen werden:',
          error
        )
      }
    }

    let status:
      | 'exempt'
      | 'active'
      | 'trial'
      | 'expired'

    if (profile.premium_exempt === true) {
      status = 'exempt'
    } else if (premiumActive) {
      status = 'active'
    } else if (trialActive) {
      status = 'trial'
    } else {
      status = 'expired'
    }

    const trialDaysRemaining = trialActive
      ? Math.max(
          1,
          Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24))
        )
      : 0

    return NextResponse.json({
      status,

      premiumExempt: profile.premium_exempt === true,

      trialEndsAt: profile.premium_trial_ends_at,
      trialDaysRemaining,

      premiumUntil: profile.premium_until,

      hasSubscription: Boolean(profile.stripe_subscription_id),
      cancelAtPeriodEnd,
    })
  } catch (error: any) {
    console.error('[me/premium] Fehler:', error?.message || error)

    return NextResponse.json(
      { error: 'Premium-Status konnte nicht geladen werden' },
      { status: 500 }
    )
  }
}