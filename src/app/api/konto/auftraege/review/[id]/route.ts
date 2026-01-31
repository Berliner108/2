import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function clampStars(v: any): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(1, Math.min(5, Math.round(n)))
}

type Role = "customer_to_vendor" | "vendor_to_customer"

export async function POST(req: Request, ctx: any) {
  try {
    const params = (ctx?.params ?? {}) as { id?: string }
    const jobId = String(params.id ?? "").trim()
    if (!jobId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 })

    const supabase = await supabaseServer()
    const { data: auth, error: authErr } = await supabase.auth.getUser()
    const user = auth?.user
    if (authErr || !user) {
      return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const role = String(body?.role ?? "") as Role
    const stars = clampStars(body?.stars ?? body?.rating)
    const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 800) : ""

    if (role !== "customer_to_vendor" && role !== "vendor_to_customer") {
      return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 })
    }
    if (!stars) return NextResponse.json({ error: "INVALID_STARS" }, { status: 400 })
    if (!comment) return NextResponse.json({ error: "COMMENT_REQUIRED" }, { status: 400 })

    const admin = supabaseAdmin()

    // ✅ das bezahlte/ausgewählte Offer für diesen Job
    const { data: offer, error: oErr } = await admin
      .from("job_offers")
      .select("job_id, owner_id, bieter_id, status, paid_at, fulfillment_status, delivered_confirmed_at")
      .eq("job_id", jobId)
      .in("status", ["selected", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })
    if (!offer) return NextResponse.json({ error: "OFFER_NOT_FOUND_FOR_JOB" }, { status: 404 })

    const ownerId = String((offer as any).owner_id ?? "")
    const bieterId = String((offer as any).bieter_id ?? "")

    const isOwner = ownerId === user.id
    const isBidder = bieterId === user.id
    if (!isOwner && !isBidder) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })

    // Rolle muss passen
    if (role === "customer_to_vendor" && !isOwner) return NextResponse.json({ error: "ROLE_FORBIDDEN" }, { status: 403 })
    if (role === "vendor_to_customer" && !isBidder) return NextResponse.json({ error: "ROLE_FORBIDDEN" }, { status: 403 })

    // ✅ erst nach confirmed + Zahlung
    const fulfillment = String((offer as any).fulfillment_status ?? "")
    const deliveredConfirmedAt = (offer as any).delivered_confirmed_at as string | null
    if (fulfillment !== "confirmed" && !deliveredConfirmedAt) {
      return NextResponse.json({ error: "Bewertung erst nach Bestätigung (confirmed) möglich." }, { status: 409 })
    }

    const paidAt = (offer as any).paid_at as string | null
    const status = String((offer as any).status ?? "").toLowerCase()
    if (!paidAt && status !== "paid") {
      return NextResponse.json({ error: "Bewertung erst nach Zahlung möglich." }, { status: 409 })
    }

    const ratee_id = role === "customer_to_vendor" ? bieterId : ownerId

    // ✅ Doppelbewertung abfangen (DB Unique macht’s final sicher)
    const { data: existing, error: eErr } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", jobId)
      .eq("rater_id", user.id)
      .limit(1)

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 })
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Du hast diesen Auftrag bereits bewertet." }, { status: 409 })
    }

    const ratingEnum = String(stars) as any

    const { data: created, error: cErr } = await admin
      .from("reviews")
      .insert({
        order_id: jobId,
        shop_order_id: null,
        rater_id: user.id,
        ratee_id,
        comment,
        stars,
        rating: ratingEnum,
      })
      .select("id, order_id, rater_id, ratee_id, stars, comment, created_at")
      .single()

    // Unique-Verletzung sauber als 409
    if (cErr) {
      const msg = String(cErr.message || "")
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        return NextResponse.json({ error: "Du hast diesen Auftrag bereits bewertet." }, { status: 409 })
      }
      return NextResponse.json({ error: cErr.message }, { status: 500 })
    }

    return NextResponse.json({ review: created })
  } catch (e) {
    console.error("[POST /api/konto/auftraege/review/[id]] fatal:", e)
    return NextResponse.json({ error: "fatal" }, { status: 500 })
  }
}
