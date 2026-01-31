// src/app/api/konto/auftraege/confirm-delivered/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Body = {
  jobId?: string
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

    // 1) Offer finden (nur der Auftraggeber darf bestätigen)
    let q = admin
      .from('job_offers')
      .select(
        `
        id,
        job_id,
        owner_id,
        bieter_id,
        status,
        fulfillment_status,
        delivered_reported_at,
        delivered_confirmed_at,
        dispute_opened_at,
        dispute_reason,
        payout_status,
        payout_released_at,
        refunded_amount_cents,
        paid_amount_cents
      `
      )
      .eq('status', 'paid')
      .eq('owner_id', user.id)
      .limit(1)

    if (offerId) q = q.eq('id', offerId)
    else q = q.eq('job_id', jobId)

    const { data: row, error: selErr } = await q.maybeSingle()

    if (selErr) {
      console.error('[POST /api/konto/auftraege/confirm-delivered] select:', selErr)
      return NextResponse.json({ ok: false, error: 'db_select' }, { status: 500 })
    }
    if (!row) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
    }

    const fulfillment = String((row as any).fulfillment_status ?? 'in_progress')

    // 2) Reihenfolge absichern:
    // - Bestätigen erst nach "reported" (Zustellung gemeldet)
    if (fulfillment === 'in_progress') {
      return NextResponse.json({ ok: false, error: 'not_reported_yet' }, { status: 409 })
    }
    if (fulfillment === 'disputed') {
      return NextResponse.json({ ok: false, error: 'in_dispute' }, { status: 409 })
    }

    // idempotent
    if (fulfillment === 'confirmed') {
      return NextResponse.json(
        {
          ok: true,
          changed: false,
          offer: {
            id: String((row as any).id),
            job_id: String((row as any).job_id),
            fulfillment_status: 'confirmed',
            delivered_confirmed_at: (row as any).delivered_confirmed_at ?? null,
            payout_status: (row as any).payout_status ?? 'hold',
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 3) Update: reported -> confirmed
    // payout bleibt erstmal auf 'hold' (weil ihr Transfers später via Stripe Connect "delayed" macht)
    const { data: upd, error: updErr } = await admin
      .from('job_offers')
      .update({
        fulfillment_status: 'confirmed',
        delivered_confirmed_at: nowIso,
      })
      .eq('id', String((row as any).id))
      .eq('status', 'paid')
      .eq('owner_id', user.id)
      .select(
        `
        id,
        job_id,
        fulfillment_status,
        delivered_confirmed_at,
        payout_status,
        payout_released_at,
        refunded_amount_cents,
        paid_amount_cents
      `
      )
      .single()

    if (updErr) {
      console.error('[POST /api/konto/auftraege/confirm-delivered] update:', updErr)
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
          delivered_confirmed_at: (upd as any).delivered_confirmed_at ?? null,

          // fürs Frontend sofort sichtbar
          payout_status: String((upd as any).payout_status ?? 'hold'),
          refunded_amount_cents: Number((upd as any).refunded_amount_cents ?? 0),
          paid_amount_cents: (upd as any).paid_amount_cents == null ? null : Number((upd as any).paid_amount_cents),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[POST /api/konto/auftraege/confirm-delivered] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal' }, { status: 500 })
  }
}
