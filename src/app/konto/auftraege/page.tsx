// src/app/konto/auftraege/page.tsx
'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './auftraege.module.css'
import Navbar from '../../components/navbar/Navbar'

type Verfahren = { name: string; felder: Record<string, any> }
type Job = {
  id: number | string
  verfahren: Verfahren[]
  material?: string
  standort?: string
  beschreibung?: string
  bilder?: string[]
  warenausgabeDatum?: Date | string
  lieferDatum?: Date | string
  warenannahmeDatum?: Date | string
  user?: any
}

/* ---------- Ablaufstatus (DB) ---------- */
type OrderStatus = 'in_progress' | 'reported' | 'disputed' | 'confirmed'
type OrderKind = 'vergeben' | 'angenommen'

type Order = {
  jobId: string | number
  offerId?: string

  // ✅ beide Seiten (API liefert beides je nach kind)
  vendor?: string
  owner?: string

  amountCents?: number
  artikelCents?: number
  versandCents?: number
  gesamtCents?: number

  acceptedAt: string // ISO
  kind: OrderKind

  status?: OrderStatus
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  autoReleaseAt?: string
  disputeOpenedAt?: string
  disputeReason?: string | null

  deliveredAt?: string // legacy (fallback)
}

/* ---------- Payment-Status (DB) getrennt vom Ablauf-Status ---------- */
type DbPayStatus = 'paid' | 'released' | 'partially_refunded' | 'refunded' | 'disputed'

// ✅ Backend: 'hold' | 'released' | 'partial_refund' | 'refunded' | 'transferred'
type DbPayoutStatus = 'hold' | 'released' | 'partial_refund' | 'refunded' | 'transferred'

/* ✅ NEU: Datenblock für Auftraggeber (nur in "angenommen") */
type PartyProfile = {
  firstName: string
  lastName: string
  address: {
    street: string
    houseNumber: string
    zip: string
    city: string
    country: string
  }
  companyName?: string
  vatNumber?: string
}

type DbOrder = Order & {
  jobPayStatus?: DbPayStatus // kind='vergeben'
  offerPayStatus?: DbPayStatus // kind='angenommen'
  paidAt?: string
  releasedAt?: string

  // ✅ beidseitige Bewertung
  customerReviewed?: boolean // Auftraggeber -> Anbieter
  vendorReviewed?: boolean // Anbieter -> Auftraggeber

  // ✅ wichtig für Refund/Release-Buttons
  payoutStatus?: DbPayoutStatus

  // ✅ NEU: Transfer-ID (falls API sie liefert)
  payout_transfer_id?: string | null
  payoutTransferId?: string | null

  // ✅ NEU aus API: Handles fürs sichere Verlinken
  vendor_handle?: string | null // kind='vergeben'
  owner_handle?: string | null // kind='angenommen'

  // ✅ NEU aus API: Ratings aus profiles (genau diese Felder!)
  vendor_rating_avg?: number | null
  vendor_rating_count?: number | null
  owner_rating_avg?: number | null
  owner_rating_count?: number | null

  anbieterSnapshot?: any | null

  // ✅ NEU aus API (Route): nur relevant für "angenommen"
  owner_profile?: PartyProfile | null
}

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type StatusKey = 'wartet' | 'aktiv' | 'fertig'
type FilterKey = 'alle' | StatusKey

// ✅ NUR EINMAL
type ReviewRole = 'customer_to_vendor' | 'vendor_to_customer'

/* ---------- Persist Keys & Defaults (nur UI) ---------- */
const TOP_KEY = 'auftraegeTop'
const LS_PS_V = 'orders:ps:v'
const LS_PS_A = 'orders:ps:a'
const LS_PAGE_V = 'orders:page:v'
const LS_PAGE_A = 'orders:page:a'

const DEFAULTS = {
  q: '',
  sort: 'date_desc' as SortKey,
  status: 'alle' as FilterKey,
  tab: 'vergeben' as OrderKind,
  psV: 10,
  psA: 10,
  pageV: 1,
  pageA: 1,
}
const ALLOWED_PS = [2, 10, 20, 50]

/* ---------- Hooks ---------- */
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/* ---------------- Helpers ---------------- */
function asDateLike(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return new Date(v.getTime())
  const d = new Date(v as any)
  return isNaN(+d) ? undefined : d
}

const formatEUR = (c?: number) =>
  typeof c === 'number'
    ? (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
    : '—'

const formatDate = (d?: Date) =>
  d ? new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) : '—'

// ✅ exakt: "4.7/5 · 12" oder "keine Bewertungen"
function ratingTxt(avg?: number | null, cnt?: number | null): string {
  const a = typeof avg === 'number' ? avg : Number(avg)
  const c = typeof cnt === 'number' ? cnt : Number(cnt)
  if (Number.isFinite(a) && Number.isFinite(c) && c > 0) return `${a.toFixed(1)}/5 · ${c}`
  return 'keine Bewertungen'
}

function computeJobTitle(job: Job): string {
  const procs = (job.verfahren ?? [])
    .map(v => v.name)
    .filter(Boolean)
    .join(' & ')
  const pb = (job.verfahren ?? []).find(v => /pulver/i.test(v.name))?.felder ?? {}
  const farbe = (pb as any)?.farbbezeichnung || (pb as any)?.farbton
  const extras = [farbe, job.material, job.standort].filter(Boolean).join(' · ')
  let title = [procs, extras].filter(Boolean).join(' — ')
  if (!title) {
    title = job.beschreibung?.trim()?.slice(0, 60) || `Auftrag #${job.id}`
    if (job.beschreibung && job.beschreibung.length > 60) title += '…'
  }
  return title
}

function getOwnerName(job: Job): string {
  const j: any = job
  if (typeof j.user === 'string' && j.user.trim()) return j.user.trim()
  if (j.user && typeof j.user === 'object') {
    const name = j.user.name || j.user.username || j.user.displayName || j.user.firma || j.user.company
    if (name) return String(name)
  }
  const candidates = [
    j.userName,
    j.username,
    j.name,
    j.kunde,
    j.kundenname,
    j.auftraggeber,
    j.auftraggeberName,
    j.owner,
    j.ownerName,
    j.company,
    j.firma,
    j.betrieb,
    j.kontakt?.name,
    j.kontakt?.firma,
    j.ersteller?.name,
    j.ersteller?.username,
  ]
  for (const c of candidates) if (typeof c === 'string' && c.trim()) return c.trim()
  return '—'
}

/** „Produktionsstatus“ aus Terminen */
function computeStatus(job: Job): { key: StatusKey; label: 'Anlieferung geplant' | 'In Bearbeitung' | 'Abholbereit/Versandt' } {
  const now = Date.now()
  const annahme = asDateLike(job.warenannahmeDatum)
  const ausgabe = asDateLike(job.warenausgabeDatum ?? job.lieferDatum)
  if (annahme && now < +annahme) return { key: 'wartet', label: 'Anlieferung geplant' }
  if (ausgabe && now < +ausgabe) return { key: 'aktiv', label: 'In Bearbeitung' }
  if (ausgabe && now >= +ausgabe) return { key: 'fertig', label: 'Abholbereit/Versandt' }
  return { key: 'aktiv', label: 'In Bearbeitung' }
}

/** darf „Auftrag abgeschlossen“ klicken? → erst NACH Warenausgabe(Kunde) */
function canConfirmDelivered(job?: Job): { ok: boolean; reason: string } {
  const ausgabe = job && asDateLike(job.warenausgabeDatum ?? job.lieferDatum)
  if (!ausgabe) return { ok: false, reason: 'Kein Warenausgabe-Datum hinterlegt' }
  if (Date.now() < +ausgabe) return { ok: false, reason: `Verfügbar ab ${formatDate(ausgabe)}` }
  return { ok: true, reason: '' }
}

/** Für Filterung „wartet/aktiv/fertig“ (reported/disputed/confirmed => „fertig“) */
function getStatusKeyFor(order: Order, job: Job): StatusKey {
  if (order.status === 'reported' || order.status === 'disputed' || order.status === 'confirmed') return 'fertig'
  if (order.deliveredAt) return 'fertig'
  return computeStatus(job).key
}

function notifyNavbarCount(count: number) {
  try {
    window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { key: 'orders', count } }))
  } catch {}
}

function paymentLabel(order: DbOrder): string {
  const s = order.kind === 'vergeben' ? order.jobPayStatus : order.offerPayStatus
  if (!s) return '—'
  if (s === 'paid') return 'Bezahlt'
  if (s === 'released') return 'Freigegeben'
  if (s === 'refunded') return 'Rückerstattet'
  if (s === 'partially_refunded') return 'Teilweise rückerstattet'
  if (s === 'disputed') return 'In Klärung'
  return String(s)
}

function clampStars(v: any): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(1, Math.min(5, Math.round(n)))
}

/** payoutStatus ableiten (Fallback, falls API es noch nicht liefert) */
function getPayoutStatus(order: DbOrder): DbPayoutStatus | undefined {
  if (order.payoutStatus) return order.payoutStatus
  const pay = order.kind === 'vergeben' ? order.jobPayStatus : order.offerPayStatus
  if (pay === 'released') return 'released'
  if (pay === 'refunded') return 'refunded'
  if (pay === 'partially_refunded') return 'partial_refund'
  if (pay === 'paid') return 'hold'
  return undefined
}

function getPayoutTransferId(order: DbOrder): string | null {
  const a = (order as any).payout_transfer_id
  const b = (order as any).payoutTransferId
  const v = typeof a === 'string' && a.trim() ? a.trim() : typeof b === 'string' && b.trim() ? b.trim() : ''
  return v || null
}

function canVendorAutoReleaseNow(order: DbOrder): { ok: boolean; unlockAtIso: string | null } {
  const unlockAt = asDateLike(order.autoReleaseAt)
  if (!unlockAt) return { ok: false, unlockAtIso: null }
  return { ok: Date.now() >= +unlockAt, unlockAtIso: unlockAt.toISOString() }
}

function isBuyerWindowOpen(order: DbOrder): { ok: boolean; untilIso: string | null } {
  const until = asDateLike(order.autoReleaseAt)
  if (!until) return { ok: true, untilIso: null } // wenn API's autoReleaseAt fehlt: Buyer darf (sicherer Default)
  return { ok: Date.now() < +until, untilIso: until.toISOString() }
}

/* ============ Pagination-UI (wie auf den anderen Seiten) ============ */
const Pagination: FC<{
  page: number
  setPage: (p: number) => void
  pageSize: number
  setPageSize: (n: number) => void
  total: number
  from: number
  to: number
  idPrefix: string
}> = ({ page, setPage, pageSize, setPageSize, total, from, to, idPrefix }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className={styles.pagination} aria-label="Seitensteuerung">
      <div className={styles.pageInfo} id={`${idPrefix}-info`} aria-live="polite">
        {total === 0 ? (
          'Keine Einträge'
        ) : (
          <>
            Zeige <strong>{from}</strong>–<strong>{to}</strong> von <strong>{total}</strong>
          </>
        )}
      </div>
      <div className={styles.pagiControls}>
        <label className={styles.pageSizeLabel} htmlFor={`${idPrefix}-ps`}>
          Pro Seite:
        </label>
        <select
          id={`${idPrefix}-ps`}
          className={styles.pageSize}
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
        >
          <option value={2}>2</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <div className={styles.pageButtons}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(1)}
            disabled={page <= 1}
            aria-label="Erste Seite"
          >
            «
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Vorherige Seite"
          >
            ‹
          </button>
          <span className={styles.pageNow} aria-live="polite">
            Seite {page} / {pages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            aria-label="Nächste Seite"
          >
            ›
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(pages)}
            disabled={page >= pages}
            aria-label="Letzte Seite"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Slice Helper ---------- */
type Slice<T> = {
  pageItems: T[]
  from: number
  to: number
  total: number
  safePage: number
  pages: number
}
function sliceByPage<T>(arr: T[], page: number, ps: number): Slice<T> {
  const total = arr.length
  const pages = Math.max(1, Math.ceil(total / ps))
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * ps
  const end = Math.min(start + ps, total)
  return {
    pageItems: arr.slice(start, end),
    from: total === 0 ? 0 : start + 1,
    to: end,
    total,
    safePage,
    pages,
  }
}

/* ---------------- Handles / Contact Helpers ---------------- */
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,30}[A-Za-z0-9])?$/
const asHandleOrNull = (v?: unknown) => {
  const s = typeof v === 'string' ? v.trim() : ''
  return HANDLE_RE.test(s) ? s : null
}
function cleanDisplayName(s: string) {
  return s.split('·')[0].trim()
}

function getContactForOrder(order: DbOrder, job: Job) {
  const o: any = order
  const j: any = job

  if (order.kind === 'vergeben') {
    const handle =
      asHandleOrNull(o.vendor_handle) ||
      asHandleOrNull(o.vendorHandle) ||
      asHandleOrNull(o.vendor_username) ||
      asHandleOrNull(o.vendorUsername) ||
      null

    const name = cleanDisplayName(String(order.vendor ?? 'Dienstleister'))
    return { name, handle }
  } else {
    const handle =
      asHandleOrNull(o.owner_handle) ||
      asHandleOrNull(o.ownerHandle) ||
      asHandleOrNull(j.user?.handle) ||
      asHandleOrNull(j.user?.username) ||
      null

    const name = cleanDisplayName(String(order.owner ?? getOwnerName(job) ?? 'Auftraggeber'))
    return { name, handle }
  }
}

/* ---------------- Component ---------------- */
const AuftraegePage: FC = () => {
  const router = useRouter()

  const [orders, setOrders] = useState<DbOrder[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const [busyKey, setBusyKey] = useState<string | null>(null)

  const jobsById = useMemo(() => {
    const m = new Map<string, Job>()
    for (const j of jobs) m.set(String(j.id), j)
    return m
  }, [jobs])

  const [topSection, setTopSection] = useState<OrderKind>('vergeben')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [statusFilter, setStatusFilter] = useState<FilterKey>('alle')

  const [pageV, setPageV] = useState(1)
  const [psV, setPsV] = useState<number>(10)
  const [pageA, setPageA] = useState(1)
  const [psA, setPsA] = useState<number>(10)

  const [confirmJobId, setConfirmJobId] = useState<string | number | null>(null)

  const [reviewJobId, setReviewJobId] = useState<string | number | null>(null)
  const [reviewRole, setReviewRole] = useState<ReviewRole>('customer_to_vendor')
  const [rating, setRating] = useState(5)
  const [ratingText, setRatingText] = useState('')
  const [reviewErr, setReviewErr] = useState<string | null>(null)

  useEffect(() => {
    if (confirmJobId == null && reviewJobId == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmJobId(null)
        setReviewJobId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmJobId, reviewJobId])

  async function loadOrders() {
    setLoading(true)
    try {
      const res = await fetch('/api/konto/auftraege', { credentials: 'include' })
      const j = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(j?.error || 'load_failed')

      const nextJobs: Job[] = Array.isArray(j?.jobs) ? j.jobs : []
      const nextOrders: DbOrder[] = Array.isArray(j?.orders) ? j.orders : []

      const allowed = new Set<DbPayStatus>(['paid', 'released', 'partially_refunded', 'refunded', 'disputed'])
      const filtered = nextOrders.filter(o => {
        const s = o.kind === 'vergeben' ? o.jobPayStatus : o.offerPayStatus
        return !!s && allowed.has(s)
      })

      setJobs(nextJobs)
      setOrders(filtered)
      notifyNavbarCount(filtered.length)
    } catch (e) {
      console.error(e)
      setJobs([])
      setOrders([])
      notifyNavbarCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await loadOrders()
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOP_KEY)
      if (saved === 'vergeben' || saved === 'angenommen') setTopSection(saved as OrderKind)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(TOP_KEY, topSection)
    } catch {}
  }, [topSection])

  const allVergeben = useMemo(
    () =>
      orders
        .filter(o => o.kind === 'vergeben')
        .map(o => ({ order: o, job: jobsById.get(String(o.jobId)) }))
        .filter(x => !!x.job) as { order: DbOrder; job: Job }[],
    [orders, jobsById]
  )

  const allAngenommen = useMemo(
    () =>
      orders
        .filter(o => o.kind === 'angenommen')
        .map(o => ({ order: o, job: jobsById.get(String(o.jobId)) }))
        .filter(x => !!x.job) as { order: DbOrder; job: Job }[],
    [orders, jobsById]
  )

  const applySearchAndFilter = (items: { order: DbOrder; job: Job }[], qStr: string) => {
    const q = qStr.trim().toLowerCase()
    return items.filter(({ order, job }) => {
      if (statusFilter !== 'alle') {
        const key = getStatusKeyFor(order, job)
        if (key !== statusFilter) return false
      }
      if (!q) return true
      const title = computeJobTitle(job).toLowerCase()
      const partyName = order.kind === 'vergeben' ? (order.vendor || '') : (order.owner || getOwnerName(job))
      return (
        String(order.jobId).toLowerCase().includes(q) ||
        title.includes(q) ||
        String(partyName).toLowerCase().includes(q)
      )
    })
  }

  const applySort = (items: { order: DbOrder; job: Job }[]) => {
    return [...items].sort((a, b) => {
      if (sort === 'date_desc') return +new Date(b.order.acceptedAt) - +new Date(a.order.acceptedAt)
      if (sort === 'date_asc') return +new Date(a.order.acceptedAt) - +new Date(b.order.acceptedAt)
      const aPrice = a.order.gesamtCents ?? a.order.amountCents ?? 0
      const bPrice = b.order.gesamtCents ?? b.order.amountCents ?? 0
      if (sort === 'price_desc') return bPrice - aPrice
      if (sort === 'price_asc') return aPrice - bPrice
      return 0
    })
  }

  const filteredSortedV = useMemo(() => applySort(applySearchAndFilter(allVergeben, debouncedQuery)), [
    allVergeben,
    debouncedQuery,
    sort,
    statusFilter,
  ])
  const filteredSortedA = useMemo(() => applySort(applySearchAndFilter(allAngenommen, debouncedQuery)), [
    allAngenommen,
    debouncedQuery,
    sort,
    statusFilter,
  ])

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)

      const q = p.get('q')
      if (q !== null) setQuery(q)

      const srt = p.get('sort') as SortKey | null
      if (srt && ['date_desc', 'date_asc', 'price_desc', 'price_asc'].includes(srt)) setSort(srt)

      const st = p.get('status') as FilterKey | null
      if (st && ['alle', 'wartet', 'aktiv', 'fertig'].includes(st)) setStatusFilter(st)

      const tab = p.get('tab') as OrderKind | null
      if (tab && (tab === 'vergeben' || tab === 'angenommen')) setTopSection(tab)

      const lPsV = Number(localStorage.getItem(LS_PS_V)) || DEFAULTS.psV
      const lPsA = Number(localStorage.getItem(LS_PS_A)) || DEFAULTS.psA
      const uPsV = Number(p.get('psV'))
      const uPsA = Number(p.get('psA'))
      setPsV(ALLOWED_PS.includes(uPsV) ? uPsV : ALLOWED_PS.includes(lPsV) ? lPsV : DEFAULTS.psV)
      setPsA(ALLOWED_PS.includes(uPsA) ? uPsA : ALLOWED_PS.includes(lPsA) ? lPsA : DEFAULTS.psA)

      const lPageV = Number(localStorage.getItem(LS_PAGE_V)) || DEFAULTS.pageV
      const lPageA = Number(localStorage.getItem(LS_PAGE_A)) || DEFAULTS.pageA
      const uPageV = Number(p.get('pageV')) || undefined
      const uPageA = Number(p.get('pageA')) || undefined
      setPageV(uPageV && uPageV > 0 ? uPageV : lPageV > 0 ? lPageV : DEFAULTS.pageV)
      setPageA(uPageA && uPageA > 0 ? uPageA : lPageA > 0 ? lPageA : DEFAULTS.pageA)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_PS_V, String(psV))
    } catch {}
  }, [psV])
  useEffect(() => {
    try {
      localStorage.setItem(LS_PS_A, String(psA))
    } catch {}
  }, [psA])
  useEffect(() => {
    try {
      localStorage.setItem(LS_PAGE_V, String(pageV))
    } catch {}
  }, [pageV])
  useEffect(() => {
    try {
      localStorage.setItem(LS_PAGE_A, String(pageA))
    } catch {}
  }, [pageA])

  useEffect(() => {
    setPageV(1)
    setPageA(1)
  }, [debouncedQuery, sort, statusFilter])

  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (debouncedQuery !== DEFAULTS.q) p.set('q', debouncedQuery)
      if (sort !== DEFAULTS.sort) p.set('sort', sort)
      if (statusFilter !== DEFAULTS.status) p.set('status', statusFilter)
      if (topSection !== DEFAULTS.tab) p.set('tab', topSection)
      if (psV !== DEFAULTS.psV) p.set('psV', String(psV))
      if (psA !== DEFAULTS.psA) p.set('psA', String(psA))
      if (pageV !== DEFAULTS.pageV) p.set('pageV', String(pageV))
      if (pageA !== DEFAULTS.pageA) p.set('pageA', String(pageA))

      const qs = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`
      if (next !== curr) router.replace(next, { scroll: false })
    } catch {}
  }, [debouncedQuery, sort, statusFilter, topSection, psV, psA, pageV, pageA, router])

  const sliceV = sliceByPage(filteredSortedV, pageV, psV)
  useEffect(() => {
    if (sliceV.safePage !== pageV) setPageV(sliceV.safePage)
  }, [sliceV.safePage, pageV])

  const sliceA = sliceByPage(filteredSortedA, pageA, psA)
  useEffect(() => {
    if (sliceA.safePage !== pageA) setPageA(sliceA.safePage)
  }, [sliceA.safePage, pageA])

  /* ---------- Actions (Server) ---------- */
  async function postJson(url: string, body: any) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(j?.error || 'request_failed')
    return j
  }

  async function reportDelivered(jobId: string | number) {
    const key = `report:${jobId}`
    setBusyKey(key)
    try {
      await postJson('/api/konto/auftraege/report-delivered', { jobId })
      await loadOrders()
    } catch (e) {
      console.error(e)
      alert('Konnte Zustellung nicht melden.')
    } finally {
      setBusyKey(null)
    }
  }

  async function openDispute(jobId: string | number) {
    const reason = window.prompt('Problem melden (optional):') || ''
    const key = `dispute:${jobId}`
    setBusyKey(key)
    try {
      await postJson('/api/konto/auftraege/open-dispute', { jobId, reason: reason.trim().slice(0, 800) })
      await loadOrders()
    } catch (e) {
      console.error(e)
      alert('Konnte Reklamation nicht eröffnen.')
    } finally {
      setBusyKey(null)
    }
  }

  async function triggerRefund(jobId: string | number) {
    const key = `refund:${jobId}`
    setBusyKey(key)
    try {
      const reason = window.prompt('Grund (optional):') || ''
      const ok = window.confirm('Refund wirklich auslösen? (geht zurück auf die Zahlungsmethode des Käufers)')
      if (!ok) return
      await postJson(`/api/jobs/${encodeURIComponent(String(jobId))}/refund`, { reason: reason.trim().slice(0, 800) })
      await loadOrders()
    } catch (e) {
      console.error(e)
      alert('Refund fehlgeschlagen.')
    } finally {
      setBusyKey(null)
    }
  }

  async function triggerRelease(jobId: string | number) {
    const key = `release:${jobId}`
    setBusyKey(key)
    try {
      const ok = window.confirm('Auszahlung wirklich freigeben? (danach kein Refund mehr möglich)')
      if (!ok) return
      await postJson(`/api/jobs/${encodeURIComponent(String(jobId))}/release`, {})
      await loadOrders()
    } catch (e) {
      console.error(e)
      alert('Auszahlung fehlgeschlagen.')
    } finally {
      setBusyKey(null)
    }
  }

  function openReviewModal(jobId: string | number, role: ReviewRole) {
    setReviewErr(null)
    setReviewJobId(jobId)
    setReviewRole(role)
    setRating(5)
    setRatingText('')
  }

  async function submitReview() {
    const jobId = reviewJobId
    if (jobId == null) return

    const stars = clampStars(rating)
    const comment = typeof ratingText === 'string' ? ratingText.trim().slice(0, 800) : ''

    if (!stars) {
      setReviewErr('Bitte 1–5 Sterne wählen.')
      return
    }
    if (!comment) {
      setReviewErr('Kommentar ist Pflicht.')
      return
    }

    const key = `review:${jobId}:${reviewRole}`
    setBusyKey(key)
    setReviewErr(null)

    try {
      await postJson(`/api/konto/auftraege/review/${encodeURIComponent(String(jobId))}`, {
        role: reviewRole,
        stars,
        comment,
      })

      setReviewJobId(null)
      await loadOrders()
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (
        msg.toLowerCase().includes('bereits bewertet') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('unique')
      ) {
        setReviewJobId(null)
        await loadOrders()
        return
      }

      console.error(e)
      setReviewErr(String(e?.message || 'Bewertung fehlgeschlagen.'))
    } finally {
      setBusyKey(null)
    }
  }

  /* ---------------- Section Renderer ---------------- */
  const SectionList: FC<{
    kind: OrderKind
    slice: Slice<{ order: DbOrder; job: Job }>
    idPrefix: string
  }> = ({ slice, idPrefix }) => (
    <>
      <ul className={styles.list}>
        {slice.pageItems.map(({ order, job }) => {
          const j = job as Job
          const prodStatus = computeStatus(j)

          const display =
            order.status === 'confirmed'
              ? { key: 'fertig' as StatusKey, label: 'Geliefert (bestätigt)' as const }
              : order.status === 'disputed'
                ? { key: 'fertig' as StatusKey, label: 'Reklamation offen' as const }
                : order.status === 'reported'
                  ? { key: 'fertig' as StatusKey, label: 'Zustellung gemeldet' as const }
                  : prodStatus

          // ✅ richtig zuordnen:
          const annahme = asDateLike(j.warenannahmeDatum) // Warenannahme
          const ausgabe = asDateLike(j.warenausgabeDatum ?? j.lieferDatum) // Warenausgabe/Versand

          const contactLabel = order.kind === 'vergeben' ? 'Dienstleister' : 'Auftraggeber'
          const contact = getContactForOrder(order, j)

          const { ok: canClick, reason } = canConfirmDelivered(j)

          const isVendor = order.kind === 'angenommen'
          const isCustomer = order.kind === 'vergeben'

          const isBusy =
            busyKey === `report:${order.jobId}` ||
            busyKey === `dispute:${order.jobId}` ||
            busyKey === `refund:${order.jobId}` ||
            busyKey === `release:${order.jobId}` ||
            busyKey?.startsWith(`review:${order.jobId}:`) ||
            false

          const canVendorReport =
            isVendor &&
            (order.status ?? 'in_progress') === 'in_progress' &&
            (order.offerPayStatus === 'paid' || order.offerPayStatus === 'released')

          const canCustomerReview =
            isCustomer &&
            order.status === 'confirmed' &&
            (order.jobPayStatus === 'paid' || order.jobPayStatus === 'released') &&
            !order.customerReviewed

          const canVendorReview =
            isVendor &&
            order.status === 'confirmed' &&
            (order.offerPayStatus === 'paid' || order.offerPayStatus === 'released') &&
            !order.vendorReviewed

          const payout = getPayoutStatus(order)
          const transferId = getPayoutTransferId(order)

          // --- Zeitfenster ---
          const ar = canVendorAutoReleaseNow(order)
          const buyerWin = isBuyerWindowOpen(order)

          // Buyer: darf release/refund sobald bezahlt, aber nur bis autoReleaseAt, solange hold + kein Transfer
          const canCustomerDecide =
            isCustomer && order.jobPayStatus === 'paid' && payout === 'hold' && !transferId && buyerWin.ok

          const canCustomerRelease = canCustomerDecide
          const canCustomerRefund = canCustomerDecide

          // Vendor: nach autoReleaseAt selbst releasen (nur wenn noch hold + kein Transfer)
          const canVendorRelease = isVendor && order.offerPayStatus === 'paid' && payout === 'hold' && !transferId && ar.ok

          // ✅ Rating genau aus API-Feldern
          const avg = order.kind === 'vergeben' ? order.vendor_rating_avg : order.owner_rating_avg
          const cnt = order.kind === 'vergeben' ? order.vendor_rating_count : order.owner_rating_count

          return (
            <li key={`${order.kind}-${order.jobId}-${order.offerId ?? 'x'}`} className={styles.card} aria-busy={isBusy}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Link href={`/auftragsboerse/auftraege/${j.id}`} className={styles.titleLink}>
                    {computeJobTitle(j)}
                  </Link>
                </div>

                <span
                  className={[
                    styles.statusBadge,
                    display.label === 'In Bearbeitung' ? styles.statusActive : '',
                    display.label === 'Anlieferung geplant' ? styles.statusPending : '',
                    display.label === 'Abholbereit/Versandt' ? styles.statusDone : '',
                    display.label === 'Zustellung gemeldet' ? styles.statusPending : '',
                    display.label === 'Reklamation offen' ? styles.statusPending : '',
                    display.label === 'Geliefert (bestätigt)' ? styles.statusDone : '',
                  ]
                    .join(' ')
                    .trim()}
                >
                  {display.label}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  alignItems: 'start',
                }}
              >
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>{contactLabel}</div>
                  <div className={styles.metaValue}>
                    {contact.handle ? (
                      <>
                        <Link href={`/u/${contact.handle}/reviews`} className={styles.titleLink}>
                          <span className={styles.vendor}>{contact.name}</span>
                        </Link>
                        <span className={styles.vendorRatingSmall}> · {ratingTxt(avg, cnt)}</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.vendor}>{contact.name}</span>
                        <span className={styles.vendorRatingSmall}> · {ratingTxt(avg, cnt)}</span>
                      </>
                    )}

                    {/* ✅ NUR für "angenommen": echte Daten aus owner_profile */}
                    {order.kind === 'angenommen' && order.owner_profile ? (
                      <div className={styles.vendorSnapshot}>
                        {order.owner_profile.companyName ? <div>{order.owner_profile.companyName}</div> : null}

                        {(() => {
                          const full = [order.owner_profile?.firstName, order.owner_profile?.lastName]
                            .filter(Boolean)
                            .join(' ')
                            .trim()
                          return full ? <div>{full}</div> : null
                        })()}

                        {(() => {
                          const a = order.owner_profile?.address
                          if (!a) return null

                          const streetLine = [a.street, a.houseNumber].filter(Boolean).join(' ').trim()
                          const cityLine = [a.zip, a.city].filter(Boolean).join(' ').trim()
                          const country = String(a.country ?? '').trim()

                          return (
                            <>
                              {streetLine ? <div>{streetLine}</div> : null}
                              {cityLine ? <div>{cityLine}</div> : null}
                              {country ? <div>{country}</div> : null}
                              {order.owner_profile?.vatNumber ? <div>UID: {order.owner_profile.vatNumber}</div> : null}
                            </>
                          )
                        })()}
                      </div>
                    ) : null}

                    {/* ✅ NUR für "vergeben": Snapshot bleibt wie gehabt */}
                    {order.kind === 'vergeben'
                      ? (() => {
                          const snap: any =
                            (order as any).anbieterSnapshot ??
                            (order as any).anbieter_snapshot ??
                            (order as any).owner_snapshot ??
                            (order as any).vendor_snapshot ??
                            null

                          if (!snap) return null

                          const priv = snap?.private ?? {}
                          const pub = snap?.public ?? {}
                          const addr = priv?.address ?? {}
                          const loc = pub?.location ?? {}

                          const company = typeof priv?.company_name === 'string' ? priv.company_name.trim() : ''
                          const person = [priv?.firstName, priv?.lastName].filter(Boolean).join(' ').trim()
                          const vat = typeof priv?.vat_number === 'string' ? priv.vat_number.trim() : ''

                          const streetLine = [addr?.street, addr?.houseNumber].filter(Boolean).join(' ').trim()
                          const cityLine = [addr?.zip, addr?.city ?? loc?.city].filter(Boolean).join(' ').trim()
                          const country = String(addr?.country ?? loc?.country ?? '').trim()

                          return (
                            <div className={styles.vendorSnapshot}>
                              {company ? <div>{company}</div> : null}
                              {person ? <div>{person}</div> : null}
                              {vat ? <div>UID: {vat}</div> : null}
                              {streetLine ? <div>{streetLine}</div> : null}
                              {cityLine ? <div>{cityLine}</div> : null}
                              {country ? <div>{country}</div> : null}
                            </div>
                          )
                        })()
                      : null}
                  </div>
                </div>

                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Preis</div>
                  <div className={styles.metaValue}>
                    <div>Auftrag: {formatEUR(order.artikelCents ?? 0)}</div>
                    <div>Logistik: {formatEUR(order.versandCents ?? 0)}</div>
                    <div>
                      <strong>Gesamt: {formatEUR(order.gesamtCents ?? order.amountCents)}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Zahlungsstatus</div>
                  <div className={styles.metaValue}>{paymentLabel(order)}</div>
                </div>

                {/* NICHT ANFASSEN: Warenausgabe/Warenrückgabe Bereich */}
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Warenausgabe</div>
                  <div className={styles.metaValue}>{formatDate(annahme)}</div>
                </div>

                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Warenrückgabe</div>
                  <div className={styles.metaValue}>{formatDate(ausgabe)}</div>
                </div>

                {order.deliveredReportedAt && (
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Gemeldet</div>
                    <div className={styles.metaValue}>{formatDate(asDateLike(order.deliveredReportedAt))}</div>
                  </div>
                )}

                {order.deliveredConfirmedAt && (
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Bestätigt</div>
                    <div className={styles.metaValue}>{formatDate(asDateLike(order.deliveredConfirmedAt))}</div>
                  </div>
                )}

                {isVendor && payout === 'hold' && order.offerPayStatus === 'paid' && !ar.ok && ar.unlockAtIso && (
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Auszahlung möglich ab</div>
                    <div className={styles.metaValue}>{formatDate(asDateLike(ar.unlockAtIso))}</div>
                  </div>
                )}

                {isCustomer && payout === 'hold' && order.jobPayStatus === 'paid' && buyerWin.untilIso && (
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Release/Refund möglich bis</div>
                    <div className={styles.metaValue}>{formatDate(asDateLike(buyerWin.untilIso))}</div>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                {canVendorReport &&
                  (() => {
                    const hintId = `deliver-hint-${order.kind}-${order.jobId}`
                    return (
                      <div className={styles.actionStack}>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          disabled={!canClick || isBusy}
                          aria-disabled={!canClick || isBusy}
                          aria-describedby={!canClick ? hintId : undefined}
                          onClick={() => {
                            if (canClick) setConfirmJobId(order.jobId)
                          }}
                          title={canClick ? 'Meldet Zustellung an Auftraggeber' : reason}
                        >
                          {isBusy && busyKey === `report:${order.jobId}` ? 'Sende…' : 'Auftrag abgeschlossen'}
                        </button>
                        {!canClick && (
                          <div id={hintId} className={styles.btnHint}>
                            {reason}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                {(canCustomerRelease || canCustomerRefund) && (
                  <div className={styles.actionStack}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={isBusy || !canCustomerRelease}
                      onClick={() => triggerRelease(order.jobId)}
                      title="Auszahlung an den Dienstleister (abzüglich 7%). Danach kein Refund mehr."
                    >
                      {isBusy && busyKey === `release:${order.jobId}` ? 'Sende…' : 'Auszahlung freigeben'}
                    </button>

                    <button
                      type="button"
                      className={styles.btnDanger}
                      disabled={isBusy || !canCustomerRefund}
                      onClick={() => triggerRefund(order.jobId)}
                      title="Refund auf die Zahlungsmethode (nur solange Auszahlungsstatus = hold)."
                    >
                      {isBusy && busyKey === `refund:${order.jobId}` ? 'Sende…' : 'Rückerstattung auslösen'}
                    </button>

                    <button
                      type="button"
                      className={styles.btnGhost}
                      disabled={isBusy}
                      onClick={() => openDispute(order.jobId)}
                    >
                      {isBusy && busyKey === `dispute:${order.jobId}` ? 'Sende…' : 'Problem melden'}
                    </button>
                  </div>
                )}

                {canVendorRelease && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={isBusy}
                    onClick={() => triggerRelease(order.jobId)}
                    title="Nach Ablauf der Frist kannst du die Auszahlung selbst auslösen."
                  >
                    {isBusy && busyKey === `release:${order.jobId}` ? 'Sende…' : 'Auszahlung holen'}
                  </button>
                )}

                {canCustomerReview && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={isBusy}
                    onClick={() => openReviewModal(order.jobId, 'customer_to_vendor')}
                  >
                    Dienstleister bewerten
                  </button>
                )}

                {canVendorReview && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={isBusy}
                    onClick={() => openReviewModal(order.jobId, 'vendor_to_customer')}
                  >
                    Auftraggeber bewerten
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Pagination
        page={slice.safePage}
        setPage={idPrefix === 'v' ? setPageV : setPageA}
        pageSize={idPrefix === 'v' ? psV : psA}
        setPageSize={idPrefix === 'v' ? setPsV : setPsA}
        total={slice.total}
        from={slice.from}
        to={slice.to}
        idPrefix={idPrefix}
      />
    </>
  )

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="search">
            Suchen
          </label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Auftrags-Nr., Name oder Titel…"
            className={styles.search}
          />

          <label className={styles.visuallyHidden} htmlFor="sort">
            Sortierung
          </label>
          <select id="sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} className={styles.select}>
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Höchster Preis zuerst</option>
            <option value="price_asc">Niedrigster Preis zuerst</option>
          </select>

          <label className={styles.visuallyHidden} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as FilterKey)}
            className={styles.select}
            title="Nach Status filtern"
          >
            <option value="alle">Alle</option>
            <option value="wartet">Anlieferung geplant</option>
            <option value="aktiv">In Bearbeitung</option>
            <option value="fertig">Abholbereit/Versandt</option>
          </select>

          <div className={styles.segmented} role="tablist" aria-label="Reihenfolge wählen">
            <button
              role="tab"
              aria-selected={topSection === 'vergeben'}
              className={`${styles.segmentedBtn} ${topSection === 'vergeben' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('vergeben')}
              type="button"
            >
              Vergebene oben <span className={styles.chip}>{filteredSortedV.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={topSection === 'angenommen'}
              className={`${styles.segmentedBtn} ${topSection === 'angenommen' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('angenommen')}
              type="button"
            >
              Angenommene oben <span className={styles.chip}>{filteredSortedA.length}</span>
            </button>
          </div>
        </div>

        {topSection === 'vergeben' ? (
          <>
            <h2 className={styles.heading}>Vergebene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {loading ? (
                <div className={styles.emptyState}>
                  <strong>Lade bezahlte Aufträge…</strong>
                </div>
              ) : sliceV.total === 0 ? (
                <div className={styles.emptyState}>
                  <strong>Noch keine bezahlten Aufträge.</strong>
                </div>
              ) : (
                <SectionList kind="vergeben" slice={sliceV} idPrefix="v" />
              )}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Angenommene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {loading ? (
                <div className={styles.emptyState}>
                  <strong>Lade bezahlte Aufträge…</strong>
                </div>
              ) : sliceA.total === 0 ? (
                <div className={styles.emptyState}>
                  <strong>Noch keine bezahlten Aufträge.</strong>
                </div>
              ) : (
                <SectionList kind="angenommen" slice={sliceA} idPrefix="a" />
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Angenommene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {loading ? (
                <div className={styles.emptyState}>
                  <strong>Lade bezahlte Aufträge…</strong>
                </div>
              ) : sliceA.total === 0 ? (
                <div className={styles.emptyState}>
                  <strong>Noch keine bezahlten Aufträge.</strong>
                </div>
              ) : (
                <SectionList kind="angenommen" slice={sliceA} idPrefix="a" />
              )}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vergebene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {loading ? (
                <div className={styles.emptyState}>
                  <strong>Lade bezahlte Aufträge…</strong>
                </div>
              ) : sliceV.total === 0 ? (
                <div className={styles.emptyState}>
                  <strong>Noch keine bezahlten Aufträge.</strong>
                </div>
              ) : (
                <SectionList kind="vergeben" slice={sliceV} idPrefix="v" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal: Auftragnehmer meldet „abgeschlossen“ */}
      {confirmJobId !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          onClick={e => {
            if (e.target === e.currentTarget) setConfirmJobId(null)
          }}
        >
          <div className={styles.modalContent}>
            <h3 id="confirmTitle" className={styles.modalTitle}>
              Bestätigen?
            </h3>
            <p id="confirmText" className={styles.modalText}>
              „Auftrag abgeschlossen“ meldet dem Auftraggeber die Zustellung.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirmJobId(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={busyKey === `report:${confirmJobId}`}
                onClick={async () => {
                  const id = confirmJobId
                  setConfirmJobId(null)
                  await reportDelivered(id)
                }}
              >
                Ja, Zustellung melden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bewertung (beidseitig) */}
      {reviewJobId !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rateTitle"
          onClick={e => {
            if (e.target === e.currentTarget) setReviewJobId(null)
          }}
        >
          <div className={styles.modalContent}>
            <h3 id="rateTitle" className={styles.modalTitle}>
              {reviewRole === 'customer_to_vendor' ? 'Dienstleister bewerten' : 'Auftraggeber bewerten'}
            </h3>

            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={`${n} Sterne`}
                  className={styles.starBtn}
                  type="button"
                >
                  {n <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>

            <textarea
              className={styles.reviewBox}
              value={ratingText}
              onChange={e => setRatingText(e.target.value)}
              placeholder="Feedback (Pflicht)…"
              rows={4}
            />

            {reviewErr && (
              <div className={styles.btnHint} style={{ marginTop: 8 }}>
                {reviewErr}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={() => setReviewJobId(null)}
                disabled={busyKey?.startsWith(`review:${reviewJobId}:`)}
              >
                Abbrechen
              </button>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={submitReview}
                disabled={busyKey?.startsWith(`review:${reviewJobId}:`)}
              >
                {busyKey?.startsWith(`review:${reviewJobId}:`) ? 'Sende…' : 'Abschicken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AuftraegePage
