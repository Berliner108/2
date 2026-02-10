// /src/app/api/konto/auftraege/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DbOffer = {
  id: string
  job_id: string
  bieter_id: string
  owner_id: string

  gesamt_cents: number | null
  created_at: string | null

  // nach Zahlung: status = 'paid' (bei dir)
  status: string | null

  anbieter_snapshot: any | null

  // Payment-Felder
  paid_at: string | null
  paid_amount_cents: number | null
  refunded_amount_cents: number | null
  refunded_at: string | null
  currency: string | null
  payment_intent_id: string | null
  charge_id: string | null

  // Post-Paid Status
  fulfillment_status: 'in_progress' | 'reported' | 'disputed' | 'confirmed' | null
  delivered_reported_at: string | null
  delivered_confirmed_at: string | null
  dispute_opened_at: string | null
  dispute_reason: string | null

  payout_status: 'hold' | 'released' | 'partial_refund' | 'refunded' | null
  payout_released_at: string | null
}

/* ---------- Payment-Status fürs Frontend ---------- */
type DbPayStatus = 'paid' | 'released' | 'partially_refunded' | 'refunded' | 'disputed'

type ApiOrder = {
  jobId: string
  offerId: string
  amountCents?: number
  acceptedAt: string
  kind: 'vergeben' | 'angenommen'

  // Ablaufstatus
  status: 'in_progress' | 'reported' | 'disputed' | 'confirmed'
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  disputeOpenedAt?: string
  disputeReason?: string | null

  // Payment-Status (genau das erwartet dein /konto/auftraege/page.tsx Filter)
  jobPayStatus?: DbPayStatus // kind='vergeben'
  offerPayStatus?: DbPayStatus // kind='angenommen'

  // Zusatzinfos
  payoutStatus: 'hold' | 'released' | 'partial_refund' | 'refunded'
  payoutReleasedAt?: string
  refundedAmountCents?: number
  refundedAt?: string

  vendor?: string
  owner?: string

  paidAt?: string
  releasedAt?: string
  currency?: string | null
  paymentIntentId?: string | null
  chargeId?: string | null

  // Bewertungen
  customerReviewed?: boolean
  vendorReviewed?: boolean
}

type ApiJob = {
  id: string
  verfahren: { name: string; felder: Record<string, any> }[]
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

function pick(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k]
  }
  return undefined
}

/** Versucht, zu einem Verfahren die passenden Feldwerte aus jobs.specs zu holen. */
function pickProcedureFields(specs: any, procName: string): Record<string, any> {
  if (!specs || typeof specs !== 'object') return {}

  // Direkt unter dem Namen (z.B. specs["Pulverbeschichten"] = {...})
  const direct = specs[procName]
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct as Record<string, any>

  // Manchmal normalisiert (lowercase)
  const keyLc = procName.toLowerCase()
  const lc = specs[keyLc]
  if (lc && typeof lc === 'object' && !Array.isArray(lc)) return lc as Record<string, any>

  // Manche speichern unter specs.procedures / specs.verfahren / specs.processes
  const container =
    specs.procedures ||
    specs.verfahren ||
    specs.processes ||
    specs.specifications ||
    null

  if (container && typeof container === 'object') {
    const a = container[procName]
    if (a && typeof a === 'object' && !Array.isArray(a)) return a as Record<string, any>
    const b = container[keyLc]
    if (b && typeof b === 'object' && !Array.isArray(b)) return b as Record<string, any>
  }

  return {}
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

    const { data, error } = await supabase.from('reviews').select('order_id, rater_id').in('order_id', batch)
    if (error) {
      console.error('[GET /api/konto/auftraege] reviews db:', error)
      continue
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

/** payout_status + dispute -> Frontend Payment-Status */
function mapPayStatus(o: DbOffer): DbPayStatus {
  if (o.dispute_opened_at) return 'disputed'

  const ps = String(o.payout_status ?? 'hold')
  if (ps === 'released') return 'released'
  if (ps === 'partial_refund') return 'partially_refunded'
  if (ps === 'refunded') return 'refunded'

  // hold (default) = bezahlt, aber noch auf Hold
  return 'paid'
}

/** Mapping: dein echtes jobs-Schema -> ApiJob fürs Frontend */
function normalizeJobFromSchema(row: any, ownerProfile?: any): ApiJob {
  const id = String(row.id)

  // Verfahren: aus verfahren_1/2 (und Felder aus specs)
  const v1 = String(row.verfahren_1 ?? '').trim()
  const v2 = String(row.verfahren_2 ?? '').trim()
  const specs = row.specs ?? null

  const verfahren: { name: string; felder: Record<string, any> }[] = []
  if (v1) verfahren.push({ name: v1, felder: pickProcedureFields(specs, v1) })
  if (v2 && v2 !== v1) verfahren.push({ name: v2, felder: pickProcedureFields(specs, v2) })

  // Material: material_guete oder custom
  const material =
    (String(row.material_guete_custom ?? '').trim() || String(row.material_guete ?? '').trim() || undefined)

  // Standort: nicht als Spalte vorhanden -> best effort aus specs
  const standort =
    pick(specs, ['standort', 'ort', 'city', 'location']) ||
    pick(specs?.location, ['city', 'ort']) ||
    undefined

  // Beschreibung: jobs.description
  const beschreibung = (typeof row.description === 'string' ? row.description : undefined)

  // Termine:
  // liefer_datum_utc = Warenannahme (Kunde)
  // rueck_datum_utc  = Warenausgabe (Kunde)
  const warenannahmeDatum = row.liefer_datum_utc ? String(row.liefer_datum_utc) : null
  const warenausgabeDatum = row.rueck_datum_utc ? String(row.rueck_datum_utc) : null

  // Für dein Frontend ist lieferDatum nur Fallback – wir setzen es sinnvoll auf rueck_datum_utc
  const lieferDatum = warenausgabeDatum

  // Bilder: in deinem Schema sind nur counts drin.
  // Wenn du später job_files anbindest, kannst du hier echte URLs füllen.
  const bilder = undefined

  // user: damit getOwnerName(job) auf "angenommen" funktioniert
  const user = ownerProfile ?? undefined

  return {
    id,
    verfahren,
    material,
    standort,
    beschreibung,
    bilder,
    warenausgabeDatum,
    lieferDatum,
    warenannahmeDatum,
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
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const uid = auth.user.id

  // ✅ Paid + Folgestati: wir lassen status flexibler, damit es später nicht verschwindet
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
    .in('status', ['paid', 'released', 'refunded']) // robust für später (wenn du status weiterentwickelst)
    .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (err) {
    console.error('[GET /api/konto/auftraege] db:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }

  const rows = ((rowsRaw as any[]) ?? []) as DbOffer[]

  // Counterparty Profiles laden (Labels stabil)
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
    // kein Hard-Fail
  }

  const profMap = new Map<string, any>()
  for (const p of (profsRaw ?? []) as any[]) profMap.set(String(p.id), p)

  // Reviews: order_id = job_offers.id
  const offerIds = rows.map(r => String(r.id))
  const reviewMap = await fetchReviewMapByOrderId(supabase, offerIds)

  // Orders bauen
  const orders: ApiOrder[] = []

  for (const o of rows) {
    const jobId = String(o.job_id)
    const offerId = String(o.id)

    const fulfillment = (o.fulfillment_status ?? 'in_progress') as ApiOrder['status']
    const payout = (o.payout_status ?? 'hold') as ApiOrder['payoutStatus']
    const payStatus = mapPayStatus(o)

    const ownerLabel = labelFromProfile(profMap.get(String(o.owner_id)))
    const vendorLabel = labelFromProfile(profMap.get(String(o.bieter_id)))

    const raters = reviewMap.get(offerId) ?? new Set<string>()
    const customerReviewed = raters.has(String(o.owner_id))
    const vendorReviewed = raters.has(String(o.bieter_id))

    const acceptedAt = o.paid_at || o.created_at || new Date().toISOString()

    // Owner-Sicht (vergeben)
    if (String(o.owner_id) === uid) {
      orders.push({
        jobId,
        offerId,
        amountCents: safeNum(o.gesamt_cents),
        acceptedAt,
        kind: 'vergeben',

        status: fulfillment,
        deliveredReportedAt: o.delivered_reported_at || undefined,
        deliveredConfirmedAt: o.delivered_confirmed_at || undefined,
        disputeOpenedAt: o.dispute_opened_at || undefined,
        disputeReason: o.dispute_reason || null,

        jobPayStatus: payStatus,

        payoutStatus: payout,
        payoutReleasedAt: o.payout_released_at || undefined,
        refundedAmountCents: safeNum(o.refunded_amount_cents) ?? 0,
        refundedAt: o.refunded_at || undefined,

        vendor: vendorLabel,

        paidAt: o.paid_at || undefined,
        releasedAt: o.payout_released_at || undefined,
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
        acceptedAt,
        kind: 'angenommen',

        status: fulfillment,
        deliveredReportedAt: o.delivered_reported_at || undefined,
        deliveredConfirmedAt: o.delivered_confirmed_at || undefined,
        disputeOpenedAt: o.dispute_opened_at || undefined,
        disputeReason: o.dispute_reason || null,

        offerPayStatus: payStatus,

        payoutStatus: payout,
        payoutReleasedAt: o.payout_released_at || undefined,
        refundedAmountCents: safeNum(o.refunded_amount_cents) ?? 0,
        refundedAt: o.refunded_at || undefined,

        owner: ownerLabel,

        paidAt: o.paid_at || undefined,
        releasedAt: o.payout_released_at || undefined,
        currency: o.currency ?? null,
        paymentIntentId: o.payment_intent_id ?? null,
        chargeId: o.charge_id ?? null,

        customerReviewed,
        vendorReviewed,
      })
    }
  }

  // Jobs laden (für Karteninfos) — ✅ Service Role, damit RLS nicht alles wegfiltert
  const jobIds = Array.from(new Set(orders.map(o => String(o.jobId))))
  let jobs: ApiJob[] = []

  if (jobIds.length) {
    const admin = supabaseAdmin()

    // Schlankes Select: nur was wir fürs Mapping wirklich brauchen
    const { data: jobsRaw, error: jobsErr } = await admin
      .from('jobs')
      .select(
        [
          'id',
          'user_id',
          'description',
          'material_guete',
          'material_guete_custom',
          'liefer_datum_utc',
          'rueck_datum_utc',
          'specs',
          'verfahren_1',
          'verfahren_2',
        ].join(', ')
      )
      .in('id', jobIds)

    if (jobsErr) {
      console.error('[GET /api/konto/auftraege] jobs db:', jobsErr)
      return NextResponse.json({ ok: false, error: jobsErr.message }, { status: 500 })
    }

    // Owner-Profile für getOwnerName(job) (bei "angenommen" braucht UI Auftraggeber)
    jobs = ((jobsRaw as any[]) ?? []).map(row => {
      const ownerProfile = profMap.get(String(row.user_id))
      return normalizeJobFromSchema(row, ownerProfile)
    })
  }

  // safety: nur orders zurückgeben, deren job auch geladen wurde
  const jobSet = new Set(jobs.map(j => String(j.id)))
  const filteredOrders = orders.filter(o => jobSet.has(String(o.jobId)))

  return NextResponse.json({ ok: true, jobs, orders: filteredOrders }, { status: 200 })
}
