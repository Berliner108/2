// src/app/api/jobs/[jobId]/release/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function safeNum(v: any): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

// Provision (Default 7%)
function getPlatformFeePct(): number {
  const raw = process.env.PLATFORM_FEE_PCT
  const n = raw ? Number(raw) : 0.07
  if (!Number.isFinite(n) || n < 0) return 0.07
  return n
}

function calcPlatformFeeCents(totalGrossCents: number): number {
  const pct = getPlatformFeePct()
  const fee = Math.round(totalGrossCents * pct)
  return Math.max(0, fee)
}

function pickStripeAccountId(snapshot: any): string {
  const candidates = [
    snapshot?.public?.stripe_account_id,
    snapshot?.public?.stripeAccountId,
    snapshot?.public?.connect_account_id,
    snapshot?.public?.connectAccountId,
    snapshot?.stripe_account_id,
    snapshot?.stripeAccountId,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return ''
}

export async function POST(req: Request, ctx: { params: { jobId: string } }) {
  try {
    const jobId = s(ctx?.params?.jobId)
    if (!jobId) return jsonNoStore({ ok: false, error: 'missing_jobId' }, 400)

    // Auth
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll() {} } }
    )

    const { data: auth, error: authErr } = await supabase.auth.getUser()
    if (authErr || !auth?.user) return jsonNoStore({ ok: false, error: 'unauthorized' }, 401)
    const uid = auth.user.id

    const admin = supabaseAdmin()

    // Job prüfen: nur Auftraggeber darf release auslösen
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

    const { data: offer, error: oErr } = await admin
      .from('job_offers')
      .select(
        `
        id, job_id, status,
        bieter_id,
        anbieter_snapshot,
        payout_status, payout_released_at,
        paid_amount_cents, refunded_amount_cents,
        currency, charge_id,
        fulfillment_status
      `
      )
      .eq('id', offerId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (oErr) throw oErr
    if (!offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)

    // ✅ nur wenn hold
    if (String(offer.payout_status ?? 'hold') !== 'hold') {
      return jsonNoStore({ ok: false, error: 'already_released_or_refunded' }, 409)
    }

    if (String(offer.status) !== 'paid') {
      return jsonNoStore({ ok: false, error: 'offer_not_paid' }, 409)
    }

    // (optional) du kannst hier hart verlangen: erst nach confirmed freigeben
    // wenn du das willst, aktivieren:
    // if (String(offer.fulfillment_status ?? 'in_progress') !== 'confirmed') {
    //   return jsonNoStore({ ok: false, error: 'not_confirmed_yet' }, 409)
    // }

    const paid = safeNum(offer.paid_amount_cents)
    const refunded = safeNum(offer.refunded_amount_cents)
    const remaining = Math.max(0, paid - refunded)
    if (remaining <= 0) return jsonNoStore({ ok: false, error: 'nothing_to_release' }, 409)

    const currency = s(offer.currency) || 'eur'

    // Stripe Account des Anbieters finden
    let stripeAccountId = pickStripeAccountId(offer.anbieter_snapshot)

    // Fallback: aus profiles lesen (wenn du so eine Spalte hast)
    if (!stripeAccountId) {
      const { data: prof } = await admin
        .from('profiles')
        .select('id, stripe_account_id, stripeAccountId, connect_account_id, connectAccountId')
        .eq('id', String(offer.bieter_id))
        .maybeSingle()

      const p: any = prof
      stripeAccountId =
        s(p?.stripe_account_id) ||
        s(p?.stripeAccountId) ||
        s(p?.connect_account_id) ||
        s(p?.connectAccountId) ||
        ''
    }

    if (!stripeAccountId) {
      return jsonNoStore({ ok: false, error: 'vendor_missing_stripe_account_id' }, 409)
    }

    // Provision berechnen
    const platformFee = calcPlatformFeeCents(remaining)
    const vendorAmount = Math.max(0, remaining - platformFee)
    if (vendorAmount <= 0) return jsonNoStore({ ok: false, error: 'vendor_amount_zero' }, 409)

    // Transfer an Anbieter (Model: “separate charges & transfers” / Auszahlung später)
    // Optional: source_transaction = charge_id, falls vorhanden (sauberer Bezug).
    const chargeId = s(offer.charge_id)
    const transfer = await stripe.transfers.create({
      amount: vendorAmount,
      currency,
      destination: stripeAccountId,
      ...(chargeId ? { source_transaction: chargeId } : {}),
      metadata: {
        kind: 'job',
        jobId,
        offerId,
        platformFeeCents: String(platformFee),
      },
    })

    // DB updaten
    const nowIso = new Date().toISOString()
    const { error: upErr } = await admin
      .from('job_offers')
      .update({
        payout_status: 'released',
        payout_released_at: nowIso,
      })
      .eq('id', offerId)
      .eq('job_id', jobId)
      .eq('payout_status', 'hold') // idempotent-safety

    if (upErr) throw upErr

    // Job optional auch markieren
    await admin
      .from('jobs')
      .update({ released_at: nowIso, updated_at: nowIso })
      .eq('id', jobId)

    return jsonNoStore(
      {
        ok: true,
        jobId,
        offerId,
        vendorAmount,
        platformFee,
        transfer: { id: transfer.id, amount: transfer.amount, destination: (transfer as any).destination },
      },
      200
    )
  } catch (e: any) {
    console.error('[POST /api/jobs/[jobId]/release] error:', e)
    return jsonNoStore({ ok: false, error: 'release_failed', message: String(e?.message ?? e) }, 500)
  }
}
