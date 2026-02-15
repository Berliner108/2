// src/app/api/jobs/[id]/refund/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000

function jsonError(code: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ error: code, ...(extra ?? {}) }, { status })
}

function parseDate(v: any): Date | null {
  if (!v) return null
  const d = v instanceof Date ? v : new Date(String(v))
  return Number.isFinite(+d) ? d : null
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const jobId = String(ctx?.params?.id ?? "").trim()
    if (!jobId) return jsonError("MISSING_ID", 400)

    // optional body: { reason?: string }
    const body = await req.json().catch(() => ({} as any))
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 800) : ""

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
          "id,job_id,bieter_id,owner_id,gesamt_cents,currency",
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
    if (!isCustomer) return jsonError("FORBIDDEN", 403)

    // Käufer darf nur bis deadline refund auslösen
    if (now > deadline) return jsonError("TOO_LATE_FOR_REFUND", 403, { deadline: deadline.toISOString() })

    // schon released? -> kein refund
    if ((offer as any).payout_status === "released" || (offer as any).payout_transfer_id) {
      return jsonError("ALREADY_RELEASED", 409)
    }

    // schon refunded? -> idempotent ok
    if ((offer as any).payout_status === "refunded" || (offer as any).refunded_at) {
      return NextResponse.json({
        ok: true,
        already: "refunded",
        refunded_amount_cents: Number((offer as any).refunded_amount_cents ?? 0) || 0,
        deadline: deadline.toISOString(),
      })
    }

    // Muss bezahlt sein
    const paidAt = parseDate((offer as any).paid_at)
    const paymentIntentId = String((offer as any).payment_intent_id ?? "").trim()
    const totalCents = Number((offer as any).gesamt_cents ?? 0)

    if (!paidAt || !paymentIntentId || !Number.isFinite(totalCents) || totalCents <= 0) {
      return jsonError("NOT_PAID", 409)
    }

    // Refund über PaymentIntent (voller Betrag)
    // Hinweis: Bei Connect Destination/Separate Charges ist Refund i.d.R. am PI möglich.
    // Falls du später Partial Refund willst -> amount setzen.
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: totalCents,
      reason: "requested_by_customer",
      metadata: {
        job_id: String(jobId),
        offer_id: String(selectedOfferId),
        owner_id: ownerId,
        vendor_id: vendorId,
        model: "variant_a_28d",
        note: reason || "",
      },
    })

    const refundedAtIso = now.toISOString()

    const { error: upOfferErr } = await admin
      .from("job_offers")
      .update({
        payout_status: "refunded",
        refunded_at: refundedAtIso,
        refunded_amount_cents: totalCents,
      })
      .eq("id", selectedOfferId)

    if (upOfferErr) {
      return jsonError("DB_UPDATE_FAILED_AFTER_REFUND", 500, {
        refund_id: refund.id,
        details: upOfferErr.message,
      })
    }

    await admin.from("jobs").update({ refunded_at: refundedAtIso }).eq("id", jobId)

    return NextResponse.json({
      ok: true,
      refund_id: refund.id,
      refunded_amount_cents: totalCents,
      deadline: deadline.toISOString(),
    })
  } catch (e: any) {
    console.error("jobs/[id]/refund failed:", e)
    return jsonError("INTERNAL", 500, { details: String(e?.message ?? e) })
  }
}
