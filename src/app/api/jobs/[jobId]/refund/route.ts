// src/app/api/jobs/[jobId]/refund/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

type Body = { reason?: string }

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await ctx.params
    const jobIdStr = s(jobId)
    if (!jobIdStr) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth: nur Kunde (jobs.user_id) darf refund
    const supabase = await supabaseServer()
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) return jsonNoStore({ ok: false, error: authErr.message }, 401)
    if (!auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)

    const body = (await req.json().catch(() => ({}))) as Body
    const note = s(body?.reason).slice(0, 200)

    const admin = supabaseAdmin()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Job laden (Kunde=user_id) + 28d Lock nach rueck_datum_utc
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, selected_offer_id, rueck_datum_utc, released_at, refunded_at')
      .eq('id', jobIdStr)
      .maybeSingle()

    if (jobErr) return jsonNoStore({ ok: false, error: jobErr.message }, 500)
    if (!job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)

    if (s((job as any).user_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    // Buttons nach 28 Tagen sperren (dein Race-Fix)
    const rd = new Date(String((job as any).rueck_datum_utc))
    const lockAt = isNaN(+rd) ? null : +rd + DAYS_28_MS
    if (lockAt !== null && now > lockAt) {
      return jsonNoStore(
        { ok: false, error: 'customer_locked_after_28d', lockAt: new Date(lockAt).toISOString() },
        403
      )
    }

    // Wenn schon released oder refunded: fertig
    if ((job as any).released_at) {
      return jsonNoStore({ ok: false, error: 'refund_not_allowed', detail: 'already_released' }, 409)
    }
    if ((job as any).refunded_at) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'already_refunded_full' }, 200)
    }

    const offerId = s((job as any).selected_offer_id)
    if (!offerId) return jsonNoStore({ ok: false, error: 'no_selected_offer' }, 409)

    // Offer laden
    const { data: offer, error: offerErr } = await admin
      .from('job_offers')
      .select(
        'id, job_id, owner_id, status, payout_status, paid_amount_cents, gesamt_cents, refunded_amount_cents, currency, payment_intent_id, payout_transfer_id'
      )
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .maybeSingle()

    if (offerErr) return jsonNoStore({ ok: false, error: offerErr.message }, 500)
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    // Owner passt? (bei dir = Kunde)
    if (s((offer as any).owner_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    // Refund nur solange HOLD und kein Transfer
    if (s((offer as any).payout_status) !== 'hold') {
      return jsonNoStore({ ok: false, error: 'refund_not_allowed', detail: 'payout_status_must_be_hold' }, 409)
    }
    if (s((offer as any).payout_transfer_id)) {
      return jsonNoStore({ ok: false, error: 'refund_not_allowed', detail: 'transfer_exists' }, 409)
    }

    // Muss paid sein
    if (s((offer as any).status) !== 'paid') {
      return jsonNoStore({ ok: false, error: 'offer_not_paid' }, 409)
    }

    const paidAmount = Number((offer as any).paid_amount_cents ?? (offer as any).gesamt_cents ?? 0)
    const refundedSoFar = Number((offer as any).refunded_amount_cents ?? 0)
    const remaining = Math.max(0, paidAmount - refundedSoFar)

    // Ohne Partial: wenn schon irgendwas refunded wurde => blocken
    if (refundedSoFar > 0) {
      return jsonNoStore({ ok: false, error: 'partial_refund_not_supported' }, 409)
    }

    if (!paidAmount || remaining <= 0) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'nothing_to_refund' }, 200)
    }

    const paymentIntentId = s((offer as any).payment_intent_id)
    if (!paymentIntentId) return jsonNoStore({ ok: false, error: 'missing_payment_intent_id' }, 409)

    // ✅ Stripe Full Refund (Restbetrag) auf ursprüngliche Zahlungsmethode
    const idem = `job_refund_full_${offerId}_${paidAmount}`

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: remaining, // full (weil refundedSoFar=0)
        reason: 'requested_by_customer',
        metadata: { kind: 'job', jobId: jobIdStr, offerId, note: note || '' },
      },
      { idempotencyKey: idem }
    )

    // DB: Offer (status bleibt 'paid' wegen Constraint), payout_status='refunded'
    const { error: updOfferErr } = await admin
      .from('job_offers')
      .update({
        refunded_amount_cents: paidAmount,
        refunded_at: nowIso,
        payout_status: 'refunded',
        updated_at: nowIso,
      } as any)
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .eq('payout_status', 'hold')
      .eq('status', 'paid')
      .eq('refunded_amount_cents', 0)

    if (updOfferErr) {
      console.error('[refund] DB update failed after Stripe refund:', updOfferErr)
      return jsonNoStore(
        { ok: false, error: 'db_update_failed_after_refund', refund_id: refund.id, message: updOfferErr.message },
        500
      )
    }

    // DB: Job (nur full)
    await admin
      .from('jobs')
      .update({
        status: 'refunded_full',
        refunded_at: nowIso,
        updated_at: nowIso,
        published: false,
      } as any)
      .eq('id', jobIdStr)
      .eq('selected_offer_id', offerId)

    return jsonNoStore({
      ok: true,
      jobId: jobIdStr,
      offerId,
      refund: { id: refund.id, status: refund.status, amount: refund.amount, currency: refund.currency },
      totals: { paid_amount_cents: paidAmount, refunded_amount_cents: paidAmount, remaining_cents: 0, full: true },
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/[jobId]/refund] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
