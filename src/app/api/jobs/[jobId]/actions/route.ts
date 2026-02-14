// src/app/api/jobs/[jobId]/actions/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()
const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await ctx.params
    const jobIdStr = s(jobId)
    if (!jobIdStr) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth
    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    if (authErr) return jsonNoStore({ ok: false, error: authErr.message }, 401)
    if (!auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)

    const userId = s(auth.user.id)
    const admin = supabaseAdmin()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    // Job
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, selected_offer_id, rueck_datum_utc, released_at, refunded_at, status')
      .eq('id', jobIdStr)
      .maybeSingle()

    if (jobErr) return jsonNoStore({ ok: false, error: jobErr.message }, 500)
    if (!job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)

    const customerId = s((job as any).user_id) // Kunde
    const offerId = s((job as any).selected_offer_id)

    const isCustomer = userId === customerId

    // ohne selected_offer_id -> keine Aktionen
    if (!offerId) {
      return jsonNoStore({
        ok: true,
        nowIso,
        role: isCustomer ? 'customer' : 'other',
        canRefund: false,
        canRelease: false,
        reasonRefund: 'no_selected_offer',
        reasonRelease: 'no_selected_offer',
      })
    }

    // Offer
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, owner_id, bieter_id, status, payout_status, refunded_amount_cents, paid_amount_cents, gesamt_cents, payout_transfer_id')
      .eq('id', offerId)
      .eq('job_id', jobIdStr)
      .maybeSingle()

    if (offErr) return jsonNoStore({ ok: false, error: offErr.message }, 500)
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    const ownerId = s((offer as any).owner_id)     // sollte = Kunde
    const vendorId = s((offer as any).bieter_id)   // Auftragnehmer
    const isVendor = userId === vendorId

    const role = isCustomer ? 'customer' : isVendor ? 'vendor' : 'other'

    // 28d Lock
    const rd = new Date(String((job as any).rueck_datum_utc))
    const unlockAtMs = isNaN(+rd) ? null : +rd + DAYS_28_MS
    const unlockAtIso = unlockAtMs ? new Date(unlockAtMs).toISOString() : null

    const jobFinal = !!((job as any).released_at || (job as any).refunded_at)

    const offerPaid = s((offer as any).status) === 'paid'
    const offerHold = s((offer as any).payout_status) === 'hold'
    const transferExists = !!s((offer as any).payout_transfer_id)
    const refundedSoFar = Number((offer as any).refunded_amount_cents ?? 0)
    const noPartialRefunds = refundedSoFar === 0

    // Basis: Aktionen überhaupt möglich?
    const baseOk = !jobFinal && offerPaid && offerHold && !transferExists && noPartialRefunds

    // Refund: nur Kunde, nur bis unlockAt
    let canRefund = false
    let reasonRefund: string | null = null
    if (!baseOk) {
      reasonRefund = jobFinal ? 'job_final' : !offerPaid ? 'not_paid' : !offerHold ? 'not_hold' : transferExists ? 'transfer_exists' : !noPartialRefunds ? 'partial_refund_block' : 'blocked'
    } else if (!isCustomer || userId !== ownerId) {
      reasonRefund = 'not_customer'
    } else if (unlockAtMs !== null && now > unlockAtMs) {
      reasonRefund = 'customer_locked_after_28d'
    } else if (unlockAtMs === null) {
      // wenn datum kaputt: konservativ -> refund ok nur für kunde (passt), release vendor blocken sowieso
      canRefund = true
    } else {
      canRefund = true
    }

    // Release: bis unlockAt Kunde, danach Vendor
    let canRelease = false
    let reasonRelease: string | null = null
    if (!baseOk) {
      reasonRelease = jobFinal ? 'job_final' : !offerPaid ? 'not_paid' : !offerHold ? 'not_hold' : transferExists ? 'transfer_exists' : !noPartialRefunds ? 'partial_refund_block' : 'blocked'
    } else if (!isCustomer && !isVendor) {
      reasonRelease = 'not_party'
    } else if (unlockAtMs === null) {
      // datum kaputt -> konservativ: nur Kunde darf releasen
      if (isCustomer) canRelease = true
      else reasonRelease = 'invalid_rueck_datum_utc'
    } else {
      if (now <= unlockAtMs) {
        if (isCustomer) canRelease = true
        else reasonRelease = 'vendor_too_early'
      } else {
        if (isVendor) canRelease = true
        else reasonRelease = 'customer_locked_after_28d'
      }
    }

    return jsonNoStore({
      ok: true,
      nowIso,
      role,
      jobId: jobIdStr,
      offerId,
      unlockAt: unlockAtIso,
      canRefund,
      canRelease,
      reasonRefund,
      reasonRelease,
    })
  } catch (e: any) {
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
