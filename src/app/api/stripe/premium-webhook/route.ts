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

function getSubscriptionIdFromInvoice(invoice: any): string | null {
  if (typeof invoice?.subscription === 'string') return invoice.subscription
  if (invoice?.subscription?.id) return invoice.subscription.id

  const parentSubscription = invoice?.parent?.subscription_details?.subscription
  if (typeof parentSubscription === 'string') return parentSubscription
  if (parentSubscription?.id) return parentSubscription.id

  return null
}

function getCustomerId(subscription: any): string | null {
  if (typeof subscription?.customer === 'string') return subscription.customer
  return subscription?.customer?.id ?? null
}

function getCurrentPeriodEnd(subscription: any): number | null {
  if (
    typeof subscription?.current_period_end === 'number' &&
    subscription.current_period_end > 0
  ) {
    return subscription.current_period_end
  }

  const itemEnds = Array.isArray(subscription?.items?.data)
    ? subscription.items.data
        .map((item: any) =>
          typeof item?.current_period_end === 'number'
            ? item.current_period_end
            : null
        )
        .filter((value: number | null): value is number => value !== null)
    : []

  return itemEnds.length ? Math.max(...itemEnds) : null
}

function subscriptionContainsPremiumPrice(
  subscription: any,
  premiumPriceId: string
): boolean {
  const items = Array.isArray(subscription?.items?.data)
    ? subscription.items.data
    : []

  return items.some((item: any) => {
    const priceId =
      typeof item?.price === 'string'
        ? item.price
        : item?.price?.id

    return priceId === premiumPriceId
  })
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

  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID
  if (!premiumPriceId) {
    return NextResponse.json(
      { error: 'STRIPE_PREMIUM_PRICE_ID fehlt' },
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
    console.error('[premium-webhook] Ungültige Signatur:', error?.message)
    return NextResponse.json(
      { error: 'Ungültige Signatur' },
      { status: 400 }
    )
  }

  const admin = supabaseAdmin()

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice: any = event.data.object
        const subscriptionId = getSubscriptionIdFromInvoice(invoice)

        if (!subscriptionId) break

        const subscription: any =
          await stripe.subscriptions.retrieve(subscriptionId)

        const purpose = subscription.metadata?.purpose
        const userId = subscription.metadata?.scouti_user_id

        if (purpose !== 'scouti_premium' || !userId) break

        if (!subscriptionContainsPremiumPrice(subscription, premiumPriceId)) {
          console.warn(
            '[premium-webhook] Falsche Price für Premium-Subscription:',
            subscription.id
          )
          break
        }

        if (invoice.paid !== true) {
          console.warn(
            '[premium-webhook] invoice.payment_succeeded aber invoice.paid != true:',
            invoice.id
          )
          break
        }

        const customerId = getCustomerId(subscription)
        if (!customerId) {
          throw new Error('Subscription hat keinen Customer')
        }

        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('id, stripe_customer_id, stripe_subscription_id')
          .eq('id', userId)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile) break

        if (
          profile.stripe_customer_id &&
          profile.stripe_customer_id !== customerId
        ) {
          console.warn(
            '[premium-webhook] Stripe-Customer passt nicht zum Profil:',
            userId,
            customerId
          )
          break
        }

        if (
          profile.stripe_subscription_id &&
          profile.stripe_subscription_id !== subscription.id
        ) {
          console.warn(
            '[premium-webhook] Andere Subscription bereits im Profil hinterlegt:',
            userId
          )
          break
        }

        const periodEnd = getCurrentPeriodEnd(subscription)
        const premiumUntil = toIsoFromUnix(periodEnd)

        if (!premiumUntil) {
          throw new Error('Subscription hat kein current_period_end')
        }

        const { error } = await admin
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_until: premiumUntil,
            premium_payment_failed: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) throw error

        console.log(
          '[premium-webhook] Premium bestätigt:',
          userId,
          subscription.id,
          premiumUntil
        )

        break
      }

      case 'invoice.payment_failed': {
        const invoice: any = event.data.object

        console.warn(
          '[premium-webhook] Premium-Zahlung fehlgeschlagen:',
          invoice.id
        )

        const subscriptionId = getSubscriptionIdFromInvoice(invoice)
        if (!subscriptionId) break

        const subscription: any =
          await stripe.subscriptions.retrieve(subscriptionId)

        const purpose = subscription.metadata?.purpose
        const userId = subscription.metadata?.scouti_user_id

        if (purpose !== 'scouti_premium' || !userId) break

        if (!subscriptionContainsPremiumPrice(subscription, premiumPriceId)) {
          break
        }

        const customerId = getCustomerId(subscription)
        if (!customerId) {
          throw new Error('Subscription hat keinen Customer')
        }

        const { data: profile, error: profileError } = await admin
          .from('profiles')
          .select('id, stripe_customer_id, stripe_subscription_id')
          .eq('id', userId)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile) break

        if (
          profile.stripe_customer_id &&
          profile.stripe_customer_id !== customerId
        ) {
          console.warn(
            '[premium-webhook] Customer-Mismatch bei fehlgeschlagener Zahlung:',
            userId
          )
          break
        }

        if (
          profile.stripe_subscription_id &&
          profile.stripe_subscription_id !== subscription.id
        ) {
          console.warn(
            '[premium-webhook] Subscription-Mismatch bei fehlgeschlagener Zahlung:',
            userId
          )
          break
        }

        const { error } = await admin
          .from('profiles')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            premium_payment_failed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) throw error

        // premium_until wird absichtlich NICHT verändert.
        break
      }

      case 'customer.subscription.deleted': {
        const subscription: any = event.data.object

        if (subscription.metadata?.purpose !== 'scouti_premium') {
          break
        }

        const userId = subscription.metadata?.scouti_user_id
        if (!userId) break

        const { error } = await admin
          .from('profiles')
          .update({
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .eq('stripe_subscription_id', subscription.id)

        if (error) throw error

        // premium_until bleibt absichtlich bestehen.
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

    return NextResponse.json(
      { error: 'Webhook-Verarbeitung fehlgeschlagen' },
      { status: 500 }
    )
  }
}
