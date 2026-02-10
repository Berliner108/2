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
  | { ignored?: false; offerUpdated: boolean }

type ResetResult =
  | { ignored: true; reason?: string }
  | { ignored?: false; reset: boolean }

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** Stripe kann Events mehrfach schicken -> wir deduplizieren über event.id */
async function ensureEventNotProcessed(eventId: string) {
  const admin = supabaseAdmin()

  // Erwartete Tabelle:
  // processed_events(provider text, event_id text unique, created_at timestamptz)
  // Wenn du andere Spalten hast, sag mir kurz Bescheid.
  const { error } = await admin.from('processed_events').insert({
    provider: 'stripe',
    event_id: eventId,
    created_at: new Date().toISOString(),
  })

  if (!error) return { ok: true as const }

  const msg = String((error as any)?.message ?? '')
  const code = String((error as any)?.code ?? '')

  // duplicate key -> schon verarbeitet
  if (code === '23505' || /duplicate key value/i.test(msg)) {
    return { ok: false as const, reason: 'duplicate_event' as const }
  }

  // wenn Tabelle nicht existiert o.ä. -> nicht blockieren, aber loggen
  console.error('[jobs webhook] processed_events insert failed:', error)
  return { ok: true as const }
}

async function markPaidFromPaymentIntent(pi: Stripe.PaymentIntent): Promise<MarkPaidResult> {
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
      charge_id: pi.latest_charge ? String(pi.latest_charge) : null,

      // post-paid defaults
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

/** Fallback-Reset, wenn Zahlung abgebrochen/failed und Frontend keinen unselect call schafft */
async function resetFromPaymentIntent(pi: Stripe.PaymentIntent, reason: 'canceled' | 'failed'): Promise<ResetResult> {
  if (s(pi.metadata?.kind) !== 'job') return { ignored: true, reason: 'not_job' }

  const jobId = s(pi.metadata?.jobId)
  const offerId = s(pi.metadata?.offerId)
  if (!jobId || !offerId) return { ignored: true, reason: 'missing_meta' }

  const admin = supabaseAdmin()
  const nowIso = new Date().toISOString()

  // Job nur resetten, wenn er wirklich noch im Bezahlzustand hängt
  // (nicht paid/released/refunded überschreiben!)
  const { data: job, error: jobErr } = await admin
    .from('jobs')
    .select('id, status, selected_offer_id')
    .eq('id', jobId)
    .maybeSingle()

  if (jobErr || !job) return { ignored: true, reason: 'job_not_found' }

  if (!['open', 'awaiting_payment'].includes(String(job.status))) {
    return { ignored: true, reason: 'job_not_resettable' }
  }
  if (s(job.selected_offer_id) !== offerId) {
    return { ignored: true, reason: 'selected_offer_mismatch' }
  }

  // Offer nur resetten, wenn nicht final
  const { data: offer, error: offerErr } = await admin
    .from('job_offers')
    .select('id, status')
    .eq('id', offerId)
    .eq('job_id', jobId)
    .maybeSingle()

  if (offerErr) throw offerErr

  if (offer?.status && ['paid', 'released', 'refunded'].includes(String(offer.status))) {
    return { ignored: true, reason: 'offer_already_final' }
  }

  // Reihenfolge: zuerst Offer auf open, dann Job freigeben (oder umgekehrt)
  // -> Ich mache zuerst Offer reset, damit "selected" sicher weg ist.
  await admin
    .from('job_offers')
    .update({
      status: 'open',
      payment_intent_id: null,
      updated_at: nowIso,
    })
    .eq('id', offerId)
    .eq('job_id', jobId)
    .in('status', ['selected', 'open'])

  await admin
    .from('jobs')
    .update({
      status: 'open',
      selected_offer_id: null,
      updated_at: nowIso,
    })
    .eq('id', jobId)
    .eq('selected_offer_id', offerId)
    .in('status', ['open', 'awaiting_payment'])

  return { reset: true }
}

export async function POST(req: Request) {
  try {
    if (!WEBHOOK_SECRET) {
      return jsonNoStore({ ok: false, error: 'missing_STRIPE_WEBHOOK_SECRET' }, 500)
    }

    const sig = req.headers.get('stripe-signature')
    if (!sig) return jsonNoStore({ ok: false, error: 'missing_signature' }, 400)

    // Stripe braucht RAW-Body
    const rawBody = await req.text()

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)
    } catch (e: any) {
      return jsonNoStore({ ok: false, error: 'invalid_signature', message: String(e?.message ?? e) }, 400)
    }

    // Idempotenz über event.id
    const gate = await ensureEventNotProcessed(String(event.id))
    if (!gate.ok) {
      return jsonNoStore({ ok: true, ignored: true, reason: gate.reason, type: event.type })
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const result = await markPaidFromPaymentIntent(pi)
      return jsonNoStore({ ok: true, type: event.type, result })
    }

    // Optional aber sehr hilfreich: serverseitiges Reset bei Abbruch/Fail
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

    // alle anderen Events: nichts ändern
    return jsonNoStore({ ok: true, ignored: true, type: event.type })
  } catch (e: any) {
    console.error('[POST /api/jobs/webhook] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
