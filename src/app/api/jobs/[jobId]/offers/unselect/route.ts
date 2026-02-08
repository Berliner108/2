export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Body = { offerId: string }

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await params
    const jobId = String(jobIdRaw ?? '').trim()
    if (!jobId) return jsonNoStore({ ok: false, error: 'missing_job_id' }, 400)

    const sb = await supabaseServer()
    const { data: auth } = await sb.auth.getUser()
    const user = auth?.user
    if (!user) return jsonNoStore({ ok: false, error: 'unauthenticated' }, 401)

    const raw = (await req.json().catch(() => ({}))) as Partial<Body>
    const offerId = String(raw?.offerId ?? '').trim()
    if (!offerId) return jsonNoStore({ ok: false, error: 'missing_offer_id' }, 400)

    const admin = supabaseAdmin()

    // 1) Job laden + Owner prüfen
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)
    if (String(job.user_id) !== user.id) return jsonNoStore({ ok: false, error: 'forbidden_not_owner' }, 403)

    // nur rollback, wenn genau dieses Offer ausgewählt ist
    if (String(job.selected_offer_id || '') !== offerId) {
      return jsonNoStore({ ok: false, error: 'not_selected_offer' }, 409)
    }

    // optional: nur wenn wir wirklich im Bezahlvorgang sind
    if (!['awaiting_payment', 'open'].includes(String(job.status))) {
      return jsonNoStore({ ok: false, error: 'job_not_rollbackable' }, 409)
    }

    // 2) Offer prüfen: muss zum Job gehören und darf NICHT bezahlt sein
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, status, paid_at')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr || !offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)
    if (String(offer.job_id) !== jobId) return jsonNoStore({ ok: false, error: 'offer_wrong_job' }, 409)
    if (offer.paid_at) return jsonNoStore({ ok: false, error: 'offer_already_paid' }, 409)

    // 3) Offer zurück auf open (idempotent)
    const { error: updOfferErr } = await admin
      .from('job_offers')
      .update({ status: 'open' })
      .eq('id', offerId)
      .eq('job_id', jobId)
      .in('status', ['selected', 'open'])

    if (updOfferErr) return jsonNoStore({ ok: false, error: 'db_offer_update' }, 500)

    // 4) Job zurücksetzen (idempotent)
    const { error: updJobErr } = await admin
      .from('jobs')
      .update({
        selected_offer_id: null,
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('selected_offer_id', offerId)
      .in('status', ['awaiting_payment', 'open'])

    if (updJobErr) return jsonNoStore({ ok: false, error: 'db_job_update' }, 500)

    return jsonNoStore({ ok: true })
  } catch (e: any) {
    console.error('[POST /api/jobs/:jobId/offers/unselect] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
