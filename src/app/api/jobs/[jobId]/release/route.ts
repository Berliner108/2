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

/**
 * Modell B (Hold -> später Release):
 * - Beim Checkout wurde PaymentIntent erstellt (buyer zahlt)
 * - Funds bleiben auf Plattform (bzw. noch nicht an Connected Account transferiert)
 * - Beim Release machen wir:
 *   1) Transfer an Connected Account (vendor) = gross - platformFee
 *   2) Job/Offer payout_status = released, released_at setzen
 *
 * Voraussetzung:
 * - offer.status = 'paid'
 * - offer.payout_status = 'hold'
 * - offer has connected_account_id (oder seller_profile.stripe_account_id)
 */

export async function POST(
  req: Request,
  ctx: { params: Promise<{ jobId: string }> } // ✅ Next 15
) {
  try {
    const { jobId } = await ctx.params
    const jobIdStr = s(jobId)
    if (!jobIdStr) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth: nur Auftraggeber (Owner) darf Release auslösen
    const supabase = await supabaseServer()
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) return jsonNoStore({ ok: false, error: authErr.message }, 401)
    if (!auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // Job laden
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

    // Offer laden (inkl. vendor stripe account)
    // ✅ Wichtig: passe "connected_account_id" an deine Spalte/Join an:
    // - Option A: job_offers.connected_account_id
    // - Option B: via profiles.stripe_account_id des Bieters
    const { data: offer, error: offerErr } = await admin
      .from('job_offers')
      .select(
        [
          'id',
          'job_id',
          'owner_id',
          'bieter_id',
          'status',
          'payout_status',
          'paid_amount_cents',
          'refunded_amount_cents',
          'currency',
          'payment_intent_id',
          'transfer_id',
          'payout_released_at',
          // optional: falls du es direkt in offers speicherst:
          'connected_account_id',
        ].join(', ')
      )
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .maybeSingle()

    if (offerErr) return jsonNoStore({ ok: false, error: offerErr.message }, 500)
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    if (s(offer.owner_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    // Nur wenn hold
    if (s(offer.payout_status) !== 'hold') {
      return jsonNoStore(
        { ok: true, ignored: true, reason: 'payout_status_not_hold', payout_status: offer.payout_status },
        200
      )
    }

    // Nur wenn paid (nicht refunded / nicht released)
    if (s(offer.status) !== 'paid') {
      return jsonNoStore({ ok: false, error: 'offer_not_paid', status: offer.status }, 409)
    }

    const paid = Number(offer.paid_amount_cents ?? 0)
    const refunded = Number(offer.refunded_amount_cents ?? 0)
    const netGross = Math.max(0, paid - refunded) // falls partial refund: nur Rest releasen
    if (netGross <= 0) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'nothing_to_release', paid, refunded }, 200)
    }

    const currency = (s(offer.currency) || 'eur').toLowerCase()

    // Vendor connected account finden
    let connectedAccountId = s((offer as any).connected_account_id)

    if (!connectedAccountId) {
      // Fallback: aus profiles des bieter_id
      const { data: prof, error: profErr } = await admin
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', offer.bieter_id)
        .maybeSingle()

      if (profErr) return jsonNoStore({ ok: false, error: profErr.message }, 500)
      connectedAccountId = s((prof as any)?.stripe_account_id)
    }

    if (!connectedAccountId) {
      return jsonNoStore({ ok: false, error: 'vendor_not_onboarded_missing_stripe_account_id' }, 409)
    }

    // Platform Fee (bei dir 7% — brutto)
    // Wenn du es aus DB holen willst (z.B. settings table), kannst du hier ersetzen.
    const platformFeePercent = 0.07
    const platformFee = Math.max(0, Math.round(netGross * platformFeePercent))
    const vendorAmount = Math.max(0, netGross - platformFee)

    if (vendorAmount <= 0) {
      // Extremfall: nur fee übrig -> blockieren, sonst komisch
      return jsonNoStore({ ok: false, error: 'vendor_amount_zero', netGross, platformFee }, 409)
    }

    // ✅ Transfer an Connected Account
    // Hinweis: Das geht nur, wenn die Zahlung auf der Plattform gelandet ist (Destination/Separate Charges korrekt).
    const transfer = await stripe.transfers.create({
      amount: vendorAmount,
      currency,
      destination: connectedAccountId,
      metadata: {
        kind: 'job',
        jobId: jobIdStr,
        offerId: offerId,
        paid_amount_cents: String(paid),
        refunded_amount_cents: String(refunded),
        net_gross_cents: String(netGross),
        platform_fee_cents: String(platformFee),
      },
    })

    // DB updaten: Offer + Job
    const { error: updOfferErr } = await admin
      .from('job_offers')
      .update({
        payout_status: 'released',
        payout_released_at: nowIso,
        transfer_id: transfer.id,
        updated_at: nowIso,
      })
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .eq('payout_status', 'hold') // idempotenz
      .eq('status', 'paid')

    if (updOfferErr) {
      console.error('[release] DB update failed after transfer:', updOfferErr)
      return jsonNoStore(
        { ok: false, error: 'db_update_failed_after_transfer', transfer_id: transfer.id, message: updOfferErr.message },
        500
      )
    }

    // Job-Status optional mitschreiben (z.B. released_at)
    await admin
      .from('jobs')
      .update({ status: 'closed', released_at: nowIso, updated_at: nowIso })
      .eq('id', jobIdStr)
      .eq('selected_offer_id', offerId)

    return jsonNoStore({
      ok: true,
      jobId: jobIdStr,
      offerId,
      transfer: { id: transfer.id, amount: transfer.amount, currency: transfer.currency, destination: transfer.destination },
      amounts: { paid, refunded, net_gross_cents: netGross, platform_fee_cents: platformFee, vendor_amount_cents: vendorAmount },
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/[jobId]/release] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
