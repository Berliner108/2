import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const stripe = new Stripe(STRIPE_SECRET_KEY)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { jobId, promoCodes } = await req.json()

    if (!jobId || !Array.isArray(promoCodes) || promoCodes.length === 0) {
      return NextResponse.json(
        { error: 'jobId und mindestens ein Promo-Code erforderlich' },
        { status: 400 },
      )
    }

    // 1️⃣ Job laden (Owner = buyer_id)
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, user_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr) {
      console.error('[job-promo-checkout] Failed to load job', jobErr)
      return NextResponse.json({ error: 'Job-Ladevorgang fehlgeschlagen' }, { status: 500 })
    }
    if (!job) {
      return NextResponse.json({ error: 'Job nicht gefunden' }, { status: 404 })
    }

    // 2️⃣ Pakete laden
    const { data: packages, error: pkgErr } = await supabase
      .from('job_promo_packages')
      .select('code, score_delta, amount_cents, currency, stripe_price_id')
      .in('code', promoCodes)
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (pkgErr) {
      console.error('[job-promo-checkout] Failed to load packages', pkgErr)
      return NextResponse.json({ error: 'Promo-Pakete konnten nicht geladen werden' }, { status: 500 })
    }
    if (!packages || packages.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Promo-Pakete gefunden' }, { status: 400 })
    }

    // Totale berechnen
    const currency = packages[0].currency || 'EUR'
    const scoreTotal = packages.reduce(
      (sum, p) => sum + (p.score_delta ?? 0),
      0,
    )
    const amountTotal = packages.reduce(
      (sum, p) => sum + (p.amount_cents ?? 0),
      0,
    )
    const packageCodes = packages.map((p) => p.code)

    // 3️⃣ Sammel-Order in job_promo_orders anlegen
    const { data: order, error: orderErr } = await supabase
      .from('job_promo_orders')
      .insert({
        job_id: job.id,
        buyer_id: job.user_id,
        package_codes: packageCodes,
        score_delta_total: scoreTotal,
        amount_cents_total: amountTotal,
        currency,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      console.error('[job-promo-checkout] Failed to insert job_promo_orders', orderErr)
      return NextResponse.json({ error: 'Promo-Order konnte nicht angelegt werden' }, { status: 500 })
    }

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    // 4️⃣ Stripe-Checkout-Session erstellen
    const line_items = packages.map((p) => ({
      price: p.stripe_price_id,
      quantity: 1,
    }))

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/konto/angebote?promoJob=success&jobId=${job.id}`,
      cancel_url: `${origin}/konto/angebote?promoJob=cancel&jobId=${job.id}`,
      metadata: {
        type: 'job_promo',
        job_id: job.id,
        job_promo_order_id: order.id,
      },
    })

    // 5️⃣ Session-ID in job_promo_orders speichern
    const { error: updateOrderErr } = await supabase
      .from('job_promo_orders')
      .update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateOrderErr) {
      console.error('[job-promo-checkout] Failed to update job_promo_orders with session id', updateOrderErr)
      // aber wir geben trotzdem die URL zurück
    }

    return NextResponse.json({ checkoutUrl: session.url }, { status: 200 })
  } catch (err) {
    console.error('[job-promo-checkout] Unexpected error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
