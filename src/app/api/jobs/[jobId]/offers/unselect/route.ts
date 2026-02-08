// src/app/api/jobs/[jobId]/offers/unselect/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type Body = {
  offerId?: string // optional: wenn du explizit schicken willst
}

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await params
    const jobId = s(jobIdRaw)
    if (!jobId) return jsonNoStore({ ok: false, error: 'missing_job_id' }, 400)

    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user
    if (authErr || !user) return jsonNoStore({ ok: false, error: 'unauthenticated' }, 401)

    const raw = (await req.json().catch(() => ({}))) as Partial<Body>
    const offerIdFromBody = s(raw.offerId)

    const admin = supabaseAdmin()

    // 1) Job laden (Owner prüfen)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, published, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)
    if (String(job.user_id) !== user.id) return jsonNoStore({ ok: false, error: 'forbidden_not_owner' }, 403)

    // Nur in "vor Zahlung" Phasen zurücksetzen
    if (!['open', 'awaiting_payment'].includes(String(job.status))) {
      return jsonNoStore({ ok: false, error: 'job_wrong_status' }, 409)
    }

    const selectedOfferId = s(job.selected_offer_id)
    if (!selectedOfferId) {
      // nix zu tun
      return jsonNoStore({ ok: true, reset: false, reason: 'no_selected_offer' })
    }

    // Wenn Client offerId mitschickt, muss es passen (sonst falscher Reset)
    if (offerIdFromBody && offerIdFromBody !== selectedOfferId) {
      return jsonNoStore({ ok: false, error: 'offer_mismatch' }, 409)
    }

    // 2) Offer laden (kann fehlen -> wir resetten den Job trotzdem)
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, status, payment_intent_id')
      .eq('id', selectedOfferId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (offErr) {
      console.error('[unselect] offer read error:', offErr)
    }

    // Wenn Offer schon bezahlt / final ist -> NICHT unselecten
    if (offer?.status && ['paid', 'released', 'refunded'].includes(String(offer.status))) {
      return jsonNoStore({ ok: false, error: 'offer_already_final' }, 409)
    }

    // 3) PaymentIntent (optional) abbrechen, falls vorhanden & nicht succeeded
    let piCanceled = false
    const piId = s(offer?.payment_intent_id)
    if (piId) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId)
        if (pi.status !== 'succeeded' && pi.status !== 'canceled') {
          await stripe.paymentIntents.cancel(piId)
          piCanceled = true
        }
      } catch (e) {
        // nicht fatal – DB Reset soll trotzdem passieren
        console.warn('[unselect] PI cancel failed:', e)
      }
    }

    const nowIso = new Date().toISOString()

    // 4) Job resetten (Guard: selected_offer_id muss noch genau dieses sein)
    const { data: updJob, error: updJobErr } = await admin
      .from('jobs')
      .update({
        selected_offer_id: null,
        status: 'open',
        updated_at: nowIso,
      })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .eq('selected_offer_id', selectedOfferId)
      .in('status', ['open', 'awaiting_payment'])
      .select('id')
      .maybeSingle()

    if (updJobErr) {
      console.error('[unselect] job update error:', updJobErr)
      return jsonNoStore({ ok: false, error: 'db_job_update' }, 500)
    }
    if (!updJob?.id) {
      // Race: jemand anders hat schon geändert
      return jsonNoStore({ ok: false, error: 'job_changed' }, 409)
    }

    // 5) Offer zurück auf open (nur wenn es selected ist)
    // + payment_intent_id nullen, damit "frisch" gestartet wird
    if (offer?.id) {
      const { error: updOfferErr } = await admin
        .from('job_offers')
        .update({
          status: 'open',
          payment_intent_id: null,
          updated_at: nowIso,
        })
        .eq('id', selectedOfferId)
        .eq('job_id', jobId)
        .in('status', ['selected', 'open']) // idempotent

      if (updOfferErr) {
        console.error('[unselect] offer update error:', updOfferErr)
        // nicht fatal – Job ist schon frei, Offer kann man notfalls manuell fixen
      }
    }

    return jsonNoStore({
      ok: true,
      reset: true,
      jobId,
      clearedOfferId: selectedOfferId,
      piCanceled,
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/:jobId/offers/unselect] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
