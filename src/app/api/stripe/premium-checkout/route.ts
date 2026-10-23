// src/app/api/stripe/premium-checkout/route.ts

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'paused',
  'incomplete',
])

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

    /*
     * Sicherheit:
     * Die konfigurierte Stripe-Price muss wirklich das gewünschte
     * Premium-Jahresabo sein: 249 EUR / Jahr.
     */
    const premiumPrice = await stripe.prices.retrieve(priceId)

    if (
      !premiumPrice.active ||
      premiumPrice.currency !== 'eur' ||
      premiumPrice.unit_amount !== 24900 ||
      premiumPrice.type !== 'recurring' ||
      premiumPrice.recurring?.interval !== 'year' ||
      premiumPrice.recurring?.interval_count !== 1
    ) {
      console.error('[premium-checkout] Ungültige Premium-Price-Konfiguration', {
        priceId,
        active: premiumPrice.active,
        currency: premiumPrice.currency,
        unit_amount: premiumPrice.unit_amount,
        type: premiumPrice.type,
        recurring: premiumPrice.recurring,
      })

      return NextResponse.json(
        { error: 'Premium-Preis ist in Stripe nicht korrekt konfiguriert.' },
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

    const admin = supabaseAdmin()

    // Profil inkl. Rechnungsdaten laden
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(`
        stripe_customer_id,
        stripe_subscription_id,
        premium_until,
        premium_exempt,
        company_name,
        vat_number,
        address
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error('[premium-checkout] profile:', profileError)

      return NextResponse.json(
        { error: 'Profil konnte nicht geladen werden' },
        { status: 500 }
      )
    }

    // Ausgenommene Accounts brauchen kein kostenpflichtiges Abo
    if (profile.premium_exempt === true) {
      return NextResponse.json(
        { error: 'Dieser Account benötigt keine kostenpflichtige Premium Mitgliedschaft.' },
        { status: 400 }
      )
    }

    /*
     * Doppeltes Abo verhindern.
     *
     * Nicht nur premium_until prüfen:
     * Auch ein past_due / unpaid / incomplete Abo darf nicht einfach
     * durch ein zweites Abo ersetzt werden.
     */
    if (profile.stripe_subscription_id) {
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id
        )

        if (BLOCKING_SUBSCRIPTION_STATUSES.has(existingSubscription.status)) {
          return NextResponse.json(
            {
              error:
                existingSubscription.status === 'active' ||
                existingSubscription.status === 'trialing'
                  ? 'Premium Mitgliedschaft ist bereits aktiv.'
                  : 'Es besteht bereits eine Premium Mitgliedschaft in Stripe. Bitte verwalte zuerst die bestehende Mitgliedschaft bzw. Zahlungsmethode.',
              subscriptionStatus: existingSubscription.status,
            },
            { status: 409 }
          )
        }
      } catch (error: any) {
        /*
         * Nur "resource_missing" bedeutet: gespeicherte Subscription existiert
         * bei Stripe tatsächlich nicht mehr. Andere Stripe-Fehler nicht ignorieren.
         */
        if (error?.code !== 'resource_missing') {
          throw error
        }
      }
    }

    const premiumUntil = profile.premium_until
      ? new Date(profile.premium_until).getTime()
      : 0

    if (premiumUntil > Date.now()) {
      return NextResponse.json(
        { error: 'Premium Mitgliedschaft ist bereits aktiv.' },
        { status: 400 }
      )
    }

    const addr: any = profile.address || {}
    const meta: any = user.user_metadata || {}

    const customerName =
      String(profile.company_name || '').trim() ||
      [meta.firstName, meta.lastName]
        .map((v: unknown) => String(v || '').trim())
        .filter(Boolean)
        .join(' ') ||
      undefined

    const billingAddress =
      addr.street &&
      addr.zip &&
      addr.city &&
      addr.country
        ? {
            line1: [addr.street, addr.houseNumber]
              .map((v: unknown) => String(v || '').trim())
              .filter(Boolean)
              .join(' '),
            postal_code: String(addr.zip),
            city: String(addr.city),
            country: String(addr.country).toUpperCase(),
          }
        : undefined

    /*
     * Immer genau einen Stripe-Customer verwenden.
     * So hängen Abo, Rechnungen, Adresse und spätere Portal-Sessions
     * dauerhaft am selben Customer.
     */
    let customerId = profile.stripe_customer_id || null

    if (customerId) {
      await stripe.customers.update(customerId, {
        email: user.email ?? undefined,
        name: customerName,
        address: billingAddress,
        metadata: {
          scouti_user_id: user.id,
        },
      })
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: customerName,
        address: billingAddress,
        metadata: {
          scouti_user_id: user.id,
        },
      })

      customerId = customer.id

      const { error: customerSaveError } = await admin
        .from('profiles')
        .update({
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (customerSaveError) {
        console.error(
          '[premium-checkout] stripe_customer_id konnte nicht gespeichert werden:',
          customerSaveError
        )

        return NextResponse.json(
          { error: 'Stripe-Kundendaten konnten nicht gespeichert werden.' },
          { status: 500 }
        )
      }
    }

    const origin = new URL(req.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',

      customer: customerId,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      /*
       * Rechnungsdaten:
       * - vollständige Rechnungsadresse verlangen
       * - Steuer-/UID-Nummer in Stripe Checkout erfassen
       * - Änderungen am Stripe-Customer speichern
       *
       * Eine Subscription erzeugt ihre Rechnungen automatisch über Stripe Billing.
       */
      billing_address_collection: 'required',

      tax_id_collection: {
        enabled: true,
      },

      customer_update: {
        address: 'auto',
        name: 'auto',
      },

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
