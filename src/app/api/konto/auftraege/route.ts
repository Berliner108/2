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

  // FIX: status bleibt bei dir "paid" (nach Zahlung)
  status: string | null

  // Snapshot (optional)
  anbieter_snapshot: any | null

  // Payment-Felder
  paid_at: string | null
  paid_amount_cents: number | null
  refunded_amount_cents: number | null
  refunded_at: string | null
  currency: string | null
  payment_intent_id: string | null
  charge_id: string | null

  // NEU: Post-Paid Status
  fulfillment_status: 'in_progress' | 'reported' | 'disputed' | 'confirmed' | null
  delivered_reported_at: string | null
  delivered_confirmed_at: string | null
  dispute_opened_at: string | null
  dispute_reason: string | null

  payout_status: 'hold' | 'released' | 'partial_refund' | 'refunded' | null
  payout_released_at: string | null
}

type ApiOrder = {
  jobId: string
  offerId: string
  amountCents?: number
  acceptedAt: string
  kind: 'vergeben' | 'angenommen'

  // Ablaufstatus (kommt jetzt aus DB!)
  status: 'in_progress' | 'reported' | 'disputed' | 'confirmed'
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  disputeOpenedAt?: string
  disputeReason?: string | null

  // Payout/Refund sichtbar
  payoutStatus: 'hold' | 'released' | 'partial_refund' | 'refunded'
  payoutReleasedAt?: string
  refundedAmountCents?: number
  refundedAt?: string

  // Labels
  vendor?: string
  owner?: string

  // Payment refs (Debug)
  paidAt?: string
  currency?: string | null
  paymentIntentId?: string | null
  chargeId?: string | null

  // ✅ beidseitige Bewertung (aus reviews über order_id = job_offers.id)
  customerReviewed?: boolean // owner_id hat bewertet (Auftraggeber -> Anbieter)
  vendorReviewed?: boolean // bieter_id hat bewertet (Anbieter -> Auftraggeber)
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

function safeNum(v: any): number | undefined {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

function pick<T extends Record<string, any>>(obj: T, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k]
  }
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
    standort: row.standort ?? row.location?.city ?? row.ort ?? row.city ?? undefined,
    beschreibung: row.beschreibung ?? row.description ?? undefined,
    bilder: Array.isArray(bilder) ? bilder : undefined,
    warenausgabeDatum: warenausgabeDatum ?? null,
    lieferDatum: lieferDatum ?? null,
    warenannahmeDatum: warenannahmeDatum ?? null,
    user,
  }
}

function labelFromProfile(p: any): string {
  const u = String(p?.username ?? '').trim()
  const avg = typeof p?.rating_avg === 'number' ? p.rating_avg : Number(p?.rating_avg ?? 0) || 0
  const cnt = typeof p?.rating_count === 'number' ? p.rating_count : Number(p?.rating_count ?? 0) || 0
  if (!u) return '—'
  return cnt > 0 ? `${u} · ${avg.toFixed(1)}` : u
}

async function fetchReviewMapByOrderId(supabase: any, orderIds: string[]) {
  const map = new Map<string, Set<string>>() // order_id -> set(rater_id)
  if (!orderIds.length) return map

  const CHUNK = 200
  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const batch = orderIds.slice(i, i + CHUNK)

    const { data, error } = await supabase
      .from('reviews')
      .select('order_id, rater_id')
      .in('order_id', batch)

    if (error) {
      console.error('[GET /api/konto/auftraege] reviews db:', error)
      continue // kein Hard-Fail
    }

    for (const r of (data ?? []) as any[]) {
      const oid = String(r.order_id ?? '')
      const rid = String(r.rater_id ?? '')
      if (!oid || !rid) continue
      let set = map.get(oid)
      if (!set) {
        set = new Set<string>()
        map.set(oid, set)
      }
      set.add(rid)
    }
  }

  return map
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
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const uid = auth.user.id

  // ✅ Wichtig: NUR paid – alles "nach paid" kommt aus fulfillment_status/payout_status
  const baseSelect = `
    id,
    job_id,
    bieter_id,
    owner_id,
    gesamt_cents,
    created_at,
    status,
    anbieter_snapshot,
    paid_at,
    paid_amount_cents,
    currency,
    payment_intent_id,
    charge_id,
    refunded_amount_cents,
    refunded_at,

    fulfillment_status,
    delivered_reported_at,
    delivered_confirmed_at,
    dispute_opened_at,
    dispute_reason,

    payout_status,
    payout_released_at
  `

  const { data: rowsRaw, error: err } = await supabase
    .from('job_offers')
    .select(baseSelect)
    .eq('status', 'paid')
    .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (err) {
    console.error('[GET /api/konto/auftraege] db:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }

  const rows = ((rowsRaw as any[]) ?? []) as DbOffer[]

  // Counterparty Profiles laden (damit Labels stabil sind – statt nur Snapshot)
  const ids = new Set<string>()
  for (const r of rows) {
    ids.add(String(r.owner_id))
    ids.add(String(r.bieter_id))
  }

  const idList = Array.from(ids)
  const { data: profsRaw, error: pErr } = idList.length
    ? await supabase.from('profiles').select('id, username, rating_avg, rating_count').in('id', idList)
    : { data: [], error: null }

  if (pErr) {
    console.error('[GET /api/konto/auftraege] profiles db:', pErr)
    // kein Hard-Fail – Orders können trotzdem zurück
  }

  const profMap = new Map<string, any>()
  for (const p of (profsRaw ?? []) as any[]) profMap.set(String(p.id), p)

  // ✅ Reviews laden: order_id = job_offers.id
  const offerIds = rows.map(r => String(r.id))
  const reviewMap = await fetchReviewMapByOrderId(supabase, offerIds)

  // Orders bauen
  const orders: ApiOrder[] = []

  for (const o of rows) {
    const jobId = String(o.job_id)
    const offerId = String(o.id)

    const fulfillment = (o.fulfillment_status ?? 'in_progress') as ApiOrder['status']
    const payout = (o.payout_status ?? 'hold') as ApiOrder['payoutStatus']

    const ownerLabel = labelFromProfile(profMap.get(String(o.owner_id)))
    const vendorLabel = labelFromProfile(profMap.get(String(o.bieter_id)))

    const raters = reviewMap.get(offerId) ?? new Set<string>()
    const customerReviewed = raters.has(String(o.owner_id))
    const vendorReviewed = raters.has(String(o.bieter_id))

    // Owner-Sicht (vergeben)
    if (String(o.owner_id) === uid) {
      orders.push({
        jobId,
        offerId,
        amountCents: safeNum(o.gesamt_cents),
        acceptedAt: o.paid_at || o.created_at || new Date().toISOString(),
        kind: 'vergeben',

        status: fulfillment,
        deliveredReportedAt: o.delivered_reported_at || undefined,
        deliveredConfirmedAt: o.delivered_confirmed_at || undefined,
        disputeOpenedAt: o.dispute_opened_at || undefined,
        disputeReason: o.dispute_reason || null,

        payoutStatus: payout,
        payoutReleasedAt: o.payout_released_at || undefined,
        refundedAmountCents: safeNum(o.refunded_amount_cents) ?? 0,
        refundedAt: o.refunded_at || undefined,

        vendor: vendorLabel,

        paidAt: o.paid_at || undefined,
        currency: o.currency ?? null,
        paymentIntentId: o.payment_intent_id ?? null,
        chargeId: o.charge_id ?? null,

        customerReviewed,
        vendorReviewed,
      })
    }

    // Anbieter-Sicht (angenommen)
    if (String(o.bieter_id) === uid) {
      orders.push({
        jobId,
        offerId,
        amountCents: safeNum(o.gesamt_cents),
        acceptedAt: o.paid_at || o.created_at || new Date().toISOString(),
        kind: 'angenommen',

        status: fulfillment,
        deliveredReportedAt: o.delivered_reported_at || undefined,
        deliveredConfirmedAt: o.delivered_confirmed_at || undefined,
        disputeOpenedAt: o.dispute_opened_at || undefined,
        disputeReason: o.dispute_reason || null,

        payoutStatus: payout,
        payoutReleasedAt: o.payout_released_at || undefined,
        refundedAmountCents: safeNum(o.refunded_amount_cents) ?? 0,
        refundedAt: o.refunded_at || undefined,

        owner: ownerLabel,

        paidAt: o.paid_at || undefined,
        currency: o.currency ?? null,
        paymentIntentId: o.payment_intent_id ?? null,
        chargeId: o.charge_id ?? null,

        customerReviewed,
        vendorReviewed,
      })
    }
  }

  // Jobs laden (für Karteninfos)
  const jobIds = Array.from(new Set(orders.map(o => String(o.jobId))))
  let jobs: ApiJob[] = []

  if (jobIds.length) {
    const { data: jobsRaw, error: jobsErr } = await supabase
      .from('jobs')
      .select('*')
      .in('id', jobIds)

    if (jobsErr) {
      console.error('[GET /api/konto/auftraege] jobs db:', jobsErr)
      return NextResponse.json({ ok: false, error: jobsErr.message }, { status: 500 })
    }

    jobs = ((jobsRaw as any[]) ?? []).map(normalizeJob)
  }

  // safety: nur orders zurückgeben, deren job auch geladen wurde
  const jobSet = new Set(jobs.map(j => String(j.id)))
  const filteredOrders = orders.filter(o => jobSet.has(String(o.jobId)))

  return NextResponse.json({ ok: true, jobs, orders: filteredOrders }, { status: 200 })
}
