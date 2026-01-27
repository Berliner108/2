// src/app/api/jobs/[jobId]/refund/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type Body = {
  amount_cents?: number
  reason?: string
}

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n)
}

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

async function getChargeIdFromPaymentIntent(piId: string) {
  const pi = await stripe.paymentIntents.retrieve(piId, {
    expand: ['latest_charge', 'charges.data.balance_transaction'],
  })

  // Prefer expanded latest_charge
  const latest = pi.latest_charge as any
  if (latest && typeof latest === 'object' && latest.id) return { pi, chargeId: String(latest.id) }

  // Fallback: charges array (if present)
  const charges = (pi as any)?.charges?.data
  if (Array.isArray(charges) && charges[0]?.id) return { pi, chargeId: String(charges[0].id) }

  return { pi, chargeId: '' }
}

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await params
    const jobId = s(jobIdRaw)
    if (!jobId) return jsonNoStore({ ok: false, error: 'missing_job_id' }, 400)

    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user
    if (authErr || !user) return jsonNoStore({ ok: false, error: 'unauthenticated' }, 401)

    const raw = (await req.json().catch(() => ({}))) as Body
    const reason = s(raw?.reason)

    if (raw?.amount_cents !== undefined && !isInt(raw.amount_cents)) {
      return jsonNoStore({ ok: false, error: 'invalid_amount_format' }, 400)
    }
    if (raw?.amount_cents !== undefined && raw.amount_cents < 0) {
      return jsonNoStore({ ok: false, error: 'amount_negative' }, 400)
    }

    const admin = supabaseAdmin()

    // 1) Job laden (Owner-only)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)

    const ownerId = String(job.user_id)
    if (ownerId !== user.id) return jsonNoStore({ ok: false, error: 'forbidden_not_owner' }, 403)

    const offerId = s(job.selected_offer_id)
    if (!offerId) return jsonNoStore({ ok: false, error: 'no_selected_offer' }, 409)

    // 2) Offer laden: muss paid sein
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, status, payment_intent_id, paid_amount_cents, refunded_amount_cents, charge_id, currency')
      .eq('id', offerId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (offErr || !offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)
    if (String(offer.status) !== 'paid') return jsonNoStore({ ok: false, error: 'offer_not_paid' }, 409)

    const piId = s(offer.payment_intent_id)
    if (!piId) return jsonNoStore({ ok: false, error: 'missing_payment_intent' }, 409)

    const paid = Number(offer.paid_amount_cents ?? 0)
    const alreadyRefunded = Number(offer.refunded_amount_cents ?? 0)

    if (!Number.isFinite(paid) || paid <= 0) {
      return jsonNoStore({ ok: false, error: 'offer_missing_paid_amount' }, 409)
    }

    const remaining = paid - alreadyRefunded
    if (remaining <= 0) {
      return jsonNoStore({ ok: false, error: 'nothing_to_refund' }, 409)
    }

    const requested = raw.amount_cents === undefined ? remaining : raw.amount_cents
    if (requested <= 0) return jsonNoStore({ ok: false, error: 'amount_zero' }, 400)

    const amount = Math.min(requested, remaining)

    // 3) Charge holen (für Refund)
    let chargeId = s(offer.charge_id)
    let currency = s(offer.currency) || 'eur'

    if (!chargeId) {
      const { pi, chargeId: cId } = await getChargeIdFromPaymentIntent(piId)
      chargeId = s(cId)
      currency = (s((pi as any).currency) || currency).toLowerCase()
      if (!chargeId) return jsonNoStore({ ok: false, error: 'charge_not_found' }, 409)

      // Charge-ID speichern (hilft später)
      await admin.from('job_offers').update({ charge_id: chargeId, currency }).eq('id', offerId)
    }

    // 4) Stripe Refund erstellen (idempotent key!)
    // idempotency_key: jobId+offerId+amount+remaining+timestamp wäre schlecht.
    // Wir nehmen: jobId + offerId + amount + (alreadyRefunded) => wenn gleicher request wiederkommt, bleibt es stabil.
    const idemKey = `jobrefund:${jobId}:${offerId}:${amount}:${alreadyRefunded}`

    const refund = await stripe.refunds.create(
      {
        charge: chargeId,
        amount,
        reason: 'requested_by_customer', // Stripe enum; "reason" text speichern wir in DB
        metadata: {
          kind: 'job_refund',
          jobId: String(jobId),
          offerId: String(offerId),
          note: reason ? reason.slice(0, 200) : '',
        },
      },
      { idempotencyKey: idemKey }
    )

    // 5) DB updaten
    // 5a) Refund-Log (wenn Tabelle existiert)
    try {
      await admin.from('job_refunds').insert({
        job_id: jobId,
        offer_id: offerId,
        stripe_refund_id: refund.id,
        amount_cents: amount,
        reason: reason || null,
      })
    } catch (e) {
      // falls Tabelle nicht existiert oder RLS/Schema: nicht hart failen
      console.warn('[refund] job_refunds insert skipped:', e)
    }

    // 5b) offer refunded_amount_cents hochzählen
    const newRefunded = alreadyRefunded + amount

    const { error: updOfferErr } = await admin
      .from('job_offers')
      .update({ refunded_amount_cents: newRefunded })
      .eq('id', offerId)
      .eq('job_id', jobId)

    if (updOfferErr) throw updOfferErr

    // 5c) Job-Status setzen (partial/full)
    const nextStatus = newRefunded >= paid ? 'refunded_full' : 'refunded_partial'
    await admin.from('jobs').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('id', jobId)

    return jsonNoStore({
      ok: true,
      jobId,
      offerId,
      stripe_refund_id: refund.id,
      amount_cents: amount,
      refunded_total_cents: newRefunded,
      paid_amount_cents: paid,
      status: nextStatus,
      currency,
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/:jobId/refund] fatal:', e)
    // Stripe errors sind hilfreich:
    const msg = String(e?.message ?? e)
    return jsonNoStore({ ok: false, error: 'fatal', message: msg }, 500)
  }
}
