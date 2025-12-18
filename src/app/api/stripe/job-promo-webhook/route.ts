// src/app/api/stripe/job-promo-webhook/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!process.env.STRIPE_WEBHOOK_SECRET_JOB_PROMO) {
  throw new Error('STRIPE_WEBHOOK_SECRET_JOB_PROMO is not set')
}

const WEBHOOK_SECRET: string = process.env.STRIPE_WEBHOOK_SECRET_JOB_PROMO


if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}
if (!WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET_JOB_PROMO is not set')
}

const stripe = new Stripe(STRIPE_SECRET_KEY)

// kleine Helper
const nowISO = () => new Date().toISOString()

/**
 * Rechnet den Promo-Score & Promo-Optionen für einen Job
 * aus ALLEN bezahlten job_promo_orders neu zusammen
 * und schreibt sie in die Tabelle jobs.
 */
async function recomputeJobPromoFromOrders(admin: any, jobId: string) {
  const { data: orders, error: ordErr } = await admin
    .from('job_promo_orders')
    .select('score_delta_total, package_codes')
    .eq('job_id', jobId)
    .eq('status', 'paid')

  if (ordErr) throw ordErr

  const list = orders ?? []

  const totalScore = list.reduce(
    (sum: number, o: any) => sum + (o.score_delta_total ?? 0),
    0,
  )

  const allCodes = new Set<string>()
  for (const o of list) {
    for (const code of (o.package_codes ?? []) as string[]) {
      if (code) allCodes.add(code)
    }
  }

  const { error: jobErr } = await admin
    .from('jobs')
    .update({
      promo_score: totalScore,
      promo_options: Array.from(allCodes),
      updated_at: nowISO(),
    })
    .eq('id', jobId)

  if (jobErr) throw jobErr
}

/**
 * Wird aufgerufen bei checkout.session.completed
 * – legt / aktualisiert job_promo_orders
 * – und aktualisiert danach den promo_score in jobs.
 */
async function handleCheckoutSessionCompleted(sess: Stripe.Checkout.Session) {
  const admin = supabaseAdmin()

  const jobId = (sess.metadata?.job_id as string | undefined)?.trim()
  const buyerId = (sess.metadata?.user_id as string | undefined)?.trim()
  const codesCsv = (sess.metadata?.package_ids as string | undefined)?.trim()

  if (!jobId || !buyerId || !codesCsv) {
    console.warn('job-promo webhook: fehlende Metadaten', {
      jobId,
      buyerId,
      codesCsv,
    })
    return
  }

  const packageCodes = codesCsv
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)

  if (packageCodes.length === 0) {
    console.warn('job-promo webhook: keine gültigen packageCodes', { codesCsv })
    return
  }

  // Preise & Scores aus job_promo_packages ziehen
  const { data: packages, error: pkgErr } = await admin
    .from('job_promo_packages')
    .select('code, score_delta, amount_cents')
    .in('code', packageCodes)
    .eq('active', true)

  if (pkgErr) throw pkgErr

  if (!packages || packages.length === 0) {
    console.warn('job-promo webhook: keine passenden Packages gefunden', {
      packageCodes,
    })
    return
  }

  const scoreTotal = packages.reduce(
    (sum: number, p: any) => sum + (p.score_delta ?? 0),
    0,
  )

  const amountFromStripe =
    typeof sess.amount_total === 'number' ? sess.amount_total : null
  const amountFallback = packages.reduce(
    (sum: number, p: any) => sum + (p.amount_cents ?? 0),
    0,
  )
  const amountTotal = amountFromStripe ?? amountFallback

  const currency = (sess.currency || 'eur').toString().toUpperCase()

  const piId =
    typeof sess.payment_intent === 'string'
      ? sess.payment_intent
      : (sess.payment_intent as any)?.id ?? null

  // job_promo_orders per Session-ID upserten (idempotent)
  const adminClient = admin

  const { data: existing, error: selErr } = await adminClient
    .from('job_promo_orders')
    .select('id, status')
    .eq('stripe_session_id', sess.id)
    .maybeSingle()

  if (selErr) throw selErr

  if (existing?.id) {
    // Bestellung ist schon angelegt → nur aktualisieren
    const patch: any = {
      updated_at: nowISO(),
      score_delta_total: scoreTotal,
      amount_cents_total: amountTotal,
      currency,
      package_codes: packageCodes,
    }
    if (piId) patch.stripe_payment_intent = piId
    patch.status = 'paid'

    const { error: upErr } = await adminClient
      .from('job_promo_orders')
      .update(patch)
      .eq('id', existing.id)

    if (upErr) throw upErr
  } else {
    // Neue Bestellung anlegen
    const { error: insErr } = await adminClient.from('job_promo_orders').insert({
      job_id: jobId,
      buyer_id: buyerId,
      package_codes: packageCodes,
      score_delta_total: scoreTotal,
      amount_cents_total: amountTotal,
      currency,
      stripe_session_id: sess.id,
      stripe_payment_intent: piId,
      status: 'paid',
      created_at: nowISO(),
      updated_at: nowISO(),
    })

    if (insErr) throw insErr
  }

  // Promo-Score & Optionen für diesen Job neu berechnen
  await recomputeJobPromoFromOrders(adminClient, jobId)
}

/** Falls Zahlung fehlschlägt oder Session abläuft → Bestellung als failed markieren */
async function markOrderFailedBySessionId(sessionId: string, status: 'failed' | 'expired') {
  const admin = supabaseAdmin()
  const { data: existing, error: selErr } = await admin
    .from('job_promo_orders')
    .select('id, status')
    .eq('stripe_session_id', sessionId)
    .maybeSingle()

  if (selErr) throw selErr
  if (!existing?.id) return

  if (existing.status === 'paid') {
    // Schon bezahlt → nichts ändern
    return
  }

  const { error: upErr } = await admin
    .from('job_promo_orders')
    .update({
      status,
      updated_at: nowISO(),
    })
    .eq('id', existing.id)

  if (upErr) throw upErr
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch (err: any) {
    console.error('❌ Job-Promo Webhook: Signature verification failed', err)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sess = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(sess)
        break
      }

      case 'checkout.session.expired': {
        const sess = event.data.object as Stripe.Checkout.Session
        await markOrderFailedBySessionId(sess.id, 'expired')
        break
      }

      case 'payment_intent.payment_failed': {
        // optional: wenn du willst, kannst du hier ebenfalls anhand von Metadaten job_promo_orders updaten
        console.warn('Job-Promo: payment_intent.payment_failed')
        break
      }

      default:
        // andere Events ignorieren wir
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('❌ Job-Promo Webhook Handler Error:', err)
    return new NextResponse('Webhook handler failed', { status: 500 })
  }
}
