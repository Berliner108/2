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

type PagePayload<T> = {
  items: T[]
  nextCursor?: string
  prevCursor?: string
  total?: number
}

const LS_KEY  = 'myLackOrdersV1'
const TOP_KEY = 'lackAuftraegeTop'
const PER_PAGE = 10
const AUTO_RELEASE_DAYS = 14

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
  if (liefer && now < +liefer) return { key: 'aktiv',  label: 'In Bearbeitung' }
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

/* ---------- Cursor-Utils ---------- */
const makeCursor = (offset: number) => btoa(`o:${offset}`)
const readCursor = (cursor?: string | null) => {
  if (!cursor) return 0
  try {
    const t = atob(cursor)
    if (!t.startsWith('o:')) return 0
    const n = parseInt(t.slice(2), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch { return 0 }
}

/* ---------- Beispiel-Aufträge (Lack) ---------- */
const EXAMPLE_ORDERS: LackOrder[] = [
  { requestId: '1', vendor: 'LackPro · 4.7', amountCents:  9900, acceptedAt: hoursAgo(2),  kind: 'vergeben'   },
  { requestId: '3', vendor: 'PowderX · 4.6', amountCents: 14900, acceptedAt: daysAgo(1),   kind: 'vergeben'   },
  { requestId: '4', vendor: 'CoatHub · 4.8', amountCents: 21000, acceptedAt: hoursAgo(3),  kind: 'angenommen' },
  { requestId: '2', vendor: 'Du',            amountCents: 12000, acceptedAt: daysAgo(2),   kind: 'angenommen' },
]

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
  const [sort,  setSort]  = useState<SortKey>('date_desc')
  const [statusFilter, setStatusFilter] = useState<FilterKey>('alle')

  // URL-Cursor je Sektion
  const cursorV = params.get('cursorV') // vergebene
  const cursorA = params.get('cursorA') // angenommene

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
      ;['accepted','offerId','vendor','amount','kind','role','side','requestId'].forEach(k => clean.searchParams.delete(k))
      router.replace(clean.pathname + clean.search)
    }
  }, [params, router])

  // Top-Sektion merken
  useEffect(() => { localStorage.setItem(TOP_KEY, topSection) }, [topSection])

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

  const applySearchAndFilter = (items: {order:LackOrder, artikel:Artikel}[]) => {
    const q = query.trim().toLowerCase()
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
    () => applySort(applySearchAndFilter(allVergeben)),
    [allVergeben, query, sort, statusFilter]
  )
  const filteredSortedA = useMemo(
    () => applySort(applySearchAndFilter(allAngenommen)),
    [allAngenommen, query, sort, statusFilter]
  )

  /* ---------- Cursor-Pagination ---------- */
  async function loadPage(
    kind: OrderKind,
    cursor: string | null | undefined,
    perPage: number
  ): Promise<PagePayload<{order: LackOrder, artikel: Artikel}>> {
    const arr = kind === 'vergeben' ? filteredSortedV : filteredSortedA
    const offset = readCursor(cursor)
    const start = Math.min(Math.max(0, offset), Math.max(0, arr.length))
    const end = Math.min(start + perPage, arr.length)
    const items = arr.slice(start, end)
    const next = end < arr.length ? makeCursor(end) : undefined
    const prev = start > 0 ? makeCursor(Math.max(0, start - perPage)) : undefined
    return { items, nextCursor: next, prevCursor: prev, total: arr.length }
  }

  const [pageV, setPageV] = useState<PagePayload<{order:LackOrder, artikel:Artikel}>>({ items: [] })
  const [pageA, setPageA] = useState<PagePayload<{order:LackOrder, artikel:Artikel}>>({ items: [] })

  const setCursorParam = (key: 'cursorV' | 'cursorA', val?: string) => {
    const url = new URL(window.location.href)
    if (!val) url.searchParams.delete(key)
    else url.searchParams.set(key, val)
    router.replace(url.pathname + '?' + url.searchParams.toString())
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      const [pv, pa] = await Promise.all([
        loadPage('vergeben', cursorV, PER_PAGE),
        loadPage('angenommen', cursorA, PER_PAGE),
      ])
      if (ignore) return
      setPageV(pv); setPageA(pa)
    })()
    return () => { ignore = true }
  }, [cursorV, cursorA, filteredSortedV, filteredSortedA]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('cursorV')
    url.searchParams.delete('cursorA')
    router.replace(url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''))
  }, [query, sort, statusFilter, topSection]) // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ---------- Section Renderer + Pager ---------- */
  const SectionList: FC<{
    kind: OrderKind
    page: PagePayload<{order:LackOrder, artikel:Artikel}>
    onPrev: () => void
    onNext: () => void
    totalVisible: number
    onConfirmDelivered: (requestId: string | number) => void
  }> = ({ kind, page, onPrev, onNext, onConfirmDelivered }) => (
    <>
      <ul className={styles.list}>
        {page.items.map(({ order, artikel }) => {
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

                {/* Anbieter: „Auftrag abgeschlossen“ (nur solange nicht gemeldet/rekla/confirmed) */}
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
      {page.total && page.total > PER_PAGE && (
        <div className={styles.pagination}>
          <div className={styles.pagiControls}>
            <div className={styles.pageButtons}>
              <button type="button" className={styles.pageBtn} onClick={onPrev} disabled={!page.prevCursor} aria-label="Vorherige Seite">‹</button>
              <button type="button" className={styles.pageBtn} onClick={onNext} disabled={!page.nextCursor} aria-label="Nächste Seite">›</button>
            </div>
            <span className={styles.pageInfo}>
              {page.items.length} / {page.total}
            </span>
          </div>
        </div>
      )}
    </>
  )

  // Pager-Aktionen
  const goPrevV = () => setCursorParam('cursorV', pageV.prevCursor)
  const goNextV = () => setCursorParam('cursorV', pageV.nextCursor)
  const goPrevA = () => setCursorParam('cursorA', pageA.prevCursor)
  const goNextA = () => setCursorParam('cursorA', pageA.nextCursor)

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
              {(pageV.total ?? filteredSortedV.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen vergeben.</strong></div>
                : <SectionList
                    kind="vergeben"
                    page={pageV}
                    onPrev={goPrevV}
                    onNext={goNextV}
                    totalVisible={filteredSortedV.length}
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vom Auftraggeber angenommene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {(pageA.total ?? filteredSortedA.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen angenommen.</strong></div>
                : <SectionList
                    kind="angenommen"
                    page={pageA}
                    onPrev={goPrevA}
                    onNext={goNextA}
                    totalVisible={filteredSortedA.length}
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Vom Auftraggeber angenommene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {(pageA.total ?? filteredSortedA.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen angenommen.</strong></div>
                : <SectionList
                    kind="angenommen"
                    page={pageA}
                    onPrev={goPrevA}
                    onNext={goNextA}
                    totalVisible={filteredSortedA.length}
                    onConfirmDelivered={confirmDelivered}
                  />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vergebene Lackanfragen</h2>
            <div className={styles.kontoContainer}>
              {(pageV.total ?? filteredSortedV.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Lackanfragen vergeben.</strong></div>
                : <SectionList
                    kind="vergeben"
                    page={pageV}
                    onPrev={goPrevV}
                    onNext={goNextV}
                    totalVisible={filteredSortedV.length}
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
