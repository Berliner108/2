// src/app/api/konto/auftraege/open-dispute/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Body = {
  jobId?: string
  offerId?: string
  reason?: string | null
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

    // reason optional, aber wir normalisieren
    const reasonRaw = typeof body.reason === 'string' ? body.reason : ''
    const reason = reasonRaw.trim().slice(0, 800) || null

    if (!jobId && !offerId) {
      return NextResponse.json({ ok: false, error: 'missing_jobId_or_offerId' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // 1) Offer finden (nur Auftraggeber kann Dispute öffnen)
    let q = admin
      .from('job_offers')
      .select(
        `
        id,
        job_id,
        owner_id,
        status,
        fulfillment_status,
        delivered_reported_at,
        delivered_confirmed_at,
        dispute_opened_at,
        dispute_reason,
        payout_status
      `
      )
      .eq('status', 'paid')
      .eq('owner_id', user.id)
      .limit(1)

    if (offerId) q = q.eq('id', offerId)
    else q = q.eq('job_id', jobId)

    const { data: row, error: selErr } = await q.maybeSingle()

    if (selErr) {
      console.error('[POST /api/konto/auftraege/open-dispute] select:', selErr)
      return NextResponse.json({ ok: false, error: 'db_select' }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const fulfillment = String((row as any).fulfillment_status ?? 'in_progress')

    // 2) Regeln:
    // - Dispute macht nur Sinn nach "reported" (oder wenn du willst auch vorher — hier: ab reported)
    if (fulfillment === 'in_progress') {
      return NextResponse.json({ ok: false, error: 'not_reported_yet' }, { status: 409 })
    }
    // idempotent
    if (fulfillment === 'disputed') {
      return NextResponse.json(
        {
          ok: true,
          changed: false,
          offer: {
            id: String((row as any).id),
            job_id: String((row as any).job_id),
            fulfillment_status: 'disputed',
            dispute_opened_at: (row as any).dispute_opened_at ?? null,
            dispute_reason: (row as any).dispute_reason ?? null,
            payout_status: (row as any).payout_status ?? 'hold',
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
    if (fulfillment === 'confirmed') {
      return NextResponse.json({ ok: false, error: 'already_confirmed' }, { status: 409 })
    }

    // 3) Update: -> disputed (payout bleibt hold)
    const { data: upd, error: updErr } = await admin
      .from('job_offers')
      .update({
        fulfillment_status: 'disputed',
        dispute_opened_at: nowIso,
        dispute_reason: reason,
      })
      .eq('id', String((row as any).id))
      .eq('status', 'paid')
      .eq('owner_id', user.id)
      .select(
        `
        id,
        job_id,
        fulfillment_status,
        dispute_opened_at,
        dispute_reason,
        payout_status
      `
      )
      .single()

    if (updErr) {
      console.error('[POST /api/konto/auftraege/open-dispute] update:', updErr)
      return NextResponse.json({ ok: false, error: 'db_update' }, { status: 500 })
    }

    return NextResponse.json(
      {
        ok: true,
        changed: true,
        offer: {
          id: String((upd as any).id),
          job_id: String((upd as any).job_id),
          fulfillment_status: String((upd as any).fulfillment_status),
          dispute_opened_at: (upd as any).dispute_opened_at ?? null,
          dispute_reason: (upd as any).dispute_reason ?? null,
          payout_status: String((upd as any).payout_status ?? 'hold'),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[POST /api/konto/auftraege/open-dispute] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal' }, { status: 500 })
  }
}
