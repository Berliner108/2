import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// ⚠️ ggf. an dein Env-Schema anpassen:
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET_JOB_PROMO! // Vercel-Var

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const stripe = new Stripe(STRIPE_SECRET_KEY)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    console.error('[job-promo-webhook] Missing stripe-signature header')
    return new NextResponse('Bad Request', { status: 400 })
  }

  let event: Stripe.Event

  try {
    const rawBody = await req.arrayBuffer()
    const buf = Buffer.from(rawBody)
    event = stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[job-promo-webhook] Signature verification failed', err)
    return new NextResponse('Webhook Error', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Nur unsere Job-Promo-Sessions behandeln
        if (session.metadata?.type !== 'job_promo') {
          return NextResponse.json({ received: true })
        }

        const promoOrderId = session.metadata.job_promo_order_id
        const jobId = session.metadata.job_id

        if (!promoOrderId || !jobId) {
          console.error('[job-promo-webhook] Missing metadata (promoOrderId / jobId)')
          return NextResponse.json({ received: true })
        }

        // 1️⃣ Job-Promo-Order laden
        const { data: promoOrder, error: promoOrderErr } = await supabase
          .from('job_promo_orders')
          .select('id, job_id, status, score_delta_total, package_codes, amount_cents_total')
          .eq('id', promoOrderId)
          .maybeSingle()

        if (promoOrderErr) {
          console.error('[job-promo-webhook] Failed to load job_promo_orders', promoOrderErr)
          return NextResponse.json({ received: true })
        }
        if (!promoOrder) {
          console.error('[job-promo-webhook] job_promo_order not found', promoOrderId)
          return NextResponse.json({ received: true })
        }

        // Wenn schon bezahlt → idempotent bleiben
        if (promoOrder.status === 'paid') {
          return NextResponse.json({ received: true })
        }

        // 2️⃣ Job laden (aktueller Score & Optionen)
        const { data: job, error: jobErr } = await supabase
          .from('jobs')
          .select('id, promo_score, promo_options')
          .eq('id', jobId)
          .maybeSingle()

        if (jobErr) {
          console.error('[job-promo-webhook] Failed to load job', jobErr)
          return NextResponse.json({ received: true })
        }
        if (!job) {
          console.error('[job-promo-webhook] job not found', jobId)
          return NextResponse.json({ received: true })
        }

        const currentScore = job.promo_score ?? 0
        const currentOptions: string[] = (job.promo_options ?? []) as string[]

        const newScore = currentScore + (promoOrder.score_delta_total ?? 0)

        // alte + neue Paketcodes, ohne Duplikate
        const newOptions = Array.from(
          new Set([...(currentOptions || []), ...(promoOrder.package_codes ?? [])]),
        )

        const paymentIntent =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null

        // 3️⃣ Order als "paid" markieren
        const { error: updateOrderErr } = await supabase
          .from('job_promo_orders')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent: paymentIntent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', promoOrder.id)

        if (updateOrderErr) {
          console.error('[job-promo-webhook] Failed to update job_promo_orders', updateOrderErr)
          // nicht abbrechen, sondern trotzdem versuchen Job zu updaten
        }

        // 4️⃣ Job-Promo-Score & Optionen aktualisieren
        const { error: updateJobErr } = await supabase
          .from('jobs')
          .update({
            promo_score: newScore,
            promo_options: newOptions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        if (updateJobErr) {
          console.error('[job-promo-webhook] Failed to update jobs promo', updateJobErr)
        }

        return NextResponse.json({ received: true })
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.type !== 'job_promo') {
          return NextResponse.json({ received: true })
        }

        const promoOrderId = session.metadata.job_promo_order_id
        if (!promoOrderId) {
          return NextResponse.json({ received: true })
        }

        // Markiere Order als "canceled" / "failed", Job bleibt ohne Promo
        const { error } = await supabase
          .from('job_promo_orders')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', promoOrderId)

        if (error) {
          console.error('[job-promo-webhook] Failed to mark order canceled', error)
        }

        return NextResponse.json({ received: true })
      }

      default:
        // alle anderen Events ignorieren
        return NextResponse.json({ received: true })
    }
  } catch (err) {
    console.error('[job-promo-webhook] Handler error', err)
    return new NextResponse('Internal error', { status: 500 })
  }
}
