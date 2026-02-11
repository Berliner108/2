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

  status: string | null

  anbieter_snapshot: any | null

  paid_at: string | null
  paid_amount_cents: number | null
  refunded_amount_cents: number | null
  refunded_at: string | null
  currency: string | null
  payment_intent_id: string | null
  charge_id: string | null

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
type DbPayoutStatus = 'hold' | 'released' | 'partial_refund' | 'refunded'

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

  // Payment-Status (Filter in /konto/auftraege/page.tsx)
  jobPayStatus?: DbPayStatus
  offerPayStatus?: DbPayStatus

  // ✅ rollen-spezifischer payout_status für Buttons
  jobPayoutStatus?: DbPayoutStatus // kind='vergeben'
  offerPayoutStatus?: DbPayoutStatus // kind='angenommen'

  // (alte Felder bleiben drin)
  payoutStatus: DbPayoutStatus
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

  customerReviewed?: boolean
  vendorReviewed?: boolean
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
  return 'paid'
}

/**
 * Aus jobs.specs + verfahren_1/2 ein "verfahren[]"-Array bauen,
 * damit computeJobTitle() in deiner page.tsx wieder sauber arbeitet.
 *
 * specs keys: z.B. "v1__Pulverbeschichten__farbton": "7016"
 */
function buildVerfahrenFromJobRow(job: any): any[] {
  const names = new Set<string>()
  const v1 = String(job?.verfahren_1 ?? '').trim()
  const v2 = String(job?.verfahren_2 ?? '').trim()
  if (v1) names.add(v1)
  if (v2) names.add(v2)

  const specs = job?.specs && typeof job.specs === 'object' ? job.specs : {}
  const keyList = Object.keys(specs || {})
  for (const k of keyList) {
    const parts = k.split('__')
    // v1__Pulverbeschichten__farbton
    if (parts.length >= 3) {
      const proc = String(parts[1] ?? '').trim()
      if (proc) names.add(proc)
    }
  }

  const out: any[] = []
  for (const name of names) {
    const felder: Record<string, any> = {}
    for (const k of keyList) {
      const parts = k.split('__')
      if (parts.length >= 3 && String(parts[1]) === name) {
        const fieldKey = parts.slice(2).join('__') // alles nach dem Verfahren
        felder[fieldKey] = (specs as any)[k]
      }
    }
    out.push({ name, felder })
  }

  return out
}

function normalizeJob(row: any): ApiJob {
  const id = String(row.id)

  // jobs schema (dein create table):
  // description, material_guete, material_guete_custom,
  // liefer_datum_utc, rueck_datum_utc, specs, verfahren_1, verfahren_2
  const beschreibung = row.description ?? row.beschreibung ?? row.description_text ?? undefined
  const material = row.material_guete ?? row.material ?? undefined

  // Für deine UI-Logik:
  // warenannahmeDatum ~ liefer_datum_utc
  // warenausgabeDatum ~ rueck_datum_utc
  const warenannahmeDatum = row.liefer_datum_utc ?? row.warenannahmeDatum ?? null
  const warenausgabeDatum = row.rueck_datum_utc ?? row.warenausgabeDatum ?? null

  const verfahren = buildVerfahrenFromJobRow(row)

  return {
    id,
    verfahren,
    material,
    standort: row.standort ?? row.location?.city ?? row.city ?? undefined,
    beschreibung,
    bilder: Array.isArray(row.bilder) ? row.bilder : Array.isArray(row.images) ? row.images : undefined,
    warenannahmeDatum,
    warenausgabeDatum,
    lieferDatum: warenausgabeDatum ?? row.lieferDatum ?? null,
    user: row.user ?? row.owner_snapshot ?? row.owner ?? undefined,
  }
}

export async function GET(req: Request) {
  const cookieStore = await cookies()

  // User-Client (Auth + Reviews + Profiles)
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

  const url = new URL(req.url)
  const debug = url.searchParams.get('debug') === '1'

  const admin = supabaseAdmin()

  // --- DEBUG: Vergleich user-client vs admin (RLS Diagnose) ---
  if (debug) {
    const qPaidUser = await supabase
      .from('job_offers')
      .select('id, job_id, status, owner_id, bieter_id, paid_at', { count: 'exact' })
      .eq('status', 'paid')
      .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
      .order('paid_at', { ascending: false, nullsFirst: false })

    const qPaidAdmin = await admin
      .from('job_offers')
      .select('id, job_id, status, owner_id, bieter_id, paid_at', { count: 'exact' })
      .eq('status', 'paid')
      .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
      .order('paid_at', { ascending: false, nullsFirst: false })

    const qAnyUser = await supabase
      .from('job_offers')
      .select('id, job_id, status, owner_id, bieter_id, created_at', { count: 'exact' })
      .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    const qAnyAdmin = await admin
      .from('job_offers')
      .select('id, job_id, status, owner_id, bieter_id, created_at', { count: 'exact' })
      .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
      .order('created_at', { ascending: false })

    return NextResponse.json(
      {
        ok: true,
        uid,
        paid_user: {
          count: qPaidUser.count ?? null,
          error: qPaidUser.error?.message ?? null,
          sample: (qPaidUser.data ?? []).slice(0, 5),
        },
        paid_admin: {
          count: qPaidAdmin.count ?? null,
          error: qPaidAdmin.error?.message ?? null,
          sample: (qPaidAdmin.data ?? []).slice(0, 5),
        },
        any_user: {
          count: qAnyUser.count ?? null,
          error: qAnyUser.error?.message ?? null,
          sample: (qAnyUser.data ?? []).slice(0, 5),
        },
        any_admin: {
          count: qAnyAdmin.count ?? null,
          error: qAnyAdmin.error?.message ?? null,
          sample: (qAnyAdmin.data ?? []).slice(0, 5),
        },
      },
      { status: 200 }
    )
  }

  // --- PRODUKTIV: Admin query (damit es live NICHT an RLS scheitert) ---
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

  const { data: rowsRaw, error: err } = await admin
    .from('job_offers')
    .select(baseSelect)
    .eq('status', 'paid')
    .or(`owner_id.eq.${uid},bieter_id.eq.${uid}`)
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (err) {
    console.error('[GET /api/konto/auftraege] job_offers db:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }

  const rows = ((rowsRaw as any[]) ?? []) as DbOffer[]

  // Counterparty Profiles (weiterhin über user-client; ok)
  const ids = new Set<string>()
  for (const r of rows) {
    ids.add(String(r.owner_id))
    ids.add(String(r.bieter_id))
  }
  const idList = Array.from(ids)

  const { data: profsRaw, error: pErr } = idList.length
    ? await supabase.from('profiles').select('id, username, rating_avg, rating_count').in('id', idList)
    : { data: [], error: null }

  if (pErr) console.error('[GET /api/konto/auftraege] profiles db:', pErr)

  const profMap = new Map<string, any>()
  for (const p of (profsRaw ?? []) as any[]) profMap.set(String(p.id), p)

  // Reviews
  const offerIds = rows.map(r => String(r.id))
  const reviewMap = await fetchReviewMapByOrderId(supabase, offerIds)

  // Orders bauen
  const orders: ApiOrder[] = []
  for (const o of rows) {
    const jobId = String(o.job_id)
    const offerId = String(o.id)

    const fulfillment = (o.fulfillment_status ?? 'in_progress') as ApiOrder['status']
    const payout = (o.payout_status ?? 'hold') as DbPayoutStatus
    const payStatus = mapPayStatus(o)

    const ownerLabel = labelFromProfile(profMap.get(String(o.owner_id)))
    const vendorLabel = labelFromProfile(profMap.get(String(o.bieter_id)))

    const raters = reviewMap.get(offerId) ?? new Set<string>()
    const customerReviewed = raters.has(String(o.owner_id))
    const vendorReviewed = raters.has(String(o.bieter_id))

    const acceptedAt = o.paid_at || o.created_at || new Date().toISOString()

    // ✅ Auftraggeber-Sicht (vergeben)
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

        // ✅ NEU: für Buttons in page.tsx
        jobPayoutStatus: payout,

        // (alt bleibt)
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

    // ✅ Anbieter-Sicht (angenommen)
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

        // ✅ NEU: für Buttons in page.tsx
        offerPayoutStatus: payout,

        // (alt bleibt)
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

  // Jobs laden (Admin -> damit vendor auch sieht!)
  const jobIds = Array.from(new Set(orders.map(o => String(o.jobId))))
  let jobs: ApiJob[] = []

  if (jobIds.length) {
    const { data: jobsRaw, error: jobsErr } = await admin.from('jobs').select('*').in('id', jobIds)
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
