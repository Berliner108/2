// src/app/api/stripe/premium-cancel/route.ts

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

    // Eingeloggten User prüfen
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

    // Premium-Abo des Users laden
    const admin = supabaseAdmin()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(`
        stripe_subscription_id,
        premium_until,
        premium_exempt
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[premium-cancel] Profilfehler:', profileError)

      return NextResponse.json(
        { error: 'Profil konnte nicht geladen werden' },
        { status: 500 }
      )
    }

    if (profile?.premium_exempt === true) {
      return NextResponse.json(
        { error: 'Für diesen Account besteht keine kostenpflichtige Mitgliedschaft.' },
        { status: 400 }
      )
    }

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Keine aktive Premium Mitgliedschaft gefunden.' },
        { status: 400 }
      )
    }

    // Abo NICHT sofort kündigen.
    // Nur automatische Verlängerung deaktivieren.
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    )

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      premiumUntil: profile.premium_until,
    })

  } catch (error: any) {
    console.error(
      '[premium-cancel] Fehler:',
      error?.message || error
    )

    return NextResponse.json(
      { error: 'Premium Mitgliedschaft konnte nicht gekündigt werden.' },
      { status: 500 }
    )
  }
}