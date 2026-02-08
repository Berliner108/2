// src/app/api/jobs/[jobId]/offers/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Body = {
  artikel_cents: number
  versand_cents: number
  gesamt_cents: number
}

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n)
}

function parseBody(raw: any): { ok: true; value: Body } | { ok: false; error: string } {
  const a = raw?.artikel_cents
  const v = raw?.versand_cents
  const g = raw?.gesamt_cents

  if (!isInt(a) || !isInt(v) || !isInt(g)) return { ok: false, error: 'invalid_price_format' }
  if (a < 0 || v < 0) return { ok: false, error: 'negative_prices_not_allowed' }
  if (g !== a + v) return { ok: false, error: 'sum_mismatch' }

  return { ok: true, value: { artikel_cents: a, versand_cents: v, gesamt_cents: g } }
}

/* =========================
   PATCH: Angebot auswählen
   - setzt Offer.status = selected
   - setzt Job.selected_offer_id + Job.status = awaiting_payment
   - idempotent (mehrfach klicken ok)
   - bei Fehler: rollback Offer zurück auf open (wenn wir es gerade geändert haben)
   ========================= */
type SelectBody = { offerId: string }

export async function PATCH(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await params
    const jobId = String(jobIdRaw ?? '').trim()
    if (!jobId) return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: auth, error: authErr } = await sb.auth.getUser()
    const user = auth?.user

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const raw = (await req.json().catch(() => ({}))) as Partial<SelectBody>
    const offerId = String(raw?.offerId ?? '').trim()
    if (!offerId) {
      return NextResponse.json({ ok: false, error: 'missing_offer_id' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // 1) Job prüfen
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, status, selected_offer_id, published')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) return NextResponse.json({ ok: false, error: 'auftrag_nicht_gefunden' }, { status: 404 })

    if (!job.published) {
      return NextResponse.json({ ok: false, error: 'auftrag_nicht_mehr_verfügbar' }, { status: 409 })
    }

    const ownerId = String(job.user_id)
    if (ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden_not_owner' }, { status: 403 })
    }

    // Job darf open oder awaiting_payment sein (damit "erneut starten" geht)
    if (!['open', 'awaiting_payment'].includes(String(job.status))) {
      return NextResponse.json({ ok: false, error: 'auftrag_nicht_mehr_verfügbar' }, { status: 409 })
    }

    // Wenn schon ein anderes Offer selected ist -> blocken
    if (job.selected_offer_id && String(job.selected_offer_id) !== offerId) {
      return NextResponse.json({ ok: false, error: 'auftrag_bereits_im_bezahlvorgang' }, { status: 409 })
    }

    // 2) Offer prüfen
    const { data: offer, error: offErr } = await admin
      .from('job_offers')
      .select('id, job_id, owner_id, status, valid_until')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr || !offer) {
      return NextResponse.json({ ok: false, error: 'offer_not_found' }, { status: 404 })
    }

    if (String(offer.job_id) !== jobId) {
      return NextResponse.json({ ok: false, error: 'offer_wrong_job' }, { status: 409 })
    }

    if (String(offer.owner_id) !== ownerId) {
      return NextResponse.json({ ok: false, error: 'offer_wrong_owner' }, { status: 409 })
    }

    // Nur open/selected darf hier weiter (paid/refunded/etc. NICHT)
    if (!['open', 'selected'].includes(String(offer.status))) {
      return NextResponse.json({ ok: false, error: 'offer_not_selectable' }, { status: 409 })
    }

    const now = new Date()
    const validUntil = new Date(String(offer.valid_until))
    if (isNaN(+validUntil) || +validUntil <= +now) {
      return NextResponse.json({ ok: false, error: 'offer_expired' }, { status: 409 })
    }

    const offerWasOpen = String(offer.status) === 'open'

    // 3) Offer -> selected (idempotent)
    const { data: updOffer, error: updOfferErr } = await admin
      .from('job_offers')
      .update({ status: 'selected' })
      .eq('id', offerId)
      .eq('job_id', jobId)
      .in('status', ['open', 'selected'])
      .select('id, status')
      .maybeSingle()

    if (updOfferErr) {
      console.error('[PATCH select offer] update offer:', updOfferErr)
      return NextResponse.json({ ok: false, error: 'db_offer_update' }, { status: 500 })
    }
    if (!updOffer?.id) {
      return NextResponse.json({ ok: false, error: 'offer_already_taken' }, { status: 409 })
    }

    // 4) Job reservieren + auf awaiting_payment setzen (idempotent)
    const { data: updatedJob, error: updJobErr } = await admin
      .from('jobs')
      .update({
        selected_offer_id: offerId,
        status: 'awaiting_payment',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .in('status', ['open', 'awaiting_payment'])
      .or(`selected_offer_id.is.null,selected_offer_id.eq.${offerId}`)
      .select('id, selected_offer_id')
      .maybeSingle()

    if (updJobErr) {
      console.error('[PATCH select offer] update job:', updJobErr)

      // rollback: nur wenn wir gerade von open -> selected gegangen sind
      if (offerWasOpen) {
        await admin
          .from('job_offers')
          .update({ status: 'open' })
          .eq('id', offerId)
          .eq('job_id', jobId)
          .eq('status', 'selected')
      }

      return NextResponse.json({ ok: false, error: 'db_job_update' }, { status: 500 })
    }

    if (!updatedJob?.id) {
      // rollback: nur wenn wir gerade von open -> selected gegangen sind
      if (offerWasOpen) {
        await admin
          .from('job_offers')
          .update({ status: 'open' })
          .eq('id', offerId)
          .eq('job_id', jobId)
          .eq('status', 'selected')
      }

      return NextResponse.json({ ok: false, error: 'job_already_selected' }, { status: 409 })
    }

    return NextResponse.json(
      { ok: true, jobId, selectedOfferId: offerId },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    console.error('[PATCH /api/jobs/:jobId/offers] fatal:', e)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}

/* =========================
   POST: Angebot abgeben
   ========================= */
export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId: jobIdRaw } = await params
    const jobId = String(jobIdRaw ?? '').trim()
    if (!jobId) {
      return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 })
    }

    const sb = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const raw = await req.json().catch(() => ({}))
    const parsed = parseBody(raw)

    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
    }

    const { artikel_cents, versand_cents, gesamt_cents } = parsed.value

    const admin = supabaseAdmin()

    // 1) Job laden + Regeln prüfen
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, published, status, liefer_datum_utc')
      .eq('id', jobId)
      .maybeSingle()

    if (jobErr || !job) {
      return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 })
    }

    if (!job.published || String(job.status) !== 'open') {
      return NextResponse.json({ ok: false, error: 'job_not_open' }, { status: 409 })
    }

    const ownerId = String(job.user_id)
    if (ownerId === user.id) {
      return NextResponse.json({ ok: false, error: 'cannot_offer_on_own_job' }, { status: 403 })
    }

    const lieferDate = new Date(String(job.liefer_datum_utc))
    if (isNaN(+lieferDate)) {
      return NextResponse.json({ ok: false, error: 'job_missing_liefer_datum' }, { status: 409 })
    }

    // 24h vor Warenausgabe: Abgabe sperren
    const now = new Date()
    const cutOff = new Date(lieferDate.getTime() - 24 * 60 * 60 * 1000) // liefer - 24h
    if (+now >= +cutOff) {
      return NextResponse.json({ ok: false, error: 'offer_window_closed' }, { status: 403 })
    }

    // valid_until = min(now+72h, liefer-24h)
    const plus72h = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const valid_until = new Date(Math.min(+plus72h, +cutOff))
    if (+valid_until <= +now) {
      return NextResponse.json({ ok: false, error: 'valid_until_invalid' }, { status: 409 })
    }

    // 2) Profil (Snapshot-Quelle: city/country/account_type + private address/company/vat)
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('id, account_type, company_name, vat_number, address')
      .eq('id', user.id)
      .maybeSingle()

    if (profErr || !prof) {
      return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 409 })
    }

    const addr: any = prof.address || {}
    const meta: any = user.user_metadata || {}

    const anbieter_snapshot = {
      public: {
        account_type: String(prof.account_type || ''),
        location: {
          country: String(addr.country || ''),
          city: String(addr.city || ''),
        },
      },
      private: {
        firstName: String(meta.firstName || ''),
        lastName: String(meta.lastName || ''),
        address: {
          street: String(addr.street || ''),
          houseNumber: String(addr.houseNumber || ''),
          zip: String(addr.zip || ''),
          city: String(addr.city || ''),
          country: String(addr.country || ''),
        },
        company_name: String(prof.company_name || ''),
        vat_number: String(prof.vat_number || ''),
      },
    }

    // 3) Insert offer (Unique(job_id, bieter_id) blockt 2. Angebot)
    const { data: inserted, error: insErr } = await admin
      .from('job_offers')
      .insert({
        job_id: jobId,
        bieter_id: user.id,
        owner_id: ownerId,
        artikel_cents,
        versand_cents,
        gesamt_cents,
        valid_until: valid_until.toISOString(),
        status: 'open',
        anbieter_snapshot,
      })
      .select('id, valid_until')
      .maybeSingle()

    if (insErr) {
      const code = (insErr as any)?.code
      const msg = String((insErr as any)?.message ?? '')

      if (code === '23505' || /duplicate key value violates unique constraint/i.test(msg)) {
        return NextResponse.json({ ok: false, error: 'already_offered' }, { status: 409 })
      }

      console.error('[job_offers insert] db:', insErr)
      return NextResponse.json({ ok: false, error: 'db', message: msg, code }, { status: 500 })
    }

    return NextResponse.json(
      { ok: true, offerId: inserted?.id, valid_until: inserted?.valid_until },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e: any) {
    console.error('[POST /api/jobs/:jobId/offers] fatal:', e)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(e?.message ?? e) },
      { status: 500 }
    )
  }
}
