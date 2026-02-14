// src/app/api/jobs/webhook/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const WEBHOOK_SECRET = process.env.STRIPE_JOBS_WEBHOOK_SECRET!

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type MarkPaidResult =
  | { ignored: true; reason?: string }
  | { ignored?: false; offerUpdated: boolean; jobUpdated: boolean }

type ResetResult =
  | { ignored: true; reason?: string }
  | { ignored?: false; reset: boolean }

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Stripe kann Events mehrfach schicken -> dedupe über event.id */
async function ensureEventNotProcessed(eventId: string) {
  const admin = supabaseAdmin()
  const { error } = await admin.from('processed_events').insert({
    provider: 'stripe',
    event_id: eventId,
    created_at: new Date().toISOString(),
  })

  if (!error) return { ok: true as const }

  const msg = String((error as any)?.message ?? '')
  const code = String((error as any)?.code ?? '')

  if (code === '23505' || /duplicate key value/i.test(msg)) {
    return { ok: false as const, reason: 'duplicate_event' as const }
  }

  console.error('[jobs webhook] processed_events insert failed:', error)
  return { ok: true as const } // fail-open
}

async function markPaidFromPaymentIntent(pi: Stripe.PaymentIntent): Promise<MarkPaidResult> {
  if (s(pi.metadata?.kind) !== 'job') return { ignored: true, reason: 'not_job' }

  const jobId = s(pi.metadata?.jobId)
  const offerId = s(pi.metadata?.offerId)
  if (!jobId || !offerId) return { ignored: true, reason: 'missing_meta' }

  const admin = supabaseAdmin()
  const paidAtIso = new Date().toISOString()
  const paidAmount = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount
  const currency = (pi.currency || 'eur').toLowerCase()

  // 0) Schutz: wenn bereits transfer/refund/release passiert -> NICHTS mehr anfassen
  const { data: offerPre, error: preErr } = await admin
    .from('job_offers')
    .select('id, status, payout_status, payout_transfer_id, refunded_at')
    .eq('id', offerId)
    .eq('job_id', jobId)
    .maybeSingle()

  if (preErr) throw preErr
  if (!offerPre) return { ignored: true, reason: 'offer_not_found' }

  if (s((offerPre as any).payout_transfer_id) || s((offerPre as any).refunded_at)) {
    return { ignored: true, reason: 'offer_already_settled' }
  }

  // 1) Offer: selected -> paid (idempotent), aber NUR wenn noch kein transfer gesetzt ist
  const { data: updatedOffer, error: offerErr } = await admin
    .from('job_offers')
    .update({
      status: 'paid',
      paid_at: paidAtIso,
      paid_amount_cents: paidAmount,
      currency,
      payment_intent_id: pi.id,
      charge_id: pi.latest_charge ? String(pi.latest_charge) : null,

      // post-paid defaults
      fulfillment_status: 'in_progress',
      payout_status: 'hold',
    })
    .eq('id', offerId)
    .eq('job_id', jobId)
    .is('payout_transfer_id', null)
    .in('status', ['selected', 'paid'])
    .select('id')
    .maybeSingle()

  if (offerErr) throw offerErr

  // 2) Job: awaiting_payment -> paid (idempotent)
  // ABER nur wenn selected_offer_id passt und nicht schon final/closed/refunded
  const { data: jobPre, error: jobPreErr } = await admin
    .from('jobs')
    .select('id, status, selected_offer_id, released_at, refunded_at')
    .eq('id', jobId)
    .maybeSingle()

  if (jobPreErr) throw jobPreErr
  if (!jobPre) return { ignored: true, reason: 'job_not_found' }

  if (s((jobPre as any).released_at) || s((jobPre as any).refunded_at)) {
    return { ignored: true, reason: 'job_already_final' }
  }
  if (s((jobPre as any).selected_offer_id) !== offerId) {
    return { ignored: true, reason: 'selected_offer_mismatch' }
  }

  const jobStatus = String((jobPre as any).status || '')
  let jobUpdated = false

  // nur wenn job im Bezahl-Flow ist
  if (['awaiting_payment', 'paid'].includes(jobStatus)) {
    const { error: jobErr } = await admin
      .from('jobs')
      .update({ status: 'paid', updated_at: paidAtIso })
      .eq('id', jobId)
      .eq('selected_offer_id', offerId)
      .in('status', ['awaiting_payment', 'paid'])

    if (jobErr) throw jobErr
    jobUpdated = true
  } else {
    // nichts anfassen, aber nicht failen
    jobUpdated = false
  }

  return { offerUpdated: !!updatedOffer?.id, jobUpdated }
}

/** Minimal-Reset: nur wenn wirklich "awaiting_payment"+"selected" und sonst nix final */
async function resetFromPaymentIntent(pi: Stripe.PaymentIntent, reason: 'canceled' | 'failed'): Promise<ResetResult> {
  if (s(pi.metadata?.kind) !== 'job') return { ignored: true, reason: 'not_job' }

  const jobId = s(pi.metadata?.jobId)
  const offerId = s(pi.metadata?.offerId)
  if (!jobId || !offerId) return { ignored: true, reason: 'missing_meta' }

  const admin = supabaseAdmin()
  const nowIso = new Date().toISOString()

  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .select('id, status, selected_offer_id, released_at, refunded_at')
    .eq('id', jobId)
    .maybeSingle()

  if (jobErr || !job) return { ignored: true, reason: 'job_not_found' }
  if (s((job as any).released_at) || s((job as any).refunded_at)) return { ignored: true, reason: 'job_final' }

  if (String(job.status) !== 'awaiting_payment') return { ignored: true, reason: 'job_not_awaiting_payment' }
  if (s(job.selected_offer_id) !== offerId) return { ignored: true, reason: 'selected_offer_mismatch' }

  const { data: offer, error: offerErr } = await admin
    .from('job_offers')
    .select('id, status, payout_transfer_id, refunded_at')
    .eq('id', offerId)
    .eq('job_id', jobId)
    .maybeSingle()

  if (offerErr) throw offerErr
  if (!offer) return { ignored: true, reason: 'offer_not_found' }

  if (s((offer as any).payout_transfer_id) || s((offer as any).refunded_at)) {
    return { ignored: true, reason: 'offer_already_settled' }
  }

  if (String(offer.status) !== 'selected') return { ignored: true, reason: 'offer_not_selected' }

  await admin
    .from('job_offers')
    .update({
      status: 'open',
      payment_intent_id: null,
      updated_at: nowIso,
    })
    .eq('id', offerId)
    .eq('job_id', jobId)
    .eq('status', 'selected')
    .is('payout_transfer_id', null)

  await admin
    .from('jobs')
    .update({
      status: 'open',
      selected_offer_id: null,
      updated_at: nowIso,
    })
    .eq('id', jobId)
    .eq('selected_offer_id', offerId)
    .eq('status', 'awaiting_payment')

  return { reset: true }
}

export async function POST(req: Request) {
  try {
    if (!WEBHOOK_SECRET) return jsonNoStore({ ok: false, error: 'missing_STRIPE_JOBS_WEBHOOK_SECRET' }, 500)

    const sig = req.headers.get('stripe-signature')
    if (!sig) return jsonNoStore({ ok: false, error: 'missing_signature' }, 400)

    const rawBody = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)
    } catch (e: any) {
      return jsonNoStore({ ok: false, error: 'invalid_signature', message: String(e?.message ?? e) }, 400)
    }

    const gate = await ensureEventNotProcessed(String(event.id))
    if (!gate.ok) return jsonNoStore({ ok: true, ignored: true, reason: gate.reason, type: event.type })

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const result = await markPaidFromPaymentIntent(pi)
      return jsonNoStore({ ok: true, type: event.type, result })
    }

    if (event.type === 'payment_intent.canceled') {
      const pi = event.data.object as Stripe.PaymentIntent
      const result = await resetFromPaymentIntent(pi, 'canceled')
      return jsonNoStore({ ok: true, type: event.type, result })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const result = await resetFromPaymentIntent(pi, 'failed')
      return jsonNoStore({ ok: true, type: event.type, result })
    }

    return jsonNoStore({ ok: true, ignored: true, type: event.type })
  } catch (e: any) {
    console.error('[POST /api/jobs/webhook] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
