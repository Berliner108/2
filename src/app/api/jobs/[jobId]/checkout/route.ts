// src/app/api/jobs/[jobId]/checkout/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const CURRENCY = 'eur'

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

function toSafeInt(n: any) {
  // bigint aus DB kann als string kommen -> Number()
  const x = typeof n === 'bigint' ? Number(n) : Number(n)
  if (!Number.isFinite(x) || !Number.isInteger(x)) return null
  if (x < 0) return null
  // Stripe amounts müssen safe integer sein
  if (x > Number.MAX_SAFE_INTEGER) return null
  return x
}

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await params
    const jobId = s(jobIdRaw)
    if (!jobId) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const admin = supabaseAdmin()

    // 1) Job laden
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, published, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    if (!job.published) return NextResponse.json({ ok: false, error: 'job_not_published' }, { status: 409 })

    const ownerId = String(job.user_id)
    if (ownerId !== user.id) return NextResponse.json({ ok: false, error: 'forbidden_not_owner' }, { status: 403 })

    const selOfferId = s(job.selected_offer_id)
    if (!selOfferId) return NextResponse.json({ ok: false, error: 'no_selected_offer' }, { status: 409 })

    // Job darf open oder awaiting_payment sein (je nach Timing)
    if (!['open', 'awaiting_payment'].includes(String(job.status))) {
      return NextResponse.json({ ok: false, error: 'job_wrong_status' }, { status: 409 })
    }

    // 2) Offer laden (selected)
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, status, gesamt_cents, payment_intent_id')
      .eq('id', selOfferId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (offErr || !offer) return NextResponse.json({ ok: false, error: 'offer_not_found' }, { status: 404 })
    if (!['selected'].includes(String(offer.status))) {
      // wenn du "Zahlung erneut öffnen" erlauben willst und Offer bereits paid ist -> hier anders behandeln
      return NextResponse.json({ ok: false, error: 'offer_not_selected' }, { status: 409 })
    }

    const amount = toSafeInt(offer.gesamt_cents)
    if (amount === null) return NextResponse.json({ ok: false, error: 'invalid_amount' }, { status: 400 })

    // 3) PaymentIntent erstellen
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      // wichtig: metadata damit dein webhook weiß, dass es job ist
      metadata: {
        kind: 'job',
        jobId: String(jobId),
        offerId: String(selOfferId),
      },
      // optional: bessere UX
      automatic_payment_methods: { enabled: true },
    })

    // 4) DB markieren: Job awaiting_payment + Offer payment_intent_id
    await admin
      .from('jobs')
      .update({ status: 'awaiting_payment', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    await admin
      .from('job_offers')
      .update({ payment_intent_id: pi.id, currency: CURRENCY })
      .eq('id', selOfferId)

    return NextResponse.json(
      { ok: true, clientSecret: pi.client_secret, paymentIntentId: pi.id },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    console.error('[POST /api/jobs/:jobId/checkout] fatal:', e)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
