// src/app/api/jobs/[jobId]/refund/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type Body = {
  amount_cents?: number // optional: partial refund
  reason?: string
}

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n)
}

function safeNum(v: any): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: Request, ctx: { params: { jobId: string } }) {
  try {
    const jobId = s(ctx?.params?.jobId)
    if (!jobId) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth (User muss eingeloggt sein)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { getAll: () => cookieStore.getAll(), setAll() {} },
      }
    )

    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)
    const uid = auth.user.id

    const body = (await req.json().catch(() => ({}))) as Body
    const reason = s(body.reason).slice(0, 800)

    const admin = supabaseAdmin()

    // Job laden + prüfen: nur Auftraggeber darf refund auslösen
    const { data: job, error: jErr } = await admin
      .from('jobs')
      .select('id, user_id, selected_offer_id, status')
      .eq('id', jobId)
      .maybeSingle()

    if (jErr) throw jErr
    if (!job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)
    if (String(job.user_id) !== uid) return jsonNoStore({ ok: false, error: 'forbidden' }, 403)

    const offerId = s(job.selected_offer_id)
    if (!offerId) return jsonNoStore({ ok: false, error: 'no_selected_offer' }, 400)

    // Offer laden
    const { data: offer, error: oErr } = await admin
      .from('job_offers')
      .select(
        `
        id, job_id, status,
        payout_status,
        paid_amount_cents, refunded_amount_cents,
        currency, payment_intent_id, charge_id,
        fulfillment_status, dispute_opened_at, dispute_reason
      `
      )
      .eq('id', offerId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (oErr) throw oErr
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    // ✅ harte Regel: Refund nur bei payout_status=hold
    if (String(offer.payout_status ?? 'hold') !== 'hold') {
      return jsonNoStore({ ok: false, error: 'refund_not_allowed_after_release' }, 409)
    }

    // Zahlung muss paid sein
    if (String(offer.status) !== 'paid') {
      return jsonNoStore({ ok: false, error: 'offer_not_paid' }, 409)
    }

    const paid = safeNum(offer.paid_amount_cents)
    const alreadyRefunded = safeNum(offer.refunded_amount_cents)
    const maxRefund = Math.max(0, paid - alreadyRefunded)

    if (maxRefund <= 0) {
      return jsonNoStore({ ok: false, error: 'nothing_to_refund' }, 409)
    }

    // Betrag bestimmen (default: full remaining)
    let amount = maxRefund
    if (isInt(body.amount_cents)) {
      amount = body.amount_cents
      if (amount <= 0) return jsonNoStore({ ok: false, error: 'amount_invalid' }, 400)
      if (amount > maxRefund) return jsonNoStore({ ok: false, error: 'amount_exceeds_remaining' }, 400)
    }

    const paymentIntentId = s(offer.payment_intent_id)
    const chargeId = s(offer.charge_id)
    if (!paymentIntentId && !chargeId) {
      return jsonNoStore({ ok: false, error: 'missing_payment_refs' }, 500)
    }

    // Optional: “Dispute/Problem” markieren (nur DB, kein Stripe-Dispute!)
    // -> hilfreich, damit UI den Fall als “In Klärung” zeigt.
    const nowIso = new Date().toISOString()
    if (!offer.dispute_opened_at) {
      await admin
        .from('job_offers')
        .update({
          dispute_opened_at: nowIso,
          dispute_reason: reason || null,
          fulfillment_status: 'disputed',
        })
        .eq('id', offerId)
        .eq('job_id', jobId)
    }

    // Stripe Refund erstellen (geht automatisch auf die Payment-Methode des Käufers zurück ✅)
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId || undefined,
      charge: !paymentIntentId && chargeId ? chargeId : undefined,
      amount,
      reason: 'requested_by_customer',
      metadata: {
        kind: 'job',
        jobId,
        offerId,
      },
    })

    // DB-Finalstatus NICHT hier “hart” setzen -> dafür ist der Webhook da (refund.created/updated/failed)
    // Hier nur ok zurückgeben.
    return jsonNoStore(
      {
        ok: true,
        jobId,
        offerId,
        refund: { id: refund.id, amount: refund.amount, status: refund.status },
      },
      200
    )
  } catch (e: any) {
    console.error('[POST /api/jobs/[jobId]/refund] error:', e)
    return jsonNoStore({ ok: false, error: 'refund_failed', message: String(e?.message ?? e) }, 500)
  }
}
