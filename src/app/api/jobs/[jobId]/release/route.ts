// src/app/api/jobs/[jobId]/release/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

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

    // Auth: Kunde ODER Auftragnehmer (ab 28d nach rueck_datum_utc)
    const supabase = await supabaseServer()
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) return jsonNoStore({ ok: false, error: authErr.message }, 401)
    if (!auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)

    const admin = supabaseAdmin()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Job laden
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, selected_offer_id, rueck_datum_utc, released_at, refunded_at, status')
      .eq('id', jobIdStr)
      .maybeSingle()

    if (jobErr) return jsonNoStore({ ok: false, error: jobErr.message }, 500)
    if (!job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)

    // Final schon passiert? (Job)
    if ((job as any).released_at || (job as any).refunded_at) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'job_already_final' }, 200)
    }

    const offerId = s((job as any).selected_offer_id)
    if (!offerId) return jsonNoStore({ ok: false, error: 'no_selected_offer' }, 409)

    // Offer laden
    const { data: offer, error: offerErr } = await admin
      .from('job_offers')
      .select(
        'id, job_id, owner_id, bieter_id, status, payout_status, paid_amount_cents, gesamt_cents, refunded_amount_cents, currency, payout_transfer_id'
      )
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .maybeSingle()

    if (offerErr) return jsonNoStore({ ok: false, error: offerErr.message }, 500)
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    const userId = s(auth.user.id)
    const ownerId = s((offer as any).owner_id) // Kunde
    const bieterId = s((offer as any).bieter_id) // Auftragnehmer

    const isCustomer = userId === ownerId
    const isVendor = userId === bieterId
    if (!isCustomer && !isVendor) return jsonNoStore({ ok: false, error: 'forbidden' }, 403)

    // Final schon passiert? (Offer)
    const offerPayout = s((offer as any).payout_status)
    if (offerPayout !== 'hold') {
      return jsonNoStore(
        { ok: true, ignored: true, reason: 'payout_status_not_hold', payout_status: (offer as any).payout_status },
        200
      )
    }
    if (s((offer as any).payout_transfer_id)) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'already_has_transfer' }, 200)
    }

    // Nur wenn paid
    if (s((offer as any).status) !== 'paid') {
      return jsonNoStore({ ok: false, error: 'offer_not_paid', status: (offer as any).status }, 409)
    }

    // 28-Tage-Regel
    const rd = new Date(String((job as any).rueck_datum_utc))
    const unlockAt = isNaN(+rd) ? null : +rd + DAYS_28_MS

    if (unlockAt !== null) {
      if (isCustomer && now > unlockAt) {
        return jsonNoStore(
          { ok: false, error: 'customer_locked_after_28d', unlockAt: new Date(unlockAt).toISOString() },
          403
        )
      }
      if (isVendor && now < unlockAt) {
        return jsonNoStore(
          { ok: false, error: 'vendor_too_early', unlockAt: new Date(unlockAt).toISOString() },
          403
        )
      }
    } else {
      // wenn rueck_datum_utc kaputt ist: Vendor nicht erlauben
      if (isVendor) return jsonNoStore({ ok: false, error: 'invalid_rueck_datum_utc' }, 409)
    }

    // Beträge (netto = paid - refunded)
    const paid = Number((offer as any).paid_amount_cents ?? (offer as any).gesamt_cents ?? 0)
    const refunded = Number((offer as any).refunded_amount_cents ?? 0)
    const netGross = Math.max(0, paid - refunded)

    if (!paid || netGross <= 0) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'nothing_to_release', paid, refunded }, 200)
    }

    const currency = (s((offer as any).currency) || 'eur').toLowerCase()

    // Vendor Stripe Account aus profiles
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('stripe_account_id, payouts_enabled, connect_ready')
      .eq('id', bieterId)
      .maybeSingle()

    if (profErr) return jsonNoStore({ ok: false, error: profErr.message }, 500)

    const connectedAccountId = s((prof as any)?.stripe_account_id)
    if (!connectedAccountId) return jsonNoStore({ ok: false, error: 'vendor_missing_stripe_account_id' }, 409)
    if ((prof as any)?.connect_ready === false || (prof as any)?.payouts_enabled === false) {
      return jsonNoStore({ ok: false, error: 'vendor_not_ready_for_payouts' }, 409)
    }

    // 7% Fee bleibt bei dir
    const platformFee = Math.max(0, Math.round(netGross * 0.07))
    const vendorAmount = Math.max(0, netGross - platformFee)
    if (vendorAmount <= 0) {
      return jsonNoStore({ ok: false, error: 'vendor_amount_zero', netGross, platformFee }, 409)
    }

    // Idempotency-Key verhindert Doppel-Transfer bei Race
    const idempotencyKey = `job_release_${offerId}_${vendorAmount}`

    const transfer = await stripe.transfers.create(
      {
        amount: vendorAmount,
        currency,
        destination: connectedAccountId,
        metadata: {
          kind: 'job',
          jobId: jobIdStr,
          offerId,
          by: isCustomer ? 'customer' : 'vendor',
          net_gross_cents: String(netGross),
          platform_fee_cents: String(platformFee),
          vendor_amount_cents: String(vendorAmount),
        },
      },
      { idempotencyKey }
    )

    // DB: Offer released (FELDNAME FIX: payout_transfer_id)
    const { error: updOfferErr } = await admin
      .from('job_offers')
      .update({
        payout_status: 'released',
        payout_released_at: nowIso,
        payout_transfer_id: transfer.id,
      } as any)
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .eq('payout_status', 'hold')
      .eq('status', 'paid')
      .is('payout_transfer_id', null)

    if (updOfferErr) {
      console.error('[release] DB update failed after transfer:', updOfferErr)
      return jsonNoStore(
        { ok: false, error: 'db_update_failed_after_transfer', payout_transfer_id: transfer.id, message: updOfferErr.message },
        500
      )
    }

    // Job final markieren (Status bei dir: closed)
    await admin
      .from('jobs')
      .update({ status: 'closed', released_at: nowIso, updated_at: nowIso, published: false } as any)
      .eq('id', jobIdStr)
      .eq('selected_offer_id', offerId)

    return jsonNoStore({
      ok: true,
      jobId: jobIdStr,
      offerId,
      by: isCustomer ? 'customer' : 'vendor',
      unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
      transfer: { id: transfer.id, amount: transfer.amount, currency: transfer.currency, destination: transfer.destination },
      amounts: {
        paid,
        refunded,
        net_gross_cents: netGross,
        platform_fee_cents: platformFee,
        vendor_amount_cents: vendorAmount,
      },
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/[jobId]/release] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
