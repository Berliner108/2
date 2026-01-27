// src/app/api/jobs/orders/create-payment-intent/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

const s = (v: unknown) => (typeof v === 'string' ? v : '').trim()

type ReqBody = {
  jobId: string
  offerId: string
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user
    if (authErr || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const raw = (await req.json().catch(() => ({}))) as Partial<ReqBody>
    const jobId = s(raw.jobId)
    const offerId = s(raw.offerId)
    if (!jobId || !offerId) return NextResponse.json({ error: 'missing_params' }, { status: 400 })

    const admin = supabaseAdmin()

    // 1) Job laden (Owner prüfen + selected_offer_id muss schon gesetzt sein!)
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, published, selected_offer_id')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return NextResponse.json({ error: 'job_not_found' }, { status: 404 })
    if (!job.published) return NextResponse.json({ error: 'job_not_published' }, { status: 409 })
    if (String(job.user_id) !== user.id) return NextResponse.json({ error: 'forbidden_not_owner' }, { status: 403 })

    // Wichtig: du wolltest "paid" erst nach echter Zahlung.
    // Daher: PaymentIntent nur erlauben, wenn Job noch "open" ist UND selected_offer_id passt.
    if (String(job.status) !== 'open') return NextResponse.json({ error: 'job_not_open' }, { status: 409 })
    if (s(job.selected_offer_id) !== offerId) return NextResponse.json({ error: 'offer_not_selected_on_job' }, { status: 409 })

    // 2) Offer laden (muss zum Job gehören, open, gültig)
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, owner_id, status, valid_until, gesamt_cents, payment_intent_id')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr || !offer) return NextResponse.json({ error: 'offer_not_found' }, { status: 404 })
    if (String(offer.job_id) !== String(jobId)) return NextResponse.json({ error: 'offer_wrong_job' }, { status: 409 })
    if (String(offer.owner_id) !== user.id) return NextResponse.json({ error: 'offer_wrong_owner' }, { status: 409 })
    if (String(offer.status) !== 'open') return NextResponse.json({ error: 'offer_not_open' }, { status: 409 })

    const vu = new Date(String(offer.valid_until))
    if (isNaN(+vu) || +vu <= Date.now()) return NextResponse.json({ error: 'offer_expired' }, { status: 409 })

    const amount = Number(offer.gesamt_cents ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'invalid_amount' }, { status: 409 })
    }

    // 3) Idempotenz: wenn es schon einen PI gibt, nochmal verwenden (solange nicht succeeded)
    // (Optional, aber empfehlenswert)
    if (offer.payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(String(offer.payment_intent_id))
        if (existing?.client_secret && existing.status !== 'succeeded') {
          return NextResponse.json({
            ok: true,
            jobId,
            offerId,
            clientSecret: existing.client_secret,
            paymentIntentId: existing.id,
          })
        }
      } catch {
        // wenn Retrieve fehlschlägt → neuen PI erstellen
      }
    }

    // 4) PI erstellen
    // WICHTIG: du willst NICHT entscheiden wohin Geld fließt.
    // => dann KEIN destination charge / transfer_data / application_fee_amount
    // => normaler PaymentIntent auf DEINEM Stripe Account, und Geldfluss regeln Nutzer außerhalb.
    // (Wenn später Connect gewünscht ist, ändern wir hier.)
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        kind: 'job',
        jobId,
        offerId,
        buyerId: user.id, // Auftraggeber, der zahlt
      },
    })

    // 5) payment_intent_id am Offer speichern (für Webhook-Matching + Idempotenz)
    const { error: updErr } = await admin
      .from('job_offers')
      .update({
        payment_intent_id: pi.id,
        // NICHT status ändern – das macht erst der Webhook bei succeeded!
      })
      .eq('id', offerId)
      .eq('job_id', jobId)

    if (updErr) {
      console.error('[create-job-PI] update offer:', updErr)
      // PI existiert trotzdem – ClientSecret geben wir zurück, sonst bleibt UI hängen
    }

    return NextResponse.json({
      ok: true,
      jobId,
      offerId,
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
    })
  } catch (e: any) {
    console.error('[POST /api/jobs/orders/create-payment-intent] fatal:', e)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
