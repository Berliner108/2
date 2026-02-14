// src/app/api/konto/auftraege/confirm-delivered/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const CURRENCY = 'eur'
const PLATFORM_FEE_PCT = 0.07

type Body = {
  jobId?: string
  offerId?: string
}

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser()

    if (authErr || !user) return json({ ok: false, error: 'unauthenticated' }, 401)

    const body = (await req.json().catch(() => ({}))) as Body
    const jobId = s(body.jobId)
    const offerId = s(body.offerId)

    if (!jobId && !offerId) return json({ ok: false, error: 'missing_jobId_or_offerId' }, 400)

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // 1) Offer finden (nur der Auftraggeber darf bestätigen)
    let q = admin
      .from('job_offers')
      .select(
        `
        id,
        job_id,
        owner_id,
        bieter_id,
        status,
        fulfillment_status,
        delivered_reported_at,
        delivered_confirmed_at,
        dispute_opened_at,
        dispute_reason,
        payout_status,
        payout_transfer_id,
        payout_released_at,
        refunded_amount_cents,
        paid_amount_cents,
        charge_id
      `
      )
      .eq('status', 'paid')
      .eq('owner_id', user.id)
      .limit(1)

    if (offerId) q = q.eq('id', offerId)
    else q = q.eq('job_id', jobId)

    const { data: row, error: selErr } = await q.maybeSingle()

    if (selErr) {
      console.error('[confirm-delivered] select:', selErr)
      return json({ ok: false, error: 'db_select' }, 500)
    }
    if (!row) return json({ ok: false, error: 'not_found' }, 404)

    const offerIdDb = String((row as any).id)
    const jobIdDb = String((row as any).job_id)
    const bieterId = String((row as any).bieter_id)

    const fulfillment = String((row as any).fulfillment_status ?? 'in_progress')

    // 2) Reihenfolge absichern
    if (fulfillment === 'in_progress') return json({ ok: false, error: 'not_reported_yet' }, 409)
    if (fulfillment === 'disputed') return json({ ok: false, error: 'in_dispute' }, 409)

    // 3) Wenn schon confirmed -> idempotent: ggf. payout nachziehen
    if (fulfillment === 'confirmed') {
      const payout = await tryTransferNow({
        admin,
        offerId: offerIdDb,
        jobId: jobIdDb,
        bieterId,
        chargeId: String((row as any).charge_id || ''),
        paidAmountCents: Number((row as any).paid_amount_cents ?? 0),
        refundedAmountCents: Number((row as any).refunded_amount_cents ?? 0),
      })

      return json({
        ok: true,
        changed: false,
        payout,
        offer: {
          id: offerIdDb,
          job_id: jobIdDb,
          fulfillment_status: 'confirmed',
          delivered_confirmed_at: (row as any).delivered_confirmed_at ?? null,
          payout_status: (row as any).payout_status ?? 'hold',
          payout_transfer_id: (row as any).payout_transfer_id ?? null,
        },
      })
    }

    // 4) Update: reported -> confirmed
    const { data: upd, error: updErr } = await admin
      .from('job_offers')
      .update({
        fulfillment_status: 'confirmed',
        delivered_confirmed_at: nowIso,
      })
      .eq('id', offerIdDb)
      .eq('status', 'paid')
      .eq('owner_id', user.id)
      .select(
        `
        id,
        job_id,
        bieter_id,
        fulfillment_status,
        delivered_confirmed_at,
        payout_status,
        payout_transfer_id,
        refunded_amount_cents,
        paid_amount_cents,
        charge_id
      `
      )
      .single()

    if (updErr) {
      console.error('[confirm-delivered] update:', updErr)
      return json({ ok: false, error: 'db_update' }, 500)
    }

    // 5) Auszahlung/Transfer JETZT (hold -> transferred)
    const payout = await tryTransferNow({
      admin,
      offerId: String((upd as any).id),
      jobId: String((upd as any).job_id),
      bieterId: String((upd as any).bieter_id),
      chargeId: String((upd as any).charge_id || ''),
      paidAmountCents: Number((upd as any).paid_amount_cents ?? 0),
      refundedAmountCents: Number((upd as any).refunded_amount_cents ?? 0),
    })

    return json({
      ok: true,
      changed: true,
      payout,
      offer: {
        id: String((upd as any).id),
        job_id: String((upd as any).job_id),
        fulfillment_status: String((upd as any).fulfillment_status),
        delivered_confirmed_at: (upd as any).delivered_confirmed_at ?? null,
        payout_status: String((upd as any).payout_status ?? 'hold'),
        payout_transfer_id: (upd as any).payout_transfer_id ?? null,
        refunded_amount_cents: Number((upd as any).refunded_amount_cents ?? 0),
        paid_amount_cents: (upd as any).paid_amount_cents == null ? null : Number((upd as any).paid_amount_cents),
      },
    })
  } catch (e) {
    console.error('[confirm-delivered] fatal:', e)
    return json({ ok: false, error: 'fatal' }, 500)
  }
}

async function tryTransferNow(args: {
  admin: any
  offerId: string
  jobId: string
  bieterId: string
  chargeId: string
  paidAmountCents: number
  refundedAmountCents: number
}): Promise<
  | { ok: true; transferId: string; amountCents: number }
  | {
      ok: false
      error:
        | 'already_transferred'
        | 'not_on_hold'
        | 'missing_charge_id'
        | 'bieter_not_connected'
        | 'zero_amount'
        | 'stripe_transfer_failed'
        | 'db_payout_update_failed'
    }
> {
  const { admin, offerId, jobId, bieterId, chargeId, paidAmountCents, refundedAmountCents } = args

  // Frischen DB-Status holen (idempotent & sauber)
  const { data: offerNow, error: oErr } = await admin
    .from('job_offers')
    .select('payout_status, payout_transfer_id')
    .eq('id', offerId)
    .single()

  if (oErr) {
    console.error('[confirm-delivered] offer recheck failed:', oErr)
    return { ok: false, error: 'db_payout_update_failed' }
  }

  if (s(offerNow?.payout_transfer_id)) return { ok: false, error: 'already_transferred' }
  if (String(offerNow?.payout_status ?? 'hold') !== 'hold') return { ok: false, error: 'not_on_hold' }

  if (!chargeId) return { ok: false, error: 'missing_charge_id' }

  // Bieter -> Connected Account
  const { data: prof, error: pErr } = await admin
    .from('profiles')
    .select('stripe_account_id, connect_ready, payouts_enabled')
    .eq('id', bieterId)
    .single()

  if (pErr || !prof?.stripe_account_id) return { ok: false, error: 'bieter_not_connected' }
  if (!prof.connect_ready || !prof.payouts_enabled) return { ok: false, error: 'bieter_not_connected' }

  // Betrag: paid - refunded - fee(7%)
  const paid = Number(paidAmountCents ?? 0)
  const refunded = Number(refundedAmountCents ?? 0)
  const fee = Math.round(paid * PLATFORM_FEE_PCT)
  const vendorAmount = Math.max(0, paid - refunded - fee)

  if (vendorAmount <= 0) return { ok: false, error: 'zero_amount' }

  // Transfer (mit Idempotency-Key)
  let tr: Stripe.Response<Stripe.Transfer>
  try {
    tr = await stripe.transfers.create(
      {
        amount: vendorAmount,
        currency: CURRENCY,
        destination: String(prof.stripe_account_id),
        source_transaction: chargeId,
        transfer_group: `job_${jobId}`,
        metadata: { kind: 'job', jobId, offerId },
      },
      { idempotencyKey: `job_${jobId}_offer_${offerId}_release` }
    )
  } catch (e) {
    console.error('[confirm-delivered] transfers.create failed:', e)
    return { ok: false, error: 'stripe_transfer_failed' }
  }

  // DB markieren (nur wenn noch null -> idempotent)
  const { error: updErr } = await admin
    .from('job_offers')
    .update({
      payout_status: 'transferred',
      payout_transfer_id: tr.id,
      payout_released_at: new Date().toISOString(),
    })
    .eq('id', offerId)
    .is('payout_transfer_id', null)

  if (updErr) {
    console.error('[confirm-delivered] payout DB update failed:', updErr)
    return { ok: false, error: 'db_payout_update_failed' }
  }

  return { ok: true, transferId: tr.id, amountCents: vendorAmount }
}
