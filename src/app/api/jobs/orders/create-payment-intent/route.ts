// src/app/api/jobs/orders/create-payment-intent/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})
const CURRENCY = 'eur'

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type ReqBody = {
  jobId: string
  offerId: string
}

function toSafeInt(n: unknown) {
  const x = typeof n === 'bigint' ? Number(n) : Number(n)
  if (!Number.isFinite(x) || !Number.isInteger(x)) return null
  if (x <= 0) return null
  if (x > Number.MAX_SAFE_INTEGER) return null
  return x
}

function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

function canReusePI(status: Stripe.PaymentIntent.Status) {
  return (
    status === 'requires_payment_method' ||
    status === 'requires_confirmation' ||
    status === 'requires_action' ||
    status === 'processing'
  )
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user
    if (authErr || !user) return jsonNoStore({ ok: false, error: 'unauthenticated' }, 401)

    const raw = (await req.json().catch(() => ({}))) as Partial<ReqBody>
    const jobId = s(raw.jobId)
    const offerId = s(raw.offerId)
    if (!jobId || !offerId) return jsonNoStore({ ok: false, error: 'missing_params' }, 400)

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    // 1) Job = Wahrheit (Reservation)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, published, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)
    if (!job.published) return jsonNoStore({ ok: false, error: 'job_not_published' }, 409)
    if (String(job.user_id) !== user.id) return jsonNoStore({ ok: false, error: 'forbidden_not_owner' }, 403)

    if (!['open', 'awaiting_payment'].includes(String(job.status))) {
      return jsonNoStore({ ok: false, error: 'job_wrong_status', jobStatus: String(job.status) }, 409)
    }

    if (s(job.selected_offer_id) !== offerId) {
      return jsonNoStore(
        { ok: false, error: 'offer_not_selected_on_job', selected: s(job.selected_offer_id) || null },
        409
      )
    }

    // 2) Offer laden (nur Plausibilität + Betrag)
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, owner_id, status, valid_until, gesamt_cents, payment_intent_id')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr || !offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)
    if (String(offer.job_id) !== String(jobId)) return jsonNoStore({ ok: false, error: 'offer_wrong_job' }, 409)
    if (String(offer.owner_id) !== user.id) return jsonNoStore({ ok: false, error: 'offer_wrong_owner' }, 409)

    const offerStatus = String(offer.status ?? '')
    if (['paid', 'released', 'refunded'].includes(offerStatus)) {
      return jsonNoStore({ ok: false, error: 'offer_already_final', offerStatus }, 409)
    }

    const vu = new Date(String(offer.valid_until))
    if (isNaN(+vu) || +vu <= Date.now()) return jsonNoStore({ ok: false, error: 'offer_expired' }, 409)

    const amount = toSafeInt(offer.gesamt_cents)
    if (amount === null) return jsonNoStore({ ok: false, error: 'invalid_amount' }, 409)

    // helper: best-effort Offer/Job "nachziehen", aber niemals failen lassen
    const bestEffortSync = async (piId: string) => {
      try {
        await admin
          .from('job_offers')
          .update({
            status: 'selected',
            payment_intent_id: piId,
            currency: CURRENCY,
            updated_at: nowIso,
          })
          .eq('id', offerId)
          .eq('job_id', jobId)
          .eq('owner_id', user.id)
          // KEIN Status-Filter mehr! (sonst genau dein Race)
          .not('status', 'in', '("paid","released","refunded")')
      } catch (e) {
        console.error('[create-payment-intent] bestEffortSync offer failed:', e)
      }

      try {
        await admin
          .from('jobs')
          .update({ status: 'awaiting_payment', updated_at: nowIso })
          .eq('id', jobId)
          .eq('selected_offer_id', offerId)
          .in('status', ['open', 'awaiting_payment'])
      } catch (e) {
        console.error('[create-payment-intent] bestEffortSync job failed:', e)
      }
    }

    // 3) Reuse PI
    const existingId = s(offer.payment_intent_id)
    if (existingId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingId)

        if (existing.status === 'succeeded') {
          return jsonNoStore({ ok: false, error: 'already_paid' }, 409)
        }

        const sameMoney = existing.amount === amount && existing.currency === CURRENCY
        if (existing.status !== 'canceled' && sameMoney && existing.client_secret && canReusePI(existing.status)) {
          // Job-Reservation nochmal checken (Wahrheit)
          const { data: j2 } = await admin.from('jobs').select('selected_offer_id').eq('id', jobId).maybeSingle()
          if (s(j2?.selected_offer_id) !== offerId) {
            return jsonNoStore({ ok: false, error: 'offer_not_selected_on_job' }, 409)
          }

          await bestEffortSync(existing.id)

          return jsonNoStore({
            ok: true,
            jobId,
            offerId,
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
            reused: true,
            piStatus: existing.status,
          })
        }
      } catch {
        // ignore -> create new
      }
    }

    // 4) Neuen PI erstellen
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: {
        kind: 'job',
        jobId,
        offerId,
        buyerId: user.id,
      },
    })

    // 4b) Reservation nochmal checken (Wahrheit)
    const { data: job2, error: job2Err } = await admin
      .from('jobs')
      .select('id, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (job2Err || !job2 || s(job2.selected_offer_id) !== offerId) {
      try {
        await stripe.paymentIntents.cancel(pi.id)
      } catch {}
      return jsonNoStore({ ok: false, error: 'offer_not_selected_on_job' }, 409)
    }

    // 5) Best-effort DB Sync (kein Fail!)
    await bestEffortSync(pi.id)

    // ✅ WICHTIG: NIE wieder offer_not_selected_anymore hier werfen,
    // solange job.selected_offer_id stimmt.
    return jsonNoStore({
      ok: true,
      jobId,
      offerId,
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      reused: false,
      piStatus: pi.status,
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/orders/create-payment-intent] fatal:', e)
    return jsonNoStore({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, 500)
  }
}
