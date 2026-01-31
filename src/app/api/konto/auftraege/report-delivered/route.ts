// src/app/api/konto/auftraege/report-delivered/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Body = {
  // Frontend schickt aktuell jobId (confirmJobId = order.jobId)
  jobId?: string
  // optional (falls du später lieber offerId schickst)
  offerId?: string
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as Body
    const jobId = (body.jobId ?? '').toString().trim()
    const offerId = (body.offerId ?? '').toString().trim()

    if (!jobId && !offerId) {
      return NextResponse.json({ ok: false, error: 'missing_jobId_or_offerId' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // 1) Offer finden (nur der Anbieter darf melden)
    let q = admin
      .from('job_offers')
      .select(
        `
        id,
        job_id,
        bieter_id,
        owner_id,
        status,
        fulfillment_status,
        delivered_reported_at,
        delivered_confirmed_at,
        dispute_opened_at,
        dispute_reason
      `
      )
      .eq('status', 'paid')
      .eq('bieter_id', user.id)
      .limit(1)

    if (offerId) q = q.eq('id', offerId)
    else q = q.eq('job_id', jobId)

    const { data: row, error: selErr } = await q.maybeSingle()

    if (selErr) {
      console.error('[POST /api/konto/auftraege/report-delivered] select:', selErr)
      return NextResponse.json({ ok: false, error: 'db_select' }, { status: 500 })
    }
    if (!row) {
      // entweder nicht paid oder nicht dein offer
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const fulfillment = (row as any).fulfillment_status ?? 'in_progress'

    // 2) Idempotent / Schutzlogik
    if (fulfillment === 'reported') {
      return NextResponse.json(
        {
          ok: true,
          changed: false,
          offer: {
            id: String((row as any).id),
            job_id: String((row as any).job_id),
            fulfillment_status: 'reported',
            delivered_reported_at: (row as any).delivered_reported_at ?? null,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    if (fulfillment === 'confirmed') {
      return NextResponse.json({ ok: false, error: 'already_confirmed' }, { status: 409 })
    }

    if (fulfillment === 'disputed') {
      return NextResponse.json({ ok: false, error: 'in_dispute' }, { status: 409 })
    }

    // 3) Update: in_progress -> reported
    const { data: upd, error: updErr } = await admin
      .from('job_offers')
      .update({
        fulfillment_status: 'reported',
        delivered_reported_at: nowIso,
        // KEIN auto_release (du willst das nicht)
        auto_release_at: null,
      })
      .eq('id', String((row as any).id))
      .eq('status', 'paid')
      .eq('bieter_id', user.id)
      .select(
        `
        id,
        job_id,
        fulfillment_status,
        delivered_reported_at
      `
      )
      .single()

    if (updErr) {
      console.error('[POST /api/konto/auftraege/report-delivered] update:', updErr)
      return NextResponse.json({ ok: false, error: 'db_update' }, { status: 500 })
    }

    return NextResponse.json(
      {
        ok: true,
        changed: true,
        offer: {
          id: String((upd as any).id),
          job_id: String((upd as any).job_id),
          fulfillment_status: (upd as any).fulfillment_status,
          delivered_reported_at: (upd as any).delivered_reported_at ?? null,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[POST /api/konto/auftraege/report-delivered] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal' }, { status: 500 })
  }
}
