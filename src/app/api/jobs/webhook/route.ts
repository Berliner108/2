// src/app/api/jobs/webhook/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type MarkPaidResult =
  | { ignored: true; reason?: string }
  | { ignored?: false; offerUpdated: boolean }

async function markPaidFromPaymentIntent(pi: Stripe.PaymentIntent): Promise<MarkPaidResult> {
  // Nur Job-Payments verarbeiten
  if (s(pi.metadata?.kind) !== 'job') return { ignored: true, reason: 'not_job' }

  const jobId = s(pi.metadata?.jobId)
  const offerId = s(pi.metadata?.offerId)
  if (!jobId || !offerId) return { ignored: true, reason: 'missing_meta' }

  const admin = supabaseAdmin()
  const paidAt = new Date().toISOString()
  const paidAmount = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount
  const currency = (pi.currency || 'eur').toLowerCase()

 // 1) Offer: selected -> paid (idempotent)
const { data: updatedOffer, error: offerErr } = await admin
  .from('job_offers')
  .update({
    status: 'paid',
    paid_at: paidAt,
    paid_amount_cents: paidAmount,
    currency,
    payment_intent_id: pi.id,
    charge_id: (pi.latest_charge ? String(pi.latest_charge) : null),

    // ✅ neu: post-paid defaults
    fulfillment_status: 'in_progress',
    payout_status: 'hold',
  })
  .eq('id', offerId)
  .eq('job_id', jobId)
  .in('status', ['selected', 'paid'])
  .select('id, status')
  .maybeSingle()


  if (offerErr) throw offerErr

  // 2) Job: awaiting_payment -> paid (idempotent)
  const { error: jobErr } = await admin
    .from('jobs')
    .update({ status: 'paid', updated_at: paidAt })
    .eq('id', jobId)
    .eq('selected_offer_id', offerId)
    .in('status', ['awaiting_payment', 'paid'])

  if (jobErr) throw jobErr

  return { offerUpdated: !!updatedOffer?.id }
}

export async function POST(req: Request) {
  try {
    if (!WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false, error: 'missing_STRIPE_WEBHOOK_SECRET' }, { status: 500 })
    }

    const sig = req.headers.get('stripe-signature')
    if (!sig) return NextResponse.json({ ok: false, error: 'missing_signature' }, { status: 400 })

    // Stripe braucht RAW-Body
    const rawBody = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: 'invalid_signature', message: String(e?.message ?? e) },
        { status: 400 }
      )
    }

    // paid NUR bei succeeded
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const result = await markPaidFromPaymentIntent(pi)

      // ✅ kein Spread mit ok-Kollision
      return NextResponse.json({ ok: true, result })
    }

    // alle anderen Events: nichts ändern
    return NextResponse.json({ ok: true, ignored: true, type: event.type })
  } catch (e: any) {
    console.error('[POST /api/jobs/webhook] fatal:', e)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
