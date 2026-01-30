// /src/app/api/konto/auftraege/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DbOffer = {
  id: string
  job_id: string
  bieter_id: string
  owner_id: string
  gesamt_cents: number | null
  created_at: string | null
  status: string | null
  anbieter_snapshot: any | null
  paid_at: string | null
  paid_amount_cents: number | null
  refunded_amount_cents: number | null
  currency: string | null
  payment_intent_id: string | null
  charge_id: string | null
}

type DbJobPayStatus = 'paid' | 'released' | 'partially_refunded' | 'refunded' | 'disputed'

type ApiOrder = {
  jobId: string
  offerId?: string
  vendor?: string
  amountCents?: number
  acceptedAt: string
  kind: 'vergeben' | 'angenommen'

  // Ablaufstatus (dein Frontend-Flow) – kommt später aus DB, hier nur default
  status?: 'in_progress' | 'reported' | 'disputed' | 'confirmed'
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  autoReleaseAt?: string
  disputeOpenedAt?: string
  disputeReason?: string | null

  // Zahlungsstatus (DB) – das wolltest du sichtbar haben
  jobPayStatus?: DbJobPayStatus
  offerPayStatus?: DbJobPayStatus
  paidAt?: string
  releasedAt?: string
}

type ApiJob = {
  id: string
  verfahren: any[]
  material?: string
  standort?: string
  beschreibung?: string
  bilder?: string[]
  warenausgabeDatum?: string | null
  lieferDatum?: string | null
  warenannahmeDatum?: string | null
  user?: any
}

function pick<T extends Record<string, any>>(obj: T, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k]
  }
  return undefined
}

function safeNum(v: any): number | undefined {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

function buildVendorLabel(snapshot: any): string | undefined {
  if (!snapshot || typeof snapshot !== 'object') return undefined
  const priv = snapshot.private ?? snapshot?.anbieter_snapshot?.private ?? snapshot?.anbieter?.private
  const pub = snapshot.public ?? snapshot?.anbieter_snapshot?.public ?? snapshot?.anbieter?.public

  const company = (priv?.company_name || priv?.company || priv?.firma || '').trim?.() || ''
  const first = (priv?.firstName || priv?.firstname || '').trim?.() || ''
  const last = (priv?.lastName || priv?.lastname || '').trim?.() || ''
  const name = [first, last].filter(Boolean).join(' ').trim()

  const acct = (pub?.account_type || pub?.accountType || '').toString().trim()

  const base = company || name
  if (!base) return undefined
  return acct ? `${base} · ${acct}` : base
}

function computePayStatus(offer: DbOffer): DbJobPayStatus | undefined {
  // 1) Status-Text aus DB (falls du später umstellst)
  const s = (offer.status || '').toLowerCase().trim()

  // 2) Refund-Logik (überschreibt)
  const refunded = safeNum(offer.refunded_amount_cents) ?? 0
  const paidAmt = safeNum(offer.paid_amount_cents) ?? (offer.paid_at ? safeNum(offer.gesamt_cents) ?? 0 : 0)

  if (refunded > 0) {
    if (paidAmt > 0 && refunded >= paidAmt) return 'refunded'
    return 'partially_refunded'
  }

  // 3) Dispute
  if (s === 'disputed') return 'disputed'

  // 4) Released / Paid
  if (s === 'released') return 'released'
  if (s === 'paid') return 'paid'

  // 5) Fallback: paid_at vorhanden => paid
  if (offer.paid_at) return 'paid'

  return undefined
}

function normalizeJob(row: any): ApiJob {
  const id = String(row.id)

  const verfahren =
    row.verfahren ??
    row.procedures ??
    row.verfahren_json ??
    row.verfahren_liste ??
    []

  const bilder =
    row.bilder ??
    row.images ??
    row.photos ??
    row.job_images ??
    undefined

  const warenausgabeDatum = pick(row, ['warenausgabeDatum', 'warenausgabe_datum', 'warenausgabe_date', 'ausgabe_datum'])
  const lieferDatum = pick(row, ['lieferDatum', 'liefer_datum', 'lieferdate', 'delivery_date'])
  const warenannahmeDatum = pick(row, ['warenannahmeDatum', 'warenannahme_datum', 'annahme_datum', 'pickup_date'])

  const user =
    row.user ??
    row.owner_snapshot ??
    row.kunde_snapshot ??
    row.owner ??
    undefined

  return {
    id,
    verfahren: Array.isArray(verfahren) ? verfahren : [],
    material: row.material ?? row.materialguete ?? row.guete ?? undefined,
    standort:
      row.standort ??
      row.location?.city ??
      row.ort ??
      row.city ??
      undefined,
    beschreibung: row.beschreibung ?? row.description ?? undefined,
    bilder: Array.isArray(bilder) ? bilder : undefined,
    warenausgabeDatum: warenausgabeDatum ?? null,
    lieferDatum: lieferDatum ?? null,
    warenannahmeDatum: warenannahmeDatum ?? null,
    user,
  }
}

export async function GET() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const uid = auth.user.id

  // nur "bezahlt + Folgestati"
  const allowedStatus = ['paid', 'released', 'refunded', 'partially_refunded', 'disputed']

  const baseSelect =
    'id,job_id,bieter_id,owner_id,gesamt_cents,created_at,status,anbieter_snapshot,paid_at,paid_amount_cents,refunded_amount_cents,currency,payment_intent_id,charge_id'

  // 1) Auftraggeber-Sicht (vergeben): owner_id = uid
  const { data: ownerOffersRaw, error: ownerErr } = await supabase
    .from('job_offers')
    .select(baseSelect)
    .eq('owner_id', uid)
    // paid_at vorhanden ODER DB-Status schon in Folgestati
    .or(`paid_at.not.is.null,status.in.(${allowedStatus.join(',')})`)
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (ownerErr) {
    return NextResponse.json({ error: ownerErr.message }, { status: 500 })
  }

  // pro job nur 1 Offer (das "relevante": neuestes paid/Status)
  const ownerOffers = (ownerOffersRaw as DbOffer[]) ?? []
  const ownerByJob = new Map<string, DbOffer>()
  for (const o of ownerOffers) {
    const jid = String(o.job_id)
    if (!ownerByJob.has(jid)) ownerByJob.set(jid, o)
  }

  // 2) Anbieter-Sicht (angenommen): bieter_id = uid
  const { data: bidderOffersRaw, error: bidderErr } = await supabase
    .from('job_offers')
    .select(baseSelect)
    .eq('bieter_id', uid)
    .or(`paid_at.not.is.null,status.in.(${allowedStatus.join(',')})`)
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (bidderErr) {
    return NextResponse.json({ error: bidderErr.message }, { status: 500 })
  }

  const bidderOffers = (bidderOffersRaw as DbOffer[]) ?? []

  // 3) Orders DTO bauen
  const orders: ApiOrder[] = []

  // vergeben (Kunde)
  for (const o of ownerByJob.values()) {
    const pay = computePayStatus(o)
    if (!pay) continue // extra safety (falls oben OR mal zuviel reinlässt)

    orders.push({
      jobId: String(o.job_id),
      offerId: o.id,
      vendor: buildVendorLabel(o.anbieter_snapshot),
      amountCents: safeNum(o.gesamt_cents),
      acceptedAt: o.paid_at || o.created_at || new Date().toISOString(),
      kind: 'vergeben',

      // Ablaufstatus erstmal default
      status: 'in_progress',

      // Zahlungsstatus sichtbar
      jobPayStatus: pay,
      paidAt: o.paid_at || undefined,
    })
  }

  // angenommen (Anbieter)
  for (const o of bidderOffers) {
    const pay = computePayStatus(o)
    if (!pay) continue

    orders.push({
      jobId: String(o.job_id),
      offerId: o.id,
      amountCents: safeNum(o.gesamt_cents),
      acceptedAt: o.paid_at || o.created_at || new Date().toISOString(),
      kind: 'angenommen',

      status: 'in_progress',

      offerPayStatus: pay,
      paidAt: o.paid_at || undefined,
    })
  }

  // 4) Jobs laden (für Karteninfos)
  const jobIds = Array.from(new Set(orders.map(o => String(o.jobId))))
  let jobs: ApiJob[] = []

  if (jobIds.length) {
    // ✅ Wichtig: select('*') damit es NICHT crasht wenn Spaltennamen bei dir anders sind.
    const { data: jobsRaw, error: jobsErr } = await supabase
      .from('jobs')
      .select('*')
      .in('id', jobIds)

    if (jobsErr) {
      return NextResponse.json({ error: jobsErr.message }, { status: 500 })
    }

    jobs = ((jobsRaw as any[]) ?? []).map(normalizeJob)
  }

  // 5) Nur Jobs zurückgeben, die wir auch wirklich anzeigen
  const jobSet = new Set(jobs.map(j => String(j.id)))
  const filteredOrders = orders.filter(o => jobSet.has(String(o.jobId)))

  return NextResponse.json({ jobs, orders: filteredOrders }, { status: 200 })
}
