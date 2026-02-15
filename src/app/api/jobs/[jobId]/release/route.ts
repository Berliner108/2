// src/app/api/jobs/[id]/release/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000
const PLATFORM_FEE_PCT = 0.07

function jsonError(code: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ error: code, ...(extra ?? {}) }, { status })
}

function parseDate(v: any): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(String(v))
  return Number.isFinite(+d) ? d : null
}

function calcFeeCents(totalGrossCents: number) {
  const fee = Math.round(totalGrossCents * PLATFORM_FEE_PCT)
  return Math.max(0, fee)
}

export async function POST(req: Request, ctx: { params: { jobId: string } }) {
  try {
    const jobId = String(ctx?.params?.jobId ?? "").trim()
    if (!jobId) return jsonError("MISSING_ID", 400)

    // Auth (Cookie Session)
    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user
    if (authErr || !user) return jsonError("UNAUTHORIZED", 401)

    const admin = supabaseAdmin()

    // Job laden (für rueck_datum_utc + selected_offer_id)
    const { data: job, error: jobErr } = await admin
      .from("jobs")
      .select("id,user_id,rueck_datum_utc,selected_offer_id,released_at,refunded_at")
      .eq("id", jobId)
      .single()

    if (jobErr || !job) return jsonError("JOB_NOT_FOUND", 404, { details: jobErr?.message })

    const rueck = parseDate((job as any).rueck_datum_utc)
    if (!rueck) return jsonError("JOB_MISSING_RUECK_DATUM_UTC", 400)

    const selectedOfferId = String((job as any).selected_offer_id ?? "").trim()
    if (!selectedOfferId) return jsonError("NO_SELECTED_OFFER", 409)

    const deadline = new Date(+rueck + DAYS_28_MS)
    const now = new Date()

    // Offer laden
    const { data: offer, error: offErr } = await admin
      .from("job_offers")
      .select(
        [
          "id,job_id,bieter_id,owner_id,gesamt_cents,artikel_cents,versand_cents,currency",
          "paid_at,paid_amount_cents,payment_intent_id,charge_id",
          "payout_status,payout_transfer_id,payout_released_at",
          "refunded_at,refunded_amount_cents",
        ].join(",")
      )
      .eq("id", selectedOfferId)
      .single()

    if (offErr || !offer) return jsonError("OFFER_NOT_FOUND", 404, { details: offErr?.message })
    if (String((offer as any).job_id) !== String(jobId)) return jsonError("OFFER_JOB_MISMATCH", 409)

    const ownerId = String((offer as any).owner_id ?? "").trim()
    const vendorId = String((offer as any).bieter_id ?? "").trim()

    const isCustomer = user.id === ownerId || user.id === String((job as any).user_id)
    const isVendor = user.id === vendorId
    if (!isCustomer && !isVendor) return jsonError("FORBIDDEN", 403)

    // Idempotenz: schon released?
    if ((offer as any).payout_status === "released" || (offer as any).payout_transfer_id) {
      return NextResponse.json({
        ok: true,
        already: "released",
        payout_transfer_id: (offer as any).payout_transfer_id ?? null,
        deadline: deadline.toISOString(),
      })
    }

    // Wenn refund schon gemacht wurde -> kein release
    if ((offer as any).payout_status === "refunded" || (offer as any).refunded_at) {
      return jsonError("ALREADY_REFUNDED", 409)
    }

    // Muss bezahlt sein
    const paidAt = parseDate((offer as any).paid_at)
    const paymentIntentId = String((offer as any).payment_intent_id ?? "").trim()
    const totalCents = Number((offer as any).gesamt_cents ?? 0)

    if (!paidAt || !paymentIntentId || !Number.isFinite(totalCents) || totalCents <= 0) {
      return jsonError("NOT_PAID", 409)
    }

    // Variante A Fristlogik:
    // - Käufer darf release nur BIS deadline
    // - Verkäufer darf release erst NACH deadline
    if (isCustomer) {
      if (now > deadline) return jsonError("TOO_LATE_FOR_CUSTOMER", 403, { deadline: deadline.toISOString() })
    }
    if (isVendor) {
      if (now <= deadline) return jsonError("TOO_EARLY_FOR_VENDOR", 403, { deadline: deadline.toISOString() })
    }

    // Vendor Stripe Account holen
    const { data: prof, error: pErr } = await admin
      .from("profiles")
      .select("stripe_account_id,stripe_connect_id,connect_ready,payouts_enabled")
      .eq("id", vendorId)
      .single()

    if (pErr || !prof) return jsonError("VENDOR_PROFILE_NOT_FOUND", 404)

    const destination =
      String((prof as any).stripe_account_id ?? "").trim() ||
      String((prof as any).stripe_connect_id ?? "").trim()

    if (!destination) return jsonError("VENDOR_NO_STRIPE_ACCOUNT", 409)

    const connectReady = !!(prof as any).connect_ready
    const payoutsEnabled = String((prof as any).payouts_enabled) === "true" || (prof as any).payouts_enabled === true
    if (!connectReady || !payoutsEnabled) return jsonError("VENDOR_NOT_READY_FOR_PAYOUTS", 409)

    const feeCents = calcFeeCents(totalCents)
    const transferCents = Math.max(0, totalCents - feeCents)
    if (transferCents <= 0) return jsonError("TRANSFER_AMOUNT_INVALID", 400)

    const currency = String((offer as any).currency ?? "eur").toLowerCase()

    // Transfer Plattform -> Connected
    const transfer = await stripe.transfers.create({
      amount: transferCents,
      currency,
      destination,
      description: `job payout job=${jobId} offer=${selectedOfferId}`,
      metadata: {
        job_id: String(jobId),
        offer_id: String(selectedOfferId),
        owner_id: ownerId,
        vendor_id: vendorId,
        gross_cents: String(totalCents),
        fee_cents: String(feeCents),
        transfer_cents: String(transferCents),
        model: "variant_a_28d",
      },
    })

    const releasedAtIso = now.toISOString()

    const { error: upOfferErr } = await admin
      .from("job_offers")
      .update({
        payout_status: "released",
        payout_released_at: releasedAtIso,
        payout_transfer_id: transfer.id,
      })
      .eq("id", selectedOfferId)

    if (upOfferErr) {
      return jsonError("DB_UPDATE_FAILED_AFTER_TRANSFER", 500, {
        payout_transfer_id: transfer.id,
        details: upOfferErr.message,
      })
    }

    await admin.from("jobs").update({ released_at: releasedAtIso }).eq("id", jobId)

    return NextResponse.json({
      ok: true,
      payout_transfer_id: transfer.id,
      gross_cents: totalCents,
      fee_cents: feeCents,
      transfer_cents: transferCents,
      deadline: deadline.toISOString(),
      by: isCustomer ? "customer" : "vendor",
    })
  } catch (e: any) {
    console.error("jobs/[id]/release failed:", e)
    return jsonError("INTERNAL", 500, { details: String(e?.message ?? e) })
  }
}
