// src/app/api/jobs/[jobId]/refund/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

type Body = {
  amount_cents?: number
  reason?: string
}

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n)
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> } // ✅ Next 15: params ist Promise
) {
  try {
    const { jobId } = await ctx.params
    const jobIdStr = s(jobId)
    if (!jobIdStr) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth: nur Auftraggeber (Owner) darf refund auslösen
    const supabase = await supabaseServer()
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) return jsonNoStore({ ok: false, error: authErr.message }, 401)
    if (!auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as Body
    const amountReq = body?.amount_cents
    const reason = s(body?.reason).slice(0, 200)

    const admin = supabaseAdmin()

    // Job laden (Owner + selected_offer_id)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, owner_id, selected_offer_id, status')
      .eq('id', jobIdStr)
      .maybeSingle()

    if (jobErr) return jsonNoStore({ ok: false, error: jobErr.message }, 500)
    if (!job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)

    if (s(job.owner_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    const offerId = s(job.selected_offer_id)
    if (!offerId) return jsonNoStore({ ok: false, error: 'no_selected_offer' }, 409)

    // Offer laden (Payment/Refund-relevante Felder)
    const { data: offer, error: offerErr } = await admin
      .from('job_offers')
      .select(
        'id, job_id, owner_id, status, payout_status, paid_amount_cents, refunded_amount_cents, currency, payment_intent_id, charge_id'
      )
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .maybeSingle()

    if (offerErr) return jsonNoStore({ ok: false, error: offerErr.message }, 500)
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    // Sicherheitscheck: Owner passt
    if (s(offer.owner_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    // Refund nur solange Hold
    if (s(offer.payout_status) !== 'hold') {
      return jsonNoStore(
        { ok: false, error: 'refund_not_allowed', detail: 'payout_status_must_be_hold' },
        409
      )
    }

    // Muss bezahlt sein
    const offerStatus = s(offer.status)
    if (!['paid', 'released', 'refunded'].includes(offerStatus)) {
      return jsonNoStore({ ok: false, error: 'offer_not_paid' }, 409)
    }
    // Wenn released schon passiert ist -> du willst laut Regel NICHT mehr refunden
    if (offerStatus === 'released') {
      return jsonNoStore({ ok: false, error: 'refund_not_allowed', detail: 'already_released' }, 409)
    }

    const paidAmount = Number(offer.paid_amount_cents ?? 0)
    const refundedSoFar = Number(offer.refunded_amount_cents ?? 0)
    const remaining = Math.max(0, paidAmount - refundedSoFar)

    if (!paidAmount || remaining <= 0) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'nothing_to_refund' }, 200)
    }

    // amount bestimmen (optional partial)
    let amountToRefund = remaining
    if (amountReq !== undefined) {
      if (!isInt(amountReq) || amountReq <= 0) {
        return jsonNoStore({ ok: false, error: 'invalid_amount_cents' }, 400)
      }
      if (amountReq > remaining) {
        return jsonNoStore(
          { ok: false, error: 'amount_too_high', remaining_cents: remaining },
          400
        )
      }
      amountToRefund = amountReq
    }

    const paymentIntentId = s(offer.payment_intent_id)
    if (!paymentIntentId) {
      return jsonNoStore({ ok: false, error: 'missing_payment_intent_id' }, 409)
    }

    // ✅ Refund auf ursprüngliche Zahlungsmethode des Käufers
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountToRefund, // full oder partial
      reason: reason ? 'requested_by_customer' : undefined, // Stripe reason ist enum; Text packen wir in metadata
      metadata: {
        kind: 'job',
        jobId: jobIdStr,
        offerId: offerId,
        note: reason || '',
      },
    })

    const nowIso = new Date().toISOString()
    const newRefundedTotal = refundedSoFar + amountToRefund
    const isFull = newRefundedTotal >= paidAmount

    // DB Update Offer
    const { error: updErr } = await admin
      .from('job_offers')
      .update({
        refunded_amount_cents: newRefundedTotal,
        refunded_at: isFull ? nowIso : null,
        // status nur bei Full auf refunded, partial bleibt paid
        status: isFull ? 'refunded' : 'paid',
        // payout bleibt hold oder wird refunded (deine Entscheidung) -> ich setze bei Full auf refunded
        payout_status: isFull ? 'refunded' : 'hold',
        updated_at: nowIso,
      })
      .eq('id', offerId)
      .eq('job_id', jobIdStr)

    if (updErr) {
      // Refund ist schon erstellt -> DB Fehler unbedingt sichtbar machen
      console.error('[refund] DB update failed after Stripe refund:', updErr)
      return jsonNoStore(
        { ok: false, error: 'db_update_failed_after_refund', refund_id: refund.id, message: updErr.message },
        500
      )
    }

    // Optional: Job Status bei Full Refund
    if (isFull) {
      await admin
        .from('jobs')
        .update({ status: 'refunded', updated_at: nowIso })
        .eq('id', jobIdStr)
        .eq('selected_offer_id', offerId)
    }

    return jsonNoStore({
      ok: true,
      jobId: jobIdStr,
      offerId,
      refund: {
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
      },
      totals: {
        paid_amount_cents: paidAmount,
        refunded_amount_cents: newRefundedTotal,
        remaining_cents: Math.max(0, paidAmount - newRefundedTotal),
        full: isFull,
      },
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/[jobId]/refund] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
