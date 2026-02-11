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

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await ctx.params
    const jobIdStr = s(jobId)
    if (!jobIdStr) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth: nur Auftraggeber darf Release auslösen
    const supabase = await supabaseServer()
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr) return jsonNoStore({ ok: false, error: authErr.message }, 401)
    if (!auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // Jobs-Tabelle: bei dir ist der Auftraggeber "user_id" (nicht owner_id)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('*')
      .eq('id', jobIdStr)
      .maybeSingle()

    if (jobErr) return jsonNoStore({ ok: false, error: jobErr.message }, 500)
    if (!job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)

    if (s((job as any).user_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    const offerId = s((job as any).selected_offer_id)
    if (!offerId) return jsonNoStore({ ok: false, error: 'no_selected_offer' }, 409)

    // Offer laden (select('*') => kein GenericStringError)
    const { data: offer, error: offerErr } = await admin
      .from('job_offers')
      .select('*')
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .maybeSingle()

    if (offerErr) return jsonNoStore({ ok: false, error: offerErr.message }, 500)
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    // Auftraggeber-Check: in deinen Inserts heißt es "owner_id" in job_offers
    if (s((offer as any).owner_id) !== s(auth.user.id)) {
      return jsonNoStore({ ok: false, error: 'forbidden' }, 403)
    }

    // Nur wenn hold
    if (s((offer as any).payout_status) !== 'hold') {
      return jsonNoStore(
        { ok: true, ignored: true, reason: 'payout_status_not_hold', payout_status: (offer as any).payout_status },
        200
      )
    }

    // Nur wenn paid
    if (s((offer as any).status) !== 'paid') {
      return jsonNoStore({ ok: false, error: 'offer_not_paid', status: (offer as any).status }, 409)
    }

    const paid = Number((offer as any).paid_amount_cents ?? (offer as any).gesamt_cents ?? 0)
    const refunded = Number((offer as any).refunded_amount_cents ?? 0)
    const netGross = Math.max(0, paid - refunded)
    if (netGross <= 0) {
      return jsonNoStore({ ok: true, ignored: true, reason: 'nothing_to_release', paid, refunded }, 200)
    }

    const currency = (s((offer as any).currency) || 'eur').toLowerCase()

    // Connected Account (Vendor) finden:
    // 1) falls du es direkt in offers speicherst:
    let connectedAccountId = s((offer as any).connected_account_id)

    // 2) sonst aus profiles des bieter_id
    if (!connectedAccountId) {
      const bieterId = s((offer as any).bieter_id)
      if (!bieterId) return jsonNoStore({ ok: false, error: 'missing_bieter_id' }, 500)

      const { data: prof, error: profErr } = await admin
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', bieterId)
        .maybeSingle()

      if (profErr) return jsonNoStore({ ok: false, error: profErr.message }, 500)
      connectedAccountId = s((prof as any)?.stripe_account_id)
    }

    if (!connectedAccountId) {
      return jsonNoStore({ ok: false, error: 'vendor_missing_stripe_account_id' }, 409)
    }

    // Provision (7% brutto)
    const platformFeePercent = 0.07
    const platformFee = Math.max(0, Math.round(netGross * platformFeePercent))
    const vendorAmount = Math.max(0, netGross - platformFee)
    if (vendorAmount <= 0) {
      return jsonNoStore({ ok: false, error: 'vendor_amount_zero', netGross, platformFee }, 409)
    }

    // Transfer an Connected Account (Modell B)
    const transfer = await stripe.transfers.create({
      amount: vendorAmount,
      currency,
      destination: connectedAccountId,
      metadata: {
        kind: 'job',
        jobId: jobIdStr,
        offerId,
        net_gross_cents: String(netGross),
        platform_fee_cents: String(platformFee),
        vendor_amount_cents: String(vendorAmount),
      },
    })

    // DB: Offer auf released
    const { error: updOfferErr } = await admin
      .from('job_offers')
      .update({
        payout_status: 'released',
        payout_released_at: nowIso,
        transfer_id: transfer.id,
      } as any)
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .eq('payout_status', 'hold')
      .eq('status', 'paid')

    if (updOfferErr) {
      console.error('[release] DB update failed after transfer:', updOfferErr)
      return jsonNoStore(
        { ok: false, error: 'db_update_failed_after_transfer', transfer_id: transfer.id, message: updOfferErr.message },
        500
      )
    }

    // Job: optional Status/Datum setzen
    await admin
      .from('jobs')
      .update({ status: 'closed', released_at: nowIso, updated_at: nowIso } as any)
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
