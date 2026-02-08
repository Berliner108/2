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

    // 1) Job laden (Owner prüfen + selected_offer_id muss passen)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, published, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return jsonNoStore({ ok: false, error: 'job_not_found' }, 404)
    if (!job.published) return jsonNoStore({ ok: false, error: 'job_not_published' }, 409)
    if (String(job.user_id) !== user.id) return jsonNoStore({ ok: false, error: 'forbidden_not_owner' }, 403)

    // Job darf open oder awaiting_payment sein (damit Re-Try geht)
    if (!['open', 'awaiting_payment'].includes(String(job.status))) {
      return jsonNoStore({ ok: false, error: 'job_wrong_status' }, 409)
    }

    if (s(job.selected_offer_id) !== offerId) {
      return jsonNoStore({ ok: false, error: 'offer_not_selected_on_job' }, 409)
    }

    // 2) Offer laden (muss selected sein + gültig)
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, owner_id, status, valid_until, gesamt_cents, payment_intent_id')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr || !offer) return jsonNoStore({ ok: false, error: 'offer_not_found' }, 404)
    if (String(offer.job_id) !== String(jobId)) return jsonNoStore({ ok: false, error: 'offer_wrong_job' }, 409)
    if (String(offer.owner_id) !== user.id) return jsonNoStore({ ok: false, error: 'offer_wrong_owner' }, 409)

    // IMPORTANT: PaymentIntent nur, wenn Offer selected ist
    // (open -> erst durch PATCH select)
    if (String(offer.status) !== 'selected') {
      return jsonNoStore({ ok: false, error: 'offer_not_selected' }, 409)
    }

    const vu = new Date(String(offer.valid_until))
    if (isNaN(+vu) || +vu <= Date.now()) return jsonNoStore({ ok: false, error: 'offer_expired' }, 409)

    const amount = toSafeInt(offer.gesamt_cents)
    if (amount === null) return jsonNoStore({ ok: false, error: 'invalid_amount' }, 409)

    // 3) Idempotenz: existierenden PI wiederverwenden, solange nicht succeeded
    const existingId = s(offer.payment_intent_id)
    if (existingId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(existingId)

        // Wenn schon bezahlt -> hier NICHT neu erstellen
        if (existing.status === 'succeeded') {
          return jsonNoStore({ ok: false, error: 'already_paid' }, 409)
        }

        // Wenn noch nutzbar -> clientSecret zurückgeben
        if (existing.client_secret) {
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
        // retrieve failed -> wir erstellen neuen PI
      }
    }

    // 4) Neuen PI erstellen (keine Connect-Transfers hier, Option A)
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: {
        kind: 'job',
        jobId,
        offerId,
        buyerId: user.id, // Auftraggeber (Zahler)
      },
    })

    // 5) payment_intent_id speichern
    const { error: updErr } = await admin
      .from('job_offers')
      .update({
        payment_intent_id: pi.id,
        currency: CURRENCY,
        updated_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('job_id', jobId)
      .eq('status', 'selected')

    if (updErr) {
      console.error('[create-payment-intent] update offer:', updErr)
      // PI existiert trotzdem – wir geben clientSecret zurück, sonst hängt UI
    }

    // Optional: Job Status auf awaiting_payment "festnageln" (idempotent)
    await admin
      .from('jobs')
      .update({ status: 'awaiting_payment', updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .in('status', ['open', 'awaiting_payment'])
      .eq('selected_offer_id', offerId)

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
