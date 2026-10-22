// src/app/api/stripe/premium-webhook/route.ts

import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toIsoFromUnix(seconds?: number | null) {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

export async function POST(req: Request) {
  const stripe = getStripe()

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe ist nicht konfiguriert' },
      { status: 500 }
    )
  }

  const webhookSecret = process.env.STRIPE_PREMIUM_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'STRIPE_PREMIUM_WEBHOOK_SECRET fehlt' },
      { status: 500 }
    )
  }

  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Stripe-Signatur fehlt' },
      { status: 400 }
    )
  }

  const rawBody = await req.text()

  let event

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    )
  } catch (error: any) {
    console.error(
      '[premium-webhook] Ungültige Signatur:',
      error?.message
    )

    return NextResponse.json(
      { error: 'Ungültige Signatur' },
      { status: 400 }
    )
  }

  const admin = supabaseAdmin()

  try {
    switch (event.type) {

      /*
       * WICHTIG:
       * Erst eine tatsächlich erfolgreiche Rechnungszahlung
       * aktiviert bzw. verlängert Premium.
       */
      case 'invoice.payment_succeeded': {
        const invoice: any = event.data.object

        // Subscription-ID – mit Fallback für verschiedene Stripe-API-Versionen
        let subscriptionId: string | null = null

        if (typeof invoice.subscription === 'string') {
          subscriptionId = invoice.subscription
        } else if (invoice.subscription?.id) {
          subscriptionId = invoice.subscription.id
        } else {
          const parentSubscription =
            invoice.parent?.subscription_details?.subscription

          if (typeof parentSubscription === 'string') {
            subscriptionId = parentSubscription
          } else if (parentSubscription?.id) {
            subscriptionId = parentSubscription.id
          }
        }

        if (!subscriptionId) {
          break
        }

        // Subscription frisch von Stripe laden.
        // Wir vertrauen NICHT einfach irgendwelchen Client-Daten.
        const subscription: any =
          await stripe.subscriptions.retrieve(subscriptionId)

        const purpose = subscription.metadata?.purpose
        const userId = subscription.metadata?.scouti_user_id

        // Nur Scouti-Premium-Abos behandeln
        if (
          purpose !== 'scouti_premium' ||
          !userId
        ) {
          break
        }

        /*
         * Zusätzliche Sicherheitsprüfung:
         * Die Invoice muss wirklich bezahlt sein.
         */
        if (invoice.paid !== true) {
          console.warn(
            '[premium-webhook] invoice.payment_succeeded aber invoice.paid != true',
            invoice.id
          )
          break
        }

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id ?? null

        const premiumUntil =
          toIsoFromUnix(subscription.current_period_end)

        if (!premiumUntil) {
          throw new Error(
            'Subscription hat kein current_period_end'
          )
        }

        const { error } = await admin
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_until: premiumUntil,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          throw error
        }

        console.log(
          '[premium-webhook] Premium bestätigt:',
          userId,
          subscription.id,
          premiumUntil
        )

        break
      }

      /*
       * Zahlung fehlgeschlagen:
       * NICHT sofort Premium löschen.
       *
       * premium_until bleibt unverändert.
       * Damit kann Stripe seine Retry-Logik durchführen.
       * Wenn keine erfolgreiche Verlängerung kommt,
       * läuft premium_until automatisch ab.
       */
      case 'invoice.payment_failed': {
        const invoice: any = event.data.object

        console.warn(
          '[premium-webhook] Premium-Zahlung fehlgeschlagen:',
          invoice.id
        )

        break
      }

      /*
       * Abo endgültig beendet.
       *
       * premium_until wird NICHT künstlich in die Zukunft gesetzt.
       * Ein bereits gespeichertes Laufzeitende bleibt bestehen.
       */
      case 'customer.subscription.deleted': {
        const subscription: any = event.data.object

        if (
          subscription.metadata?.purpose !== 'scouti_premium'
        ) {
          break
        }

        const userId =
          subscription.metadata?.scouti_user_id

        if (!userId) {
          break
        }

        /*
         * Subscription-ID entfernen.
         * premium_until bleibt bestehen.
         *
         * Falls das Datum bereits vorbei ist,
         * liefert hasPremiumAccess automatisch false.
         */
        const { error } = await admin
          .from('profiles')
          .update({
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          throw error
        }

        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error(
      '[premium-webhook] Verarbeitung fehlgeschlagen:',
      event.type,
      error?.message || error
    )

    /*
     * 500 ist hier ABSICHTLICH:
     * Stripe soll den Webhook erneut versuchen.
     */
    return NextResponse.json(
      { error: 'Webhook-Verarbeitung fehlgeschlagen' },
      { status: 500 }
    )
  }
}