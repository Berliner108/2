// src/app/api/stripe/premium-checkout/route.ts

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

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID

    if (!priceId) {
      return NextResponse.json(
        { error: 'STRIPE_PREMIUM_PRICE_ID fehlt' },
        { status: 500 }
      )
    }

    // Eingeloggten Scouti-User ermitteln
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

    // Profil laden
    const admin = supabaseAdmin()

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(`
        stripe_customer_id,
        stripe_subscription_id,
        premium_until,
        premium_exempt
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[premium-checkout] profile:', profileError)
      return NextResponse.json(
        { error: 'Profil konnte nicht geladen werden' },
        { status: 500 }
      )
    }

    // Ausgenommene Accounts brauchen kein Abo
    if (profile?.premium_exempt === true) {
      return NextResponse.json(
        { error: 'Dieser Account benötigt kein Scouti Premium.' },
        { status: 400 }
      )
    }

    // Doppeltes Abo verhindern
    const premiumUntil = profile?.premium_until
      ? new Date(profile.premium_until).getTime()
      : 0

    if (
      profile?.stripe_subscription_id &&
      premiumUntil > Date.now()
    ) {
      return NextResponse.json(
        { error: 'Scouti Premium ist bereits aktiv.' },
        { status: 400 }
      )
    }

    const origin = new URL(req.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // Falls bereits Stripe-Customer vorhanden:
      ...(profile?.stripe_customer_id
        ? {
            customer: profile.stripe_customer_id,
          }
        : {
            customer_email: user.email ?? undefined,
          }),

      client_reference_id: user.id,

      metadata: {
        scouti_user_id: user.id,
        purpose: 'scouti_premium',
      },

      subscription_data: {
        metadata: {
          scouti_user_id: user.id,
          purpose: 'scouti_premium',
        },
      },

      success_url:
        `${origin}/konto?premium=success&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${origin}/konto?premium=cancelled`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: 'Checkout-URL konnte nicht erstellt werden' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: session.url,
    })

  } catch (error: any) {
    console.error(
      '[premium-checkout] Fehler:',
      error?.message || error
    )

    return NextResponse.json(
      { error: 'Premium-Checkout konnte nicht gestartet werden' },
      { status: 500 }
    )
  }
}