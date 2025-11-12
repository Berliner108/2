'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './lackangebote.module.css'

/* ---------- Fancy Loader Components ---------- */
function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  )
}
// Link zur Plattform-Rechnung (PDF) für diese Order
const invoiceUrl = (o: LackOrder) => `/api/invoices/${encodeURIComponent(String(o.orderId))}`

function FormSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />

      <div className={styles.skelTwoCols}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>

      <div className={styles.skelDrop} />
      <div className={styles.skelDropSmall} />

      <div className={styles.skelGrid}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>
    </div>
  )
}

/* ---------- Status / Typen ---------- */
type OrderStatus = 'in_progress' | 'reported' | 'disputed' | 'confirmed'
type OrderKind   = 'vergeben' | 'angenommen'

type LackOrder = {
  orderId: string

  requestId: string | number
  offerId?: string
  amountCents?: number
  itemCents?: number
  shippingCents?: number
  acceptedAt: string // ISO
  kind: OrderKind
  shippedAt?: string
  autoRefundAt?: string
  refundedAt?: string

  // Gegenpartei & Ratings (Aggregatwerte)
  vendorName?: string
  vendorUsername?: string | null
  vendorDisplay?: string | null
  vendorRating?: number | null
  vendorRatingCount?: number | null

  ownerHandle?: string | null
  ownerDisplay?: string | null
  ownerRating?: number | null
  ownerRatingCount?: number | null

  // Request-Meta
  title?: string | null
  ort?: string | null
  lieferdatum?: string | null
  mengeKg?: number | null

  status?: OrderStatus
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  autoReleaseAt?: string
  disputeOpenedAt?: string
  disputeReason?: string | null

  myReview?: { stars: 1 | 2 | 3 | 4 | 5; text: string }
  review?: { stars: 1 | 2 | 3 | 4 | 5; text: string }
}

type SortKey   = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'

// ✅ Neue Status/Filter-Keys
type StatusKey = 'wartet' | 'offen' | 'reported' | 'disputed' | 'confirmed' | 'refunded'
type FilterKey = 'alle' | StatusKey

const LS_KEY       = 'myLackOrdersV1'
const TOP_KEY      = 'lackAuftraegeTop'
const LS_PS_V      = 'lack-orders:ps:v'
const LS_PS_A      = 'lack-orders:ps:a'
const LS_PAGE_V    = 'lack-orders:page:v'
const LS_PAGE_A    = 'lack-orders:page:a'
const LS_SEEN_ORDERS = 'lackOrders:lastSeen'   // 👈 neu

/** 28 Tage Auto-Release-Frist nach „Versandt“ */
const AUTO_RELEASE_DAYS = 28

// Link zur Review-Seite der Gegenpartei
function profileReviewsHref(order: LackOrder): string | undefined {
  if (order.kind === 'vergeben') {
    if (order.vendorUsername) return `/u/${order.vendorUsername}/reviews`
    if ((order as any).vendorId) return `/u/${(order as any).vendorId}/reviews`
  } else {
    if (order.ownerHandle) return `/u/${order.ownerHandle}/reviews`
    if ((order as any).ownerId) return `/u/${(order as any).ownerId}/reviews`
  }
  return undefined
}

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
// Nur echte Usernames zulassen (2–32, alnum + . _ - , nicht am Rand)
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,30}[A-Za-z0-9])?$/;
const asHandleOrNull = (v?: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return HANDLE_RE.test(s) ? s : null;
};

const formatEUR = (c?: number) =>
  typeof c === 'number' ? (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' }) : '—'

const formatDate = (d?: Date) =>
  d ? new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) : '—'

// (darf bleiben, wird für Anzeige nicht mehr verwendet)
function statusFromLiefer(d?: Date): { key: 'wartet' | 'aktiv' | 'fertig'; label: 'Anlieferung geplant' | 'In Bearbeitung' | 'Abholbereit/Versandt' } {
  if (!d) return { key: 'aktiv', label: 'In Bearbeitung' }
  return Date.now() < +d
    ? { key: 'wartet', label: 'Anlieferung geplant' }
    : { key: 'fertig', label: 'Abholbereit/Versandt' }
}

function notifyNavbarCount(count: number) {
  try { window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { key: 'lackOrders', count } })) } catch {}
}
function endOfDayIso(d?: string | null): string | undefined {
  if (!d) return undefined
  const dt = new Date(d)
  if (isNaN(+dt)) return undefined
  dt.setHours(23, 59, 59, 999)
  return dt.toISOString()
}

/* ========= fetcher ========= */
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(async r => {
    if (!r.ok) {
      let msg = 'Laden fehlgeschlagen'
      try { const j = await r.json(); msg = j?.error || msg } catch {}
      throw new Error(msg)
    }
    return r.json()
  })

/* ========= POST-Helper ========= */
async function apiPost(path: string, body?: any) {
  const r = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json?.error || 'Aktion fehlgeschlagen')
  return json
}

/* ===== Display-Status aus Serverstatus + Lieferdatum ableiten ===== */
function getDisplayStatus(order: LackOrder): { key: StatusKey; label: string } {
  // Refunds sichtbar machen
  if (order.refundedAt || (order as any).status === 'canceled') {
    return { key: 'refunded', label: 'Erstattet' }
  }
  if (order.disputeOpenedAt) {
    return { key: 'disputed', label: 'Reklamiert' } // optional „(erstattet)“ anhängen falls refundedAt gesetzt
  }
  if (order.status === 'confirmed') return { key: 'confirmed', label: 'Geliefert (bestätigt)' }
  if (order.status === 'disputed')  return { key: 'disputed',  label: 'Reklamiert' }
  if (order.status === 'reported')  return { key: 'reported',  label: 'Versandt' }

  const liefer = asDateLike(order.lieferdatum)
  if (liefer && Date.now() < +liefer) return { key: 'wartet', label: 'Anlieferung geplant' }
  return { key: 'offen', label: 'Offen' }
}


/* ============ Pagination-UI ============ */
const Pagination: FC<{
  page: number; setPage: (p:number)=>void; pageSize: number; setPageSize: (n:number)=>void;
  total: number; from: number; to: number; idPrefix: string
}> = ({ page, setPage, pageSize, setPageSize, total, from, to, idPrefix }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className={styles.pagination} aria-label="Seitensteuerung">
      <div className={styles.pageInfo} id={`${idPrefix}-info`} aria-live="polite">
        {total === 0 ? 'Keine Einträge' : <>Zeige <strong>{from}</strong>–<strong>{to}</strong> von <strong>{total}</strong></>}
      </div>
      <div className={styles.pagiControls}>
        <label className={styles.pageSizeLabel} htmlFor={`${idPrefix}-ps`}>Pro Seite:</label>
        <select id={`${idPrefix}-ps`} className={styles.pageSize} value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1) }}>
          <option value={2}>2</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
        </select>
        <div className={styles.pageButtons}>
          <button type="button" className={styles.pageBtn} onClick={()=>setPage(1)} disabled={page<=1} aria-label="Erste Seite">«</button>
          <button type="button" className={styles.pageBtn} onClick={()=>setPage(page-1)} disabled={page<=1} aria-label="Vorherige Seite">‹</button>
          <span className={styles.pageNow} aria-live="polite">Seite {page} / {pages}</span>
          <button type="button" className={styles.pageBtn} onClick={()=>setPage(page+1)} disabled={page>=pages} aria-label="Nächste Seite">›</button>
          <button type="button" className={styles.pageBtn} onClick={()=>setPage(pages)} disabled={page>=pages} aria-label="Letzte Seite">»</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Slice Helper ---------- */
type Slice<T> = { pageItems: T[]; from: number; to: number; total: number; safePage: number; pages: number }
function sliceByPage<T>(arr: T[], page: number, ps: number): Slice<T> {
  const total = arr.length
  const pages = Math.max(1, Math.ceil(total / ps))
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * ps
  const end = Math.min(start + ps, total)
  return { pageItems: arr.slice(start, end), from: total===0 ? 0 : start+1, to: end, total, safePage, pages }
}

/* ================= Component ================= */
const LackanfragenOrdersPage: FC = () => {
  const router = useRouter()
  const params = useSearchParams()

  // ---- Orders aus API laden ----
  const { data: apiOrders, isLoading, error, mutate } = useSWR<{ vergeben: LackOrder[]; angenommen: LackOrder[] }>(
    '/api/orders/for-account', fetcher, { refreshInterval: 60_000, revalidateOnFocus: true }
  )

  const [orders, setOrders] = useState<LackOrder[]>([])
  const [shipOrder, setShipOrder] = useState<LackOrder | null>(null)

  // 👉 Beim Öffnen diese Seite: Events als „gesehen“ markieren (verhindert Altlasten)
  useEffect(() => {
    try { localStorage.setItem(LS_SEEN_ORDERS, String(Date.now())) } catch {}
  }, [])

  // Orders in lokalen State übernehmen
  useEffect(() => {
    if (!apiOrders) return
    const merged = [...(apiOrders.vergeben ?? []), ...(apiOrders.angenommen ?? [])]
    setOrders(merged)
    try { localStorage.setItem(LS_KEY, JSON.stringify(merged)) } catch {}
    notifyNavbarCount(merged.length)
  }, [apiOrders])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.has('accepted')) {
      const clean = new URL(window.location.href)
      ;['accepted','offerId','vendor','amount','kind','role','side','requestId','cursorV','cursorA']
        .forEach(k => clean.searchParams.delete(k))
      router.replace(clean.pathname + clean.search)
    }
  }, [router])

  // Toolbar-State
  const [topSection, setTopSection] = useState<OrderKind>('vergeben')
  useEffect(() => { try { localStorage.setItem(TOP_KEY, topSection) } catch {} }, [topSection])

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const [sort,  setSort]  = useState<SortKey>('date_desc')

  // ✅ Neuer Status-Filter-State
  const [statusFilter, setStatusFilter] = useState<FilterKey>('alle')

  // Seitennummern & PageSizes (pro Sektion)
  const [pageV, setPageV] = useState(1)
  const [psV,   setPsV]   = useState<number>(10)
  const [pageA, setPageA] = useState(1)
  const [psA,   setPsA]   = useState<number>(10)

  // Bewertung (Modal)
  const [rateOrderId, setRateOrderId] = useState<string | null>(null)
  const [ratingText, setRatingText] = useState('')
  const [ratingStars, setRatingStars] = useState<1|2|3|4|5>(5)

  // Reklamation (Modal)
  const [disputeOrder, setDisputeOrder] = useState<LackOrder | null>(null)
  const [disputeText, setDisputeText]   = useState('')
  const [disputeBusy, setDisputeBusy]   = useState(false)

  // Ticker
  const [, setNowTick] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ESC schließt Modals
  useEffect(() => {
    if (shipOrder == null && rateOrderId == null && disputeOrder == null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShipOrder(null); setRateOrderId(null); setDisputeOrder(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shipOrder, rateOrderId, disputeOrder])

  /* ---------- Auto-Freigabe (Käufer inaktiv nach „Versandt“) ---------- */
  const runAutoRelease = () => {
    setOrders(prev => {
      const now = Date.now()
      let changed = false
      const next: LackOrder[] = prev.map((o): LackOrder => {
        if (o.status === 'reported' && o.autoReleaseAt && +new Date(o.autoReleaseAt) <= now) {
          changed = true
          return { ...o, status: 'confirmed' as const, deliveredConfirmedAt: new Date().toISOString() }
        }
        return o
      })
      if (changed) try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    runAutoRelease()
    const id = setInterval(runAutoRelease, 60_000)
    const onVis = () => { if (!document.hidden) runAutoRelease() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  /* ---------- Anzeige-Helfer ---------- */
  const pickLiefer = (order: LackOrder) => asDateLike(order.lieferdatum)
  const pickTitle  = (order: LackOrder) => {
    if (order.title && order.title.trim()) {
      const extras = [order.ort, typeof order.mengeKg === 'number' ? `${order.mengeKg} kg` : ''].filter(Boolean).join(' · ')
      return [order.title, extras].filter(Boolean).join(' — ')
    }
    return `Anfrage #${String(order.requestId).slice(0, 8)}`
  }

  const pickCounterpartyName = (order: LackOrder) =>
    order.kind === 'vergeben'
      ? (asHandleOrNull(order.vendorUsername) ||
         asHandleOrNull((order as any).vendorHandle) ||
         'Anbieter')
      : (asHandleOrNull(order.ownerHandle) ||
         asHandleOrNull((order as any).ownerUsername) ||
         'Auftraggeber')

  const pickCounterpartyRatingTxt = (order: LackOrder) => {
    const rating   = order.kind === 'vergeben' ? order.vendorRating : order.ownerRating
    const ratingCt = order.kind === 'vergeben' ? order.vendorRatingCount : order.ownerRatingCount
    return (typeof rating === 'number' && isFinite(rating) && (ratingCt ?? 0) > 0)
      ? `${rating.toFixed(1)}/5 · ${ratingCt}`
      : 'keine Bewertungen'
  }

  const allVergeben   = useMemo(() => orders.filter(o => o.kind === 'vergeben'),   [orders])
  const allAngenommen = useMemo(() => orders.filter(o => o.kind === 'angenommen'), [orders])

  // ✅ Filter nutzt jetzt getDisplayStatus()
  const applySearchAndFilter = (items: LackOrder[], qStr: string) => {
    const q = qStr.trim().toLowerCase()
    return items.filter((order) => {
      if (statusFilter !== 'alle') {
        const key = getDisplayStatus(order).key
        if (key !== statusFilter) return false
      }
      if (!q) return true
      const title = pickTitle(order).toLowerCase()
      const partyName = pickCounterpartyName(order).toLowerCase()
      return String(order.requestId).toLowerCase().includes(q) || title.includes(q) || partyName.includes(q)
    })
  }

  const applySort = (items: LackOrder[]) => {
    return [...items].sort((a, b) => {
      if (sort === 'date_desc')  return +new Date(b.acceptedAt) - +new Date(a.acceptedAt)
      if (sort === 'date_asc')   return +new Date(a.acceptedAt) - +new Date(b.acceptedAt)
      if (sort === 'price_desc') return (b.amountCents ?? 0) - (a.amountCents ?? 0)
      if (sort === 'price_asc')  return (a.amountCents ?? 0) - (b.amountCents ?? 0)
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

  /* ---------- URL → State ---------- */
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)

      const q = p.get('q'); if (q !== null) setQuery(q)

      const s = p.get('sort') as SortKey | null
      if (s && ['date_desc','date_asc','price_desc','price_asc'].includes(s)) setSort(s)

      // ✅ erlaubte Statuswerte aktualisiert
      const st = p.get('status') as FilterKey | null
      if (st && ['alle','wartet','offen','reported','disputed','confirmed'].includes(st)) setStatusFilter(st)

      const tab = p.get('tab') as OrderKind | null
      if (tab && (tab === 'vergeben' || tab === 'angenommen')) {
        setTopSection(tab)
      } else {
        const saved = localStorage.getItem(TOP_KEY)
        if (saved === 'vergeben' || saved === 'angenommen') setTopSection(saved as OrderKind)
      }

      const lPsV = Number(localStorage.getItem(LS_PS_V)) || 10
      const lPsA = Number(localStorage.getItem(LS_PS_A)) || 10
      const uPsV = Number(p.get('psV'))
      const uPsA = Number(p.get('psA'))
      setPsV([2,10,20,50].includes(uPsV) ? uPsV : ([2,10,20,50].includes(lPsV) ? lPsV : 10))
      setPsA([2,10,20,50].includes(uPsA) ? uPsA : ([2,10,20,50].includes(lPsA) ? lPsA : 10))

      const lPageV = Number(localStorage.getItem(LS_PAGE_V)) || 1
      const lPageA = Number(localStorage.getItem(LS_PAGE_A)) || 1
      const uPageV = Number(p.get('pageV')) || undefined
      const uPageA = Number(p.get('pageA')) || undefined
      setPageV(uPageV && uPageV > 0 ? uPageV : (lPageV > 0 ? lPageV : 1))
      setPageA(uPageA && uPageA > 0 ? uPageA : (lPageA > 0 ? lPageA : 1))
    } catch {}
  }, [])

  /* ---------- Persistenzen ---------- */
  useEffect(() => { try { localStorage.setItem(LS_PS_V,   String(psV)) } catch {} }, [psV])
  useEffect(() => { try { localStorage.setItem(LS_PS_A,   String(psA)) } catch {} }, [psA])
  useEffect(() => { try { localStorage.setItem(LS_PAGE_V, String(pageV)) } catch {} }, [pageV])
  useEffect(() => { try { localStorage.setItem(LS_PAGE_A, String(pageA)) } catch {} }, [pageA])

  useEffect(() => { setPageV(1); setPageA(1) }, [debouncedQuery, sort, statusFilter])

  /* ---------- URL-Synchronisation ---------- */
  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (debouncedQuery) p.set('q', debouncedQuery)
      if (sort !== 'date_desc')        p.set('sort', sort)
      if (statusFilter !== 'alle')     p.set('status', statusFilter)
      if (topSection !== 'vergeben')   p.set('tab', topSection)
      if (psV !== 10)                  p.set('psV', String(psV))
      if (psA !== 10)                  p.set('psA', String(psA))
      if (pageV !== 1)                 p.set('pageV', String(pageV))
      if (pageA !== 1)                 p.set('pageA', String(pageA))

      const qs   = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`
      if (next !== curr) router.replace(next, { scroll: false })
    } catch {}
  }, [debouncedQuery, sort, statusFilter, topSection, psV, psA, pageV, pageA, router])

  /* ---------- Slices ---------- */
  const sliceV = sliceByPage(filteredSortedV, pageV, psV)
  useEffect(() => { if (sliceV.safePage !== pageV) setPageV(sliceV.safePage) }, [sliceV.safePage, pageV])

  const sliceA = sliceByPage(filteredSortedA, pageA, psA)
  useEffect(() => { if (sliceA.safePage !== pageA) setPageA(sliceA.safePage) }, [sliceA.safePage, pageA])

  /* ---------- Lokale Persist-Helper ---------- */
  function persist(next: LackOrder[]) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
    setOrders(next)
  }

  /* ---------- Server-Actions ---------- */
  async function doShip(o: LackOrder) {
    try {
      await apiPost(`/api/orders/${o.orderId}/ship`)
      const nowIso  = new Date().toISOString()
      const autoRel = new Date(Date.now() + AUTO_RELEASE_DAYS * 86400_000).toISOString()

      const next: LackOrder[] = orders.map((x): LackOrder =>
        x.orderId === o.orderId
          ? {
              ...x,
              status: 'reported' as OrderStatus,
              shippedAt: nowIso,
              deliveredReportedAt: nowIso,
              autoReleaseAt: autoRel,
            }
          : x
      )

      persist(next)
      try { localStorage.setItem(LS_SEEN_ORDERS, String(Date.now())) } catch {}
      mutate()
    } catch (e: any) {
      alert(e?.message || 'Aktion fehlgeschlagen')
    }
  }

  async function doRelease(o: LackOrder) {
    try {
      const res = await apiPost(`/api/orders/${o.orderId}/release`)
      const nowIso = new Date().toISOString()

      const next: LackOrder[] = orders.map((x): LackOrder =>
        x.orderId === o.orderId ? { ...x, status: 'confirmed', deliveredConfirmedAt: nowIso } : x
      )
      persist(next)
      try { localStorage.setItem(LS_SEEN_ORDERS, String(Date.now())) } catch {}
      mutate()

      if (res?.invoiceUrl) {
        try { window.open(res.invoiceUrl, '_blank', 'noopener') } catch {}
      }
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('SELLER_NOT_CONNECTED')) {
        alert('Der Anbieter hat sein Auszahlungs­konto noch nicht verknüpft. Bitte kontaktiere ihn oder Support.')
      } else {
        alert(msg || 'Aktion fehlgeschlagen')
      }
    }
  }

  // Reklamation – hübsches Modal + SOFORT-REFUND
  function openDispute(o: LackOrder) {
    setDisputeOrder(o)
    setDisputeText('')
  }
  function cancelDispute() {
    if (disputeBusy) return
    setDisputeOrder(null)
    setDisputeText('')
  }
  async function confirmDispute() {
    if (!disputeOrder || disputeBusy) return
    try {
      setDisputeBusy(true)
      const reason = disputeText.trim()
      // Refund auslösen (bestehende Route beibehalten)
      await apiPost(`/api/orders/refund`, { orderId: disputeOrder.orderId, reason })

      const nowIso = new Date().toISOString()
      const next: LackOrder[] = orders.map((x): LackOrder =>
        x.orderId === disputeOrder.orderId
          ? {
              ...x,
              refundedAt: nowIso,
              status: 'in_progress' as const, // UI bleibt sichtbar
              disputeOpenedAt: nowIso,
              disputeReason: reason || null,
            }
          : x
      )
      persist(next)
      try { localStorage.setItem(LS_SEEN_ORDERS, String(Date.now())) } catch {}
      setDisputeOrder(null)
      setDisputeText('')
      mutate()
    } catch (e: any) {
      alert(e?.message || 'Aktion fehlgeschlagen')
    } finally {
      setDisputeBusy(false)
    }
  }

  function remainingText(iso?: string) {
  if (!iso) return '–'
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'abgelaufen'
  const mins = Math.ceil(ms / 60_000)
  if (mins < 60) return `${mins} Min`
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  return days >= 1 ? `${days} ${days===1?'Tag':'Tage'} ${hours % 24} Std` : `${hours} Std`
}


  const alreadyRated = (o: LackOrder) => !!(o.myReview || o.review)
  const canRateNow   = (o: LackOrder) => !alreadyRated(o)

  /* ---------- Section Renderer ---------- */
  const SectionList: FC<{
    kind: OrderKind
    slice: Slice<LackOrder>
    idPrefix: string
  }> = ({ kind, slice, idPrefix }) => (
    <>
      <ul className={styles.list}>
        {slice.pageItems.map((order) => {
          const liefer = pickLiefer(order)

          // ✅ Neue Anzeige
          const display = getDisplayStatus(order)

          const contactLabel = order.kind === 'vergeben' ? 'Anbieter' : 'Auftraggeber'
          const contactName  = pickCounterpartyName(order)
          const ratingTxt    = pickCounterpartyRatingTxt(order)
          const title        = pickTitle(order)
          const menge        = typeof order.mengeKg === 'number' ? order.mengeKg : undefined

          const isVendor   = order.kind === 'angenommen'
          const isCustomer = order.kind === 'vergeben'

          const refundDeadlineIso =
            order.autoRefundAt || endOfDayIso(order.lieferdatum ?? undefined)
          const refundHint =
            (!order.shippedAt && (order.status ?? 'in_progress') === 'in_progress' && refundDeadlineIso)
              ? `Automatischer Refund in ${remainingText(refundDeadlineIso)}${isVendor ? ' – bitte rechtzeitig „Versandt“ melden.' : ' (kein Versand gemeldet).'}`
              : (order.refundedAt ? `Erstattung erfolgt am ${formatDate(asDateLike(order.refundedAt))}` : '')

          return (
            <li key={`${order.kind}-${order.orderId}`} className={`${styles.card} ${styles.cardCyan}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Link href={`/lackanfragen/artikel/${String(order.requestId)}`} className={styles.titleLink}>
                    {title}
                  </Link>
                </div>
                <span className={[
                  styles.statusBadge,
                  display.key === 'offen'     ? styles.statusActive  : '',
                  display.key === 'wartet'    ? styles.statusPending : '',
                  display.key === 'reported'  ? styles.statusPending : '',
                  display.key === 'disputed'  ? styles.statusPending : '',
                  display.key === 'confirmed' ? styles.statusDone    : '',
                  display.key === 'refunded' ? styles.statusRefunded : '',

                ].join(' ').trim()}>
                  {display.label}
                </span>
              </div>

              <div className={styles.meta}>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>{contactLabel}</div>
                  <div className={styles.metaValue}>
                    {(() => {
                      const href = profileReviewsHref(order)
                      return href
                        ? <Link href={href} className={styles.titleLink}>{contactName}</Link>
                        : <>{contactName}</>
                    })()}
                    <span className={styles.vendorRatingSmall}> · {ratingTxt}</span>
                  </div>
                </div>

                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Preis</div>
                  <div className={styles.metaValue}>
                    {formatEUR(order.amountCents)}
                    {(typeof order.itemCents === 'number' || typeof order.shippingCents === 'number') && (
                      <div style={{ fontSize:'0.9em', opacity:.8 }}>
                        Artikel {formatEUR(order.itemCents ?? order.amountCents)} · Versand {(order.shippingCents ?? 0) > 0 ? formatEUR(order.shippingCents) : 'Kostenlos'}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Lieferdatum</div>
                  <div className={styles.metaValue}>{formatDate(liefer)}</div>
                </div>

                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Menge</div>
                  <div className={styles.metaValue}>{typeof menge === 'number' ? `${menge} kg` : '—'}</div>
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

              {/* 3-Spalten-Zeile: Lieferadresse | Rechnungsadresse | Actions (rechts) */}
              <div className={styles.detailsRow}>
                {/* Lieferanschrift */}
                {isVendor && (order as any).shippingAddress ? (
                  <section className={styles.addrPanel}>
                    <h3 className={styles.addrTitle}>Lieferanschrift</h3>
                    <dl className={styles.addrDl}>
                      {(order as any).shippingAddress.company && (<><dt>Firma</dt><dd>{(order as any).shippingAddress.company}</dd></>)}
                      {(order as any).shippingAddress.firstName && (<><dt>Vorname</dt><dd>{(order as any).shippingAddress.firstName}</dd></>)}
                      {(order as any).shippingAddress.lastName && (<><dt>Nachname</dt><dd>{(order as any).shippingAddress.lastName}</dd></>)}
                      {((order as any).shippingAddress.street || (order as any).shippingAddress.houseNumber) && (
                        <><dt>Straße</dt><dd>{[(order as any).shippingAddress.street,(order as any).shippingAddress.houseNumber].filter(Boolean).join(' ')}</dd></>
                      )}
                      {((order as any).shippingAddress.zip || (order as any).shippingAddress.city) && (
                        <><dt>PLZ/Ort</dt><dd>{[(order as any).shippingAddress.zip,(order as any).shippingAddress.city].filter(Boolean).join(' ')}</dd></>
                      )}
                      {(order as any).shippingAddress.country && (<><dt>Land</dt><dd>{(order as any).shippingAddress.country}</dd></>)}
                    </dl>
                  </section>
                ) : <div />}

                {/* Rechnungsadresse */}
                {isVendor && (order as any).billingAddress ? (
                  <section className={styles.addrPanel}>
                    <h3 className={styles.addrTitle}>Rechnungsadresse</h3>
                    <dl className={styles.addrDl}>
                      {(order as any).billingAddress.company && (<><dt>Firma</dt><dd>{(order as any).billingAddress.company}</dd></>)}
                      {(order as any).billingAddress.vat && (<><dt>UID</dt><dd>{(order as any).billingAddress.vat}</dd></>)}
                      {!((order as any).billingAddress.isBusiness) && (
                        <>
                          {(order as any).billingAddress.firstName && (<><dt>Vorname</dt><dd>{(order as any).billingAddress.firstName}</dd></>)}
                          {(order as any).billingAddress.lastName &&  (<><dt>Nachname</dt><dd>{(order as any).billingAddress.lastName}</dd></>)}
                        </>
                      )}
                      {((order as any).billingAddress.street || (order as any).billingAddress.houseNumber) && (
                        <><dt>Straße</dt><dd>{[(order as any).billingAddress.street,(order as any).billingAddress.houseNumber].filter(Boolean).join(' ')}</dd></>
                      )}
                      {((order as any).billingAddress.zip || (order as any).billingAddress.city) && (
                        <><dt>PLZ/Ort</dt><dd>{[(order as any).billingAddress.zip,(order as any).billingAddress.city].filter(Boolean).join(' ')}</dd></>
                      )}
                      {(order as any).billingAddress.country && (<><dt>Land</dt><dd>{(order as any).billingAddress.country}</dd></>)}
                    </dl>
                  </section>
                ) : <div />}

                {/* Actions rechts */}
                <aside className={styles.sideCol}>
                  {isVendor && order.status === 'confirmed' && (
                    <a
                      href={`/api/invoices/${order.orderId}/download`}
                      className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                      target="_blank" rel="noopener"
                    >
                      Rechnung herunterladen (PDF)
                    </a>
                  )}

                  {isVendor && (order.status ?? 'in_progress') === 'in_progress' && (
                    <>
                      <button
                        type="button"
                        className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                        onClick={() => setShipOrder(order)}
                      >
                        Versandt melden
                      </button>
                      {refundHint && <div className={styles.btnHint}>{refundHint}</div>}
                    </>
                  )}

                  {isCustomer && order.status === 'reported' && (
                    <>
                      <button
                        type="button"
                        className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
                        onClick={() => doRelease(order)}
                      >
                        Empfang bestätigen & Zahlung freigeben
                      </button>
                      <button
                        type="button"
                        className={`${styles.ctaBtn} ${styles.ctaGhost}`}
                        onClick={() => openDispute(order)}
                      >
                        Problem melden
                      </button>
                      <div className={styles.btnHint}>Auto-Freigabe in {remainingText(order.autoReleaseAt)}</div>
                    </>
                  )}

                  {isCustomer && refundHint && !order.shippedAt && (
                    <div className={styles.btnHint}>{refundHint}</div>
                  )}

                  {order.disputeReason && (
                    <div className={styles.btnHint} style={{whiteSpace:'pre-wrap'}}>
                      <strong>Reklamationsgrund:</strong> {order.disputeReason}
                    </div>
                  )}

                  {canRateNow(order) && (
                    <button
                      type="button"
                      className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
                      onClick={() => { setRateOrderId(order.orderId); setRatingStars(5); setRatingText('') }}
                    >
                      Bewertung abgeben
                    </button>
                  )}
                </aside>
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

  /* ---------- Ladezustände ---------- */
  if (isLoading) {
    return (
      <>
        <Navbar />
        <TopLoader />
        <div className={styles.wrapper}>
          <FormSkeleton />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className={styles.wrapper}>
          <div className={styles.emptyState}><strong>Fehler beim Laden.</strong> {(error as any)?.message || 'Bitte später erneut versuchen.'}</div>
        </div>
      </>
    )
  }

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
          <select id="sort" value={sort} onChange={(e)=>setSort(e.target.value as SortKey)} className={styles.select}>
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Höchster Preis zuerst</option>
            <option value="price_asc">Niedrigster Preis zuerst</option>
          </select>

          {/* ✅ Neuer Status-Filter */}
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
            <option value="offen">Offen</option>
            <option value="reported">Versandt</option>
            <option value="disputed">Reklamiert</option>
            <option value="confirmed">Geliefert (bestätigt)</option>
            <option value="refunded">Erstattet</option>

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
            <h2 className={styles.heading}>Käufe - Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceV.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen vergeben.</strong></div>
                : <SectionList kind="vergeben" slice={sliceV} idPrefix="v" />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Verkäufe - Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceA.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen angenommen.</strong></div>
                : <SectionList kind="angenommen" slice={sliceA} idPrefix="a" />}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Verkäufe - Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceA.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen angenommen.</strong></div>
                : <SectionList kind="angenommen" slice={sliceA} idPrefix="a" />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Käufe - Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {sliceV.total === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen vergeben.</strong></div>
                : <SectionList kind="vergeben" slice={sliceV} idPrefix="v" />}
            </div>
          </>
        )}
      </div>

      {/* Modal: Verkäufer meldet „Versandt“ */}
      {shipOrder !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          onClick={(e) => { if (e.target === e.currentTarget) setShipOrder(null) }}
        >
          <div className={styles.modalContent}>
            <h3 id="confirmTitle" className={styles.modalTitle}>Versand melden?</h3>
            <p id="confirmText" className={styles.modalText}>
              Mit „Versandt melden“ informierst du den Käufer. Danach startet automatisch eine <strong>28-Tage-Frist</strong> zur Freigabe der Zahlung (Auto-Release).
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setShipOrder(null)}>Abbrechen</button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={async () => { if (shipOrder) { await doShip(shipOrder); setShipOrder(null) } }}
              >
                Ja, Versand melden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reklamation (sofortiger Refund) */}
      {disputeOrder !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="disputeTitle"
          onClick={(e) => { if (e.target === e.currentTarget) cancelDispute() }}
        >
          <div className={styles.modalContent}>
            <h3 id="disputeTitle" className={styles.modalTitle}>Problem melden</h3>
            <p className={styles.modalText}>
              Beschreibe kurz das Problem (optional). Wir geben den Grund an den Anbieter weiter. 
            </p>

            <textarea
              className={styles.reviewBox}
              value={disputeText}
              onChange={(e) => setDisputeText(e.target.value.slice(0, 800))}
              maxLength={800}
              placeholder="z. B. Menge/Qualität weicht ab, nicht geliefert…"
              rows={4}
              required
            />
            <div className={styles.btnHint} aria-live="polite">
              {disputeText.length}/800
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={cancelDispute} disabled={disputeBusy}>Abbrechen</button>
              <button type="button" className={styles.btnDanger} onClick={confirmDispute} disabled={disputeBusy}>
                {disputeBusy ? 'Wird erstattet…' : 'Problem melden & erstatten'}
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
            <h3 id="rateTitle" className={styles.modalTitle}>Gegenpartei bewerten</h3>

            {/* 1–5 Sterne */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              {[1,2,3,4,5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRatingStars(s as 1|2|3|4|5)}
                  aria-label={`${s} Sterne`}
                  style={{
                    fontSize: 28, lineHeight: 1, background: 'none', border: 'none',
                    cursor: 'pointer', opacity: s <= ratingStars ? 1 : 0.35
                  }}
                  title={`${s} Sterne`}
                >
                  ★
                </button>
              ))}
              <span style={{opacity:.8}}>
                {ratingStars === 1 ? 'neutral' : (ratingStars === 5 ? 'sehr gut' : `${ratingStars} Sterne`)}
              </span>
            </div>

            <textarea
              className={styles.reviewBox}
              value={ratingText}
              onChange={(e) => setRatingText(e.target.value)}
              placeholder="Kurz beschreiben, wie die Lieferung/Qualität war…"
              rows={4}
              maxLength={800}
              required
            />
            <div className={styles.counter} aria-live="polite">
              {ratingText.trim().length}/800
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnGhost} onClick={()=>setRateOrderId(null)}>Abbrechen</button>
              <button
                className={styles.primaryBtn}
                onClick={async () => {
                  const orderId = String(rateOrderId)
                  const comment = ratingText.trim()
                  if (!comment) { alert('Bitte einen kurzen Kommentar eingeben.'); return }
                  try {
                    const res = await fetch(`/api/orders/${orderId}/review`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ rating: ratingStars, comment }),
                    })
                    const json = await res.json().catch(()=> ({}))
                    if (!res.ok) {
                      if (res.status === 409) { alert('Du hast diese Bestellung bereits bewertet.'); setRateOrderId(null); return }
                      throw new Error(json?.error || 'Speichern fehlgeschlagen')
                    }

                    const next: LackOrder[] = orders.map((o): LackOrder =>
                      o.orderId === orderId ? { ...o, myReview: { stars: ratingStars, text: comment } } as LackOrder : o
                    )

                    persist(next)
                    try { localStorage.setItem(LS_SEEN_ORDERS, String(Date.now())) } catch {}
                    setRateOrderId(null)
                    mutate()
                  } catch (err: any) {
                    alert(err?.message || 'Speichern fehlgeschlagen')
                  }
                }}
              >
                Bewerten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LackanfragenOrdersPage
