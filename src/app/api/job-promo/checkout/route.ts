// src/app/api/job-promo/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'http://localhost:3000'

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY ist nicht gesetzt')
}

const stripe = new Stripe(STRIPE_SECRET_KEY)

/**
 * Erwarteter Body (JSON):
 * {
 *   "jobId": "uuid",
 *   "packageCodes": ["homepage", "search_boost", "premium"]
 * }
 *
 * Die Codes müssen zu job_promo_packages.code passen.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    // 1) Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('job-promo/checkout: not authenticated', userError)
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: 401 },
      )
    }

    // 2) Body lesen
    const body = await req.json().catch(() => null) as
      | { jobId?: string; packageCodes?: string[] }
      | null

    const jobId = body?.jobId
    const packageCodes = (body?.packageCodes ?? []).filter(Boolean)

    if (!jobId) {
      return NextResponse.json(
        { error: 'missing_job_id' },
        { status: 400 },
      )
    }

    if (!packageCodes.length) {
      return NextResponse.json(
        { error: 'no_packages_selected' },
        { status: 400 },
      )
    }

    // 3) Job laden & Ownership prüfen
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, user_id, status, promo_score, promo_options')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      console.error('job-promo/checkout: job not found', jobError)
      return NextResponse.json(
        { error: 'job_not_found' },
        { status: 404 },
      )
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Job gehört nicht dir' },
        { status: 403 },
      )
    }

    if (job.status !== 'open') {
      return NextResponse.json(
        { error: 'job_not_open', message: 'Job ist nicht mehr offen' },
        { status: 400 },
      )
    }

    // 4) Job-Promo-Pakete aus DB ziehen
    const { data: dbPackages, error: packagesError } = await supabase
      .from('job_promo_packages')
      .select(
        'code, title, description, score_delta, amount_cents, currency, active, stripe_price_id',
      )
      .in('code', packageCodes)
      .eq('active', true)

    if (packagesError) {
      console.error('job-promo/checkout: packagesError', packagesError)
      return NextResponse.json(
        { error: 'packages_query_failed', details: packagesError.message },
        { status: 500 },
      )
    }

    if (!dbPackages || dbPackages.length === 0) {
      return NextResponse.json(
        { error: 'no_valid_packages' },
        { status: 400 },
      )
    }

    // Prüfen, ob alle angefragten Codes auch wirklich existieren/aktiv sind
    const validCodes = dbPackages.map((p) => p.code)
    const missing = packageCodes.filter((c) => !validCodes.includes(c))

    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'invalid_package_codes', missing },
        { status: 400 },
      )
    }

    // 5) Summen & Currency
    const currency =
      dbPackages[0].currency && dbPackages[0].currency.length > 0
        ? dbPackages[0].currency
        : 'EUR'

    const scoreDeltaTotal = dbPackages.reduce(
      (sum, p) => sum + Number(p.score_delta ?? 0),
      0,
    )

    const amountCentsTotal = dbPackages.reduce(
      (sum, p) => sum + Number(p.amount_cents ?? 0),
      0,
    )

    if (amountCentsTotal <= 0) {
      return NextResponse.json(
        { error: 'amount_zero', message: 'Gesamtbetrag ist 0' },
        { status: 400 },
      )
    }

    // 6) job_promo_orders-Eintrag anlegen (pending)
    const { data: order, error: orderError } = await supabase
      .from('job_promo_orders')
      .insert({
        job_id: jobId,
        buyer_id: user.id,
        package_codes: packageCodes,
        score_delta_total: scoreDeltaTotal,
        amount_cents_total: amountCentsTotal,
        currency,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('job-promo/checkout: orderError', orderError)
      return NextResponse.json(
        { error: 'create_order_failed', details: orderError?.message },
        { status: 500 },
      )
    }

    const orderId = order.id as string

    // 7) Stripe-Checkout-Session erstellen
    const line_items = dbPackages.map((p) => {
      if (!p.stripe_price_id) {
        throw new Error(
          `job_promo_package ${p.code} hat keine stripe_price_id`,
        )
      }

      return {
        price: p.stripe_price_id,
        quantity: 1,
      }
    })

    const successUrl = `${SITE_URL}/konto/angebote?jobId=${encodeURIComponent(
      jobId,
    )}&promo=success`
    const cancelUrl = `${SITE_URL}/konto/angebote?jobId=${encodeURIComponent(
      jobId,
    )}&promo=cancel`

    const origin =
  req.headers.get('origin') ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'http://localhost:3000'

const session = await stripe.checkout.sessions.create({
  mode: 'payment',   // falls du das schon drin hast
  line_items: line_items,                      // unverändert lassen
  success_url:
    `${origin}/konto/angebote` +
    `?jobId=${encodeURIComponent(jobId)}` +
    `&promo_status=success` +
    `&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url:
    `${origin}/konto/angebote` +
    `?jobId=${encodeURIComponent(jobId)}` +
    `&promo_status=cancel` +
    `&session_id={CHECKOUT_SESSION_ID}`,
  metadata: {
    scope: 'job_promo',
    job_id: jobId,
    job_promo_order_id: orderId,             // falls du die ID gespeichert hast
  },
})


    if (!session.url) {
      console.error('job-promo/checkout: session has no URL', session.id)
      return NextResponse.json(
        { error: 'session_creation_failed' },
        { status: 500 },
      )
    }

    // 8) Stripe-Session-ID in job_promo_orders speichern
    const { error: updateOrderError } = await supabase
      .from('job_promo_orders')
      .update({
        stripe_session_id: session.id,
        // payment_intent füllen wir sauber im Webhook nach,
        // wenn checkout.session.completed / payment_intent.succeeded kommt.
      })
      .eq('id', orderId)

    if (updateOrderError) {
      console.error(
        'job-promo/checkout: updateOrderError',
        updateOrderError,
      )
      // Kein harter Abbruch, weil die Session schon existiert – aber loggen.
    }

    // 9) URL zurückgeben → im Frontend mit router.push(checkoutUrl)
    return NextResponse.json({
      ok: true,
      checkoutUrl: session.url,
      orderId,
    })
  } catch (err: any) {
    console.error('job-promo/checkout: unexpected error', err)
    return NextResponse.json(
      { error: 'internal_error', details: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}
