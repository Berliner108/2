// src/app/api/job-invoices/[jobId]/download/route.ts
import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { ensureJobInvoiceForOffer } from "@/server/job-invoices"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function isAdminRole(role?: string | null) {
  return role === "admin"
}

export async function GET(_req: Request, ctx: any) {
  try {
    const jobId = String(ctx?.params?.jobId ?? "").trim()

    if (!jobId) {
      return NextResponse.json({ error: "missing_job_id" }, { status: 400 })
    }

    const sb = await supabaseServer()
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser()

    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const admin = supabaseAdmin()

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id,role")
      .eq("id", user.id)
      .maybeSingle()

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    const isAdmin = isAdminRole((profile as any)?.role)

    // Job laden, damit wir selected_offer_id kennen
    const { data: job, error: jobErr } = await admin
      .from("jobs")
      .select("id,user_id,selected_offer_id,released_at")
      .eq("id", jobId)
      .maybeSingle()

    if (jobErr) {
      return NextResponse.json({ error: jobErr.message }, { status: 500 })
    }

    if (!job) {
      return NextResponse.json({ error: "job_not_found" }, { status: 404 })
    }

    const offerId = String((job as any).selected_offer_id ?? "").trim()

    if (!offerId) {
      return NextResponse.json({ error: "no_selected_offer" }, { status: 409 })
    }

    // Angebot laden
    const { data: offer, error: offerErr } = await admin
      .from("job_offers")
      .select("id,job_id,bieter_id,owner_id,payout_status,payout_released_at,payout_transfer_id")
      .eq("id", offerId)
      .maybeSingle()

    if (offerErr) {
      return NextResponse.json({ error: offerErr.message }, { status: 500 })
    }

    if (!offer) {
      return NextResponse.json({ error: "offer_not_found" }, { status: 404 })
    }

    if (String((offer as any).job_id) !== jobId) {
      return NextResponse.json({ error: "offer_job_mismatch" }, { status: 409 })
    }

    const sellerId = String((offer as any).bieter_id ?? "")
    const buyerId = String((offer as any).owner_id ?? "")

    // Zugriff:
    // Dienstleister darf Rechnung herunterladen.
    // Käufer darf optional auch.
    // Admin darf auch.
    if (!isAdmin && user.id !== sellerId && user.id !== buyerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    if ((offer as any).payout_status !== "released" || !(offer as any).payout_released_at) {
      return NextResponse.json({ error: "invoice_not_available_yet" }, { status: 409 })
    }

    // Rechnung erzeugen/finden, falls PDF fehlt
    const result = await ensureJobInvoiceForOffer(jobId, offerId)

    if ((result as any)?.skipped) {
      return NextResponse.json(
        {
          error: "invoice_not_available",
          reason: (result as any).reason,
        },
        { status: 409 }
      )
    }

    const invoice = result as any
    const pdfPath = String(invoice?.pdf_path ?? "").trim()

    if (!pdfPath) {
      return NextResponse.json({ error: "pdf_path_missing" }, { status: 500 })
    }

    const fileName = `${invoice?.number || "rechnung"}.pdf`

    const { data: signed, error: signErr } = await admin.storage
      .from("invoices")
      .createSignedUrl(pdfPath, 600, {
        download: fileName,
      })

    if (signErr) {
      return NextResponse.json({ error: signErr.message }, { status: 500 })
    }

    if (!signed?.signedUrl) {
      return NextResponse.json({ error: "signed_url_failed" }, { status: 500 })
    }

    return NextResponse.redirect(signed.signedUrl)
  } catch (e: any) {
    console.error("job invoice download failed:", e)

    return NextResponse.json(
      {
        error: e?.message || "failed",
      },
      { status: 500 }
    )
  }
}