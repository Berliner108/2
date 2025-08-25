'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './lackangebote.module.css'
import { artikelDaten, type Artikel } from '@/data/ArtikelDatenLackanfragen'

/* ---------- Status / Typen ---------- */
type OrderStatus = 'in_progress' | 'reported' | 'disputed' | 'confirmed'
type OrderKind   = 'vergeben' | 'angenommen'

type LackOrder = {
  requestId: string | number
  offerId?: string
  vendor?: string
  amountCents?: number
  acceptedAt: string // ISO
  kind: OrderKind

  status?: OrderStatus
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  autoReleaseAt?: string
  disputeOpenedAt?: string
  disputeReason?: string | null

  // Bewertung durch Auftraggeber
  review?: { rating: number; text?: string }
}

type SortKey   = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type StatusKey = 'wartet' | 'aktiv' | 'fertig'
type FilterKey = 'alle' | StatusKey

const LS_KEY     = 'myLackOrdersV1'
const TOP_KEY    = 'lackAuftraegeTop'
const LS_PS_V    = 'lack-orders:ps:v'
const LS_PS_A    = 'lack-orders:ps:a'
const LS_PAGE_V  = 'lack-orders:page:v'
const LS_PAGE_A  = 'lack-orders:page:a'
const AUTO_RELEASE_DAYS = 14

/* ---------- Defaults & Allowed --------- */
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

/* ---------- Helpers ---------- */
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
  d
    ? new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
    : '—'

function computeItemTitle(a: Artikel): string {
  const extras = [a.hersteller, a.ort, a.menge ? `${a.menge} kg` : ''].filter(Boolean).join(' · ')
  return [a.titel, extras].filter(Boolean).join(' — ')
}

function getRequesterName(a: Artikel): string {
  return a.user?.trim?.() || '—'
}

/** Produktions-/Abwicklungsstatus aus Lieferdatum der Anfrage */
function computeStatusFromArtikel(a: Artikel): {
  key: StatusKey
  label: 'Anlieferung geplant' | 'In Bearbeitung' | 'Abholbereit/Versandt'
} {
  const now = Date.now()
  const liefer = asDateLike(a.lieferdatum)
  if (liefer && now < +liefer) return { key: 'aktiv',  label: 'In Bearbeitung' } // ggf. "wartet" hier abbilden
  if (liefer && now >= +liefer) return { key: 'fertig', label: 'Abholbereit/Versandt' }
  return { key: 'aktiv', label: 'In Bearbeitung' }
}

/** Darf „Auftrag abgeschlossen“ (Lieferung melden)? -> erst ab Lieferdatum */
function canConfirmDeliveredArtikel(a?: Artikel): { ok: boolean; reason: string } {
  const liefer = a && asDateLike(a.lieferdatum)
  if (!liefer) return { ok: false, reason: 'Kein Lieferdatum hinterlegt' }
  if (Date.now() < +liefer) return { ok: false, reason: `Verfügbar ab ${formatDate(liefer)}` }
  return { ok: true, reason: '' }
}

/** Für Filterung „wartet/aktiv/fertig“ (reported/disputed/confirmed => „fertig“) */
function getStatusKeyFor(order: LackOrder, artikel: Artikel): StatusKey {
  if (order.status === 'reported' || order.status === 'disputed' || order.status === 'confirmed') return 'fertig'
  return computeStatusFromArtikel(artikel).key
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const daysAgo  = (d: number) => new Date(Date.now() - d * 86400_000).toISOString()

function notifyNavbarCount(count: number) {
  try { window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { key: 'lackOrders', count } })) } catch {}
}

/* ---------- Beispiel-Aufträge (Lack) ---------- */
const EXAMPLE_ORDERS: LackOrder[] = [
  { requestId: '1', vendor: 'LackPro · 4.7', amountCents:  9900, acceptedAt: hoursAgo(2),  kind: 'vergeben'   },
  { requestId: '3', vendor: 'PowderX · 4.6', amountCents: 14900, acceptedAt: daysAgo(1),   kind: 'vergeben'   },
  { requestId: '4', vendor: 'CoatHub · 4.8', amountCents: 21000, acceptedAt: hoursAgo(3),  kind: 'angenommen' },
  { requestId: '2', vendor: 'Du',            amountCents: 12000, acceptedAt: daysAgo(2),   kind: 'angenommen' },
]

/* ============ Pagination-UI (wie Lackanfragen) ============ */
const Pagination: FC<{
  page: number
  setPage: (p:number)=>void
  pageSize: number
  setPageSize: (n:number)=>void
  total: number
  from: number
  to: number
  idPrefix: string
}> = ({ page, setPage, pageSize, setPageSize, total, from, to, idPrefix }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className={styles.pagination} aria-label="Seitensteuerung">
      <div className={styles.pageInfo} id={`${idPrefix}-info`} aria-live="polite">
        {total === 0
          ? 'Keine Einträge'
          : <>Zeige <strong>{from}</strong>–<strong>{to}</strong> von <strong>{total}</strong></>}
      </div>
      <div className={styles.pagiControls}>
        <label className={styles.pageSizeLabel} htmlFor={`${idPrefix}-ps`}>Pro Seite:</label>
        <select
          id={`${idPrefix}-ps`}
          className={styles.pageSize}
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
        >
          <option value={2}>2</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <div className={styles.pageButtons}>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(1)} disabled={page <= 1} aria-label="Erste Seite">«</button>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Vorherige Seite">‹</button>
          <span className={styles.pageNow} aria-live="polite">Seite {page} / {pages}</span>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Nächste Seite">›</button>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(pages)} disabled={page >= pages} aria-label="Letzte Seite">»</button>
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

/* ================= Component ================= */
const LackanfragenOrdersPage: FC = () => {
  const router = useRouter()
  const params = useSearchParams()

  const itemsById = useMemo(() => {
    const m = new Map<string, Artikel>()
    for (const a of artikelDaten as Artikel[]) m.set(String(a.id), a)
    return m
  }, [])

  const [orders, setOrders] = useState<LackOrder[]>([])
  const [topSection, setTopSection] = useState<OrderKind>('vergeben')
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [sort,  setSort]  = useState<SortKey>('date_desc')
  const [statusFilter, setStatusFilter] = useState<FilterKey>('alle')

  // Seitennummern & PageSizes (pro Sektion)
  const [pageV, setPageV] = useState(1)
  const [psV,   setPsV]   = useState<number>(10)
  const [pageA, setPageA] = useState(1)
  const [psA,   setPsA]   = useState<number>(10)

  // Modal: Fertig/geliefert bestätigen (Anbieter-Seite)
  const [confirmRequestId, setConfirmRequestId] = useState<string | number | null>(null)

  // Bewertung
  const [rateOrderId, setRateOrderId] = useState<string | number | null>(null)
  const [rating, setRating] = useState(5)
  const [ratingText, setRatingText] = useState('')

  // ESC schließt Modals
  useEffect(() => {
    if (confirmRequestId == null && rateOrderId == null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setConfirmRequestId(null); setRateOrderId(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmRequestId, rateOrderId])

  /* ---------- Orders laden & migrieren ---------- */
  useEffect(() => {
    const savedTop = localStorage.getItem(TOP_KEY)
    if (savedTop === 'vergeben' || savedTop === 'angenommen') setTopSection(savedTop as OrderKind)

    try {
      const raw = localStorage.getItem(LS_KEY)
      const existing: LackOrder[] = raw ? JSON.parse(raw) : []
      const seen = new Set(existing.map(o => `${o.kind}-${o.requestId}`))
      const merged: LackOrder[] = [...existing]

      for (const ex of EXAMPLE_ORDERS) {
        if (!itemsById.has(String(ex.requestId))) continue
        if (!seen.has(`${ex.kind}-${ex.requestId}`)) merged.push(ex)
      }
      setOrders(merged)
      localStorage.setItem(LS_KEY, JSON.stringify(merged))
      notifyNavbarCount(merged.length)
    } catch {}
  }, [itemsById])

  // Query-Params cleanup + Auto-Release Tick (falls z.B. von Zahlung zurück)
  useEffect(() => {
    const accepted = params.get('accepted')
    if (accepted) {
      setOrders(prev => {
        const now = Date.now()
        let changed = false
        const next = prev.map((o): LackOrder => {
          if (o.status === 'reported' && o.autoReleaseAt && +new Date(o.autoReleaseAt) <= now) {
            changed = true
            return {
              ...o,
              status: 'confirmed' as OrderStatus,
              deliveredConfirmedAt: new Date().toISOString(),
            }
          }
          return o
        })
        if (changed) localStorage.setItem(LS_KEY, JSON.stringify(next))
        return next
      })

      const clean = new URL(window.location.href)
      ;['accepted','offerId','vendor','amount','kind','role','side','requestId','cursorV','cursorA'].forEach(k => clean.searchParams.delete(k))
      router.replace(clean.pathname + clean.search)
    }
  }, [params, router])

  // Top-Sektion merken
  useEffect(() => { try { localStorage.setItem(TOP_KEY, topSection) } catch {} }, [topSection])

  /* ---------- Auto-Freigabe ---------- */
  const runAutoRelease = () => {
    setOrders(prev => {
      const now = Date.now()
      let changed = false
      const next: LackOrder[] = prev.map((o): LackOrder => {
        if (o.status === 'reported' && o.autoReleaseAt && +new Date(o.autoReleaseAt) <= now) {
          changed = true
          return {
            ...o,
            status: 'confirmed' as const,
            deliveredConfirmedAt: new Date().toISOString(),
          }
        }
        return o
      })
      if (changed) localStorage.setItem(LS_KEY, JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    runAutoRelease()
    const id = setInterval(runAutoRelease, 60_000)
    const onVis = () => { if (!document.hidden) runAutoRelease() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- Filter + Sort ---------- */
  const allVergeben = useMemo(
    () => orders
      .filter(o => o.kind === 'vergeben')
      .map(o => ({ order: o, artikel: itemsById.get(String(o.requestId)) }))
      .filter(x => !!x.artikel) as {order:LackOrder, artikel:Artikel}[],
    [orders, itemsById]
  )
  const allAngenommen = useMemo(
    () => orders
      .filter(o => o.kind === 'angenommen')
      .map(o => ({ order: o, artikel: itemsById.get(String(o.requestId)) }))
      .filter(x => !!x.artikel) as {order:LackOrder, artikel:Artikel}[],
    [orders, itemsById]
  )

  const applySearchAndFilter = (items: {order:LackOrder, artikel:Artikel}[], qStr: string) => {
    const q = qStr.trim().toLowerCase()
    return items.filter(({ order, artikel }) => {
      if (statusFilter !== 'alle') {
        const key = getStatusKeyFor(order, artikel)
        if (key !== statusFilter) return false
      }
      if (!q) return true
      const title = computeItemTitle(artikel).toLowerCase()
      const partyName = order.kind === 'vergeben' ? (order.vendor || '') : getRequesterName(artikel)
      return (
        String(order.requestId).toLowerCase().includes(q) ||
        title.includes(q) ||
        partyName.toLowerCase().includes(q)
      )
    })
  }

  const applySort = (items: {order: LackOrder, artikel: Artikel}[]) => {
    return [...items].sort((a, b) => {
      if (sort === 'date_desc')  return +new Date(b.order.acceptedAt) - +new Date(a.order.acceptedAt)
      if (sort === 'date_asc')   return +new Date(a.order.acceptedAt) - +new Date(b.order.acceptedAt)
      if (sort === 'price_desc') return (b.order.amountCents ?? 0) - (a.order.amountCents ?? 0)
      if (sort === 'price_asc')  return (a.order.amountCents ?? 0) - (b.order.amountCents ?? 0)
      return 0
    })
  }

  const filteredSortedV = useMemo(
    () => applySort(applySearchAndFilter(allVergeben, debouncedQuery)),
    [allVergeben, debouncedQuery, sort, statusFilter]
  )
  const filteredSortedA = useMemo(
    () => applySort(applySearchAndFilter(allAngenommen, debouncedQuery)),
    [allAngenommen, debouncedQuery, sort, statusFilter]
  )

  /* ---------- URL → State (mit Fallback LocalStorage) ---------- */
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)

      // Query
      const q = p.get('q'); if (q !== null) setQuery(q)

      // Sort
      const s = p.get('sort') as SortKey | null
      if (s && ['date_desc','date_asc','price_desc','price_asc'].includes(s)) setSort(s)

      // Status
      const st = p.get('status') as FilterKey | null
      if (st && ['alle','wartet','aktiv','fertig'].includes(st)) setStatusFilter(st)

      // Tab (URL bevorzugt, sonst LS)
      const tab = p.get('tab') as OrderKind | null
      if (tab && (tab === 'vergeben' || tab === 'angenommen')) {
        setTopSection(tab)
      } else {
        const saved = localStorage.getItem(TOP_KEY)
        if (saved === 'vergeben' || saved === 'angenommen') setTopSection(saved as OrderKind)
      }

      // PageSizes (URL > LS > Default)
      const lPsV = Number(localStorage.getItem(LS_PS_V)) || DEFAULTS.psV
      const lPsA = Number(localStorage.getItem(LS_PS_A)) || DEFAULTS.psA
      const uPsV = Number(p.get('psV'))
      const uPsA = Number(p.get('psA'))
      setPsV(ALLOWED_PS.includes(uPsV) ? uPsV : (ALLOWED_PS.includes(lPsV) ? lPsV : DEFAULTS.psV))
      setPsA(ALLOWED_PS.includes(uPsA) ? uPsA : (ALLOWED_PS.includes(lPsA) ? lPsA : DEFAULTS.psA))

      // Pages (URL > LS > Default)
      const lPageV = Number(localStorage.getItem(LS_PAGE_V)) || DEFAULTS.pageV
      const lPageA = Number(localStorage.getItem(LS_PAGE_A)) || DEFAULTS.pageA
      const uPageV = Number(p.get('pageV')) || undefined
      const uPageA = Number(p.get('pageA')) || undefined
      setPageV(uPageV && uPageV > 0 ? uPageV : (lPageV > 0 ? lPageV : DEFAULTS.pageV))
      setPageA(uPageA && uPageA > 0 ? uPageA : (lPageA > 0 ? lPageA : DEFAULTS.pageA))
    } catch {}
  }, [])

  /* ---------- Persistenzen ---------- */
  useEffect(() => { try { localStorage.setItem(LS_PS_V,   String(psV)) } catch {} }, [psV])
  useEffect(() => { try { localStorage.setItem(LS_PS_A,   String(psA)) } catch {} }, [psA])
  useEffect(() => { try { localStorage.setItem(LS_PAGE_V, String(pageV)) } catch {} }, [pageV])
  useEffect(() => { try { localStorage.setItem(LS_PAGE_A, String(pageA)) } catch {} }, [pageA])

  // Bei (debounced) Such-/Sort-/Status-Änderung beide Seiten zurücksetzen
  useEffect(() => { setPageV(1); setPageA(1) }, [debouncedQuery, sort, statusFilter])

  /* ---------- URL-Synchronisation (mit Debounce) ---------- */
  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (debouncedQuery !== DEFAULTS.q) p.set('q', debouncedQuery)
      if (sort !== DEFAULTS.sort)        p.set('sort', sort)
      if (statusFilter !== DEFAULTS.status) p.set('status', statusFilter)
      if (topSection !== DEFAULTS.tab)   p.set('tab', topSection)
      if (psV !== DEFAULTS.psV)          p.set('psV', String(psV))
      if (psA !== DEFAULTS.psA)          p.set('psA', String(psA))
      if (pageV !== DEFAULTS.pageV)      p.set('pageV', String(pageV))
      if (pageA !== DEFAULTS.pageA)      p.set('pageA', String(pageA))

      const qs   = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`
      if (next !== curr) {
        router.replace(next, { scroll: false })
      }
    } catch {}
  }, [debouncedQuery, sort, statusFilter, topSection, psV, psA, pageV, pageA, router])

  /* ---------- Slices ---------- */
  const sliceV = sliceByPage(filteredSortedV, pageV, psV)
  useEffect(() => { if (sliceV.safePage !== pageV) setPageV(sliceV.safePage) }, [sliceV.safePage, pageV])

  const sliceA = sliceByPage(filteredSortedA, pageA, psA)
  useEffect(() => { if (sliceA.safePage !== pageA) setPageA(sliceA.safePage) }, [sliceA.safePage, pageA])

  /* ---------- Actions ---------- */
  function persist(next: LackOrder[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    setOrders(next)
  }

  function reportDelivered(requestId: string | number) {
    const next = orders.map((o): LackOrder =>
      String(o.requestId) === String(requestId)
        ? {
            ...o,
            status: 'reported' as OrderStatus,
            deliveredReportedAt: new Date().toISOString(),
            autoReleaseAt: new Date(Date.now() + AUTO_RELEASE_DAYS * 86400_000).toISOString(),
          }
        : o
    )
    persist(next)
  }

  function confirmDelivered(requestId: string | number) {
    const next: LackOrder[] = orders.map((o): LackOrder =>
      String(o.requestId) === String(requestId)
        ? {
            ...o,
            status: 'confirmed' as OrderStatus,
            deliveredConfirmedAt: new Date().toISOString(),
          }
        : o
    )
    persist(next)
  }

  function openDispute(requestId: string | number) {
    const reason = window.prompt('Problem melden (optional):')
    const next = orders.map((o): LackOrder =>
      String(o.requestId) === String(requestId)
        ? {
            ...o,
            status: 'disputed' as OrderStatus,
            disputeOpenedAt: new Date().toISOString(),
            disputeReason: reason || null,
          }
        : o
    )
    persist(next)
  }

  function remainingText(iso?: string) {
    if (!iso) return '–'
    const delta = +new Date(iso) - Date.now()
    if (delta <= 0) return 'kurzfristig'
    const days  = Math.floor(delta / 86400000)
    const hours = Math.floor((delta % 86400000) / 3600000)
    return days >= 1 ? `${days} ${days===1?'Tag':'Tage'} ${hours} Std` : `${hours} Std`
  }

  /* ---------- Section Renderer ---------- */
  const SectionList: FC<{
    kind: OrderKind
    slice: Slice<{order:LackOrder, artikel:Artikel}>
    idPrefix: string
    onConfirmDelivered: (requestId: string | number) => void
  }> = ({ kind, slice, idPrefix, onConfirmDelivered }) => (
    <>
      <ul className={styles.list}>
        {slice.pageItems.map(({ order, artikel }) => {
          const a = artikel as Artikel
          const prodStatus = computeStatusFromArtikel(a)
          const display =
            order.status === 'confirmed'
              ? { key: 'fertig' as StatusKey, label: 'Geliefert (bestätigt)' as const }
              : order.status === 'disputed'
                ? { key: 'fertig' as StatusKey, label: 'Reklamation offen' as const }
                : order.status === 'reported'
                  ? { key: 'fertig' as StatusKey, label: 'Zustellung gemeldet' as const }
                  : prodStatus

          const liefer = asDateLike(a.lieferdatum)

          const contactLabel = order.kind === 'vergeben' ? 'Anbieter' : 'Auftraggeber'
          const contactValue = order.kind === 'vergeben' ? (order.vendor ?? '—') : getRequesterName(a)

          const { ok: canClick, reason } = canConfirmDeliveredArtikel(a)

          const isVendor   = order.kind === 'angenommen'
          const isCustomer = order.kind === 'vergeben'

          return (
            <li key={`${order.kind}-${order.requestId}-${order.offerId ?? 'x'}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Link href={`/lackanfragen/artikel/${a.id}`} className={styles.titleLink}>
                    {computeItemTitle(a)}
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
                  ].join(' ').trim()}
                >
                  {display.label}
                </span>
              </div>

              <div className={styles.meta}>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>{contactLabel}</div>
                  <div className={styles.metaValue}>{contactValue}</div>
                </div>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Preis</div>
                  <div className={styles.metaValue}>{formatEUR(order.amountCents)}</div>
                </div>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Lieferdatum</div>
                  <div className={styles.metaValue}>{formatDate(liefer)}</div>
                </div>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Menge</div>
                  <div className={styles.metaValue}>{a.menge ? `${a.menge} kg` : '—'}</div>
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
              </div>

              <div className={styles.actions}>
                <Link href={`/lackanfragen/artikel/${a.id}`} className={styles.primaryBtn}>
                  Zur Lackanfrage
                </Link>

                {/* Anbieter: „Auftrag abgeschlossen“ */}
                {isVendor && (order.status ?? 'in_progress') === 'in_progress' && (() => {
                  const hintId = `deliver-hint-${order.kind}-${order.requestId}`
                  return (
                    <div className={styles.actionStack}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={!canClick}
                        aria-disabled={!canClick}
                        aria-describedby={!canClick ? hintId : undefined}
                        onClick={() => { if (canClick) setConfirmRequestId(order.requestId) }}
                        title={canClick ? 'Bestätigt Lieferung – endgültig' : reason}
                      >
                        Auftrag abgeschlossen
                      </button>
                      {!canClick && <div id={hintId} className={styles.btnHint}> {reason} </div>}
                    </div>
                  )
                })()}

                {/* Auftraggeber: nach Meldung bestätigen / reklamieren */}
                {isCustomer && order.status === 'reported' && (
                  <div className={styles.actionStack}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={() => onConfirmDelivered(order.requestId)}
                      title="Empfang bestätigen & Zahlung freigeben"
                    >
                      Empfang bestätigen & Zahlung freigeben
                    </button>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={() => openDispute(order.requestId)}
                    >
                      Problem melden
                    </button>
                    <div className={styles.btnHint}>
                      Auto-Freigabe in {remainingText(order.autoReleaseAt)}
                    </div>
                  </div>
                )}

                {/* Auftraggeber: nach Bestätigung bewerten (einmalig) */}
                {isCustomer && order.status === 'confirmed' && !order.review && (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => { setRateOrderId(order.requestId); setRating(5); setRatingText('') }}
                  >
                    Anbieter bewerten
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Pager */}
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
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="search">Suchen</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Anfrage-Nr., Name oder Titel…"
            className={styles.search}
          />
          <label className={styles.visuallyHidden} htmlFor="sort">Sortierung</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={styles.select}
          >
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Höchster Preis zuerst</option>
            <option value="price_asc">Niedrigster Preis zuerst</option>
          </select>

          {/* Status-Filter */}
          <label className={styles.visuallyHidden} htmlFor="status">Status</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterKey)}
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
            <h2 className={styles.heading}>Vergebene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceV.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen vergeben.</strong></div>
                : <SectionList
                    kind="vergeben"
                    slice={sliceV}
                    idPrefix="v"
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vom Auftraggeber angenommene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceA.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen angenommen.</strong></div>
                : <SectionList
                    kind="angenommen"
                    slice={sliceA}
                    idPrefix="a"
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Vom Auftraggeber angenommene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceA.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen angenommen.</strong></div>
                : <SectionList
                    kind="angenommen"
                    slice={sliceA}
                    idPrefix="a"
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vergebene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceV.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen vergeben.</strong></div>
                : <SectionList
                    kind="vergeben"
                    slice={sliceV}
                    idPrefix="v"
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>
          </>
        )}
      </div>

      {/* Modal: Anbieter meldet „abgeschlossen“ */}
      {confirmRequestId !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmRequestId(null) }}
        >
          <div className={styles.modalContent}>
            <h3 id="confirmTitle" className={styles.modalTitle}>Bestätigen?</h3>
            <p id="confirmText" className={styles.modalText}>
              „Auftrag abgeschlossen“ meldet dem Auftraggeber die Zustellung. Danach startet automatisch eine 14-Tage-Frist zur Freigabe.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirmRequestId(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => { reportDelivered(confirmRequestId); setConfirmRequestId(null) }}
              >
                Ja, Zustellung melden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bewertung */}
      {rateOrderId !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rateTitle"
          onClick={(e) => { if (e.target === e.currentTarget) setRateOrderId(null) }}
        >
          <div className={styles.modalContent}>
            <h3 id="rateTitle" className={styles.modalTitle}>Anbieter bewerten</h3>
            <div className={styles.stars}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n} Sterne`} className={styles.starBtn}>
                  {n <= rating ? '★' : '☆'}
                </button>
              ))}
            </div>
            <textarea
              className={styles.reviewBox}
              value={ratingText}
              onChange={e => setRatingText(e.target.value)}
              placeholder="Optionales Feedback…"
              rows={4}
            />
            <div className={styles.modalActions}>
              <button className={styles.btnGhost} onClick={()=>setRateOrderId(null)}>Abbrechen</button>
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  persist(orders.map(o =>
                    String(o.requestId) === String(rateOrderId)
                      ? { ...o, review: { rating, text: ratingText.trim() || undefined } }
                      : o
                  ))
                  setRateOrderId(null)
                }}
              >
                Abschicken
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LackanfragenOrdersPage
