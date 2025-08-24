'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './auftraege.module.css'
import { dummyAuftraege } from '@/data/dummyAuftraege'
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

type OrderKind = 'vergeben' | 'angenommen'
type Order = {
  jobId: string | number
  offerId?: string
  vendor?: string
  amountCents?: number
  acceptedAt: string // ISO
  kind: OrderKind
  deliveredAt?: string // ISO, gesetzt nach endgültiger Bestätigung
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

const LS_KEY  = 'myAuftraegeV2'
const TOP_KEY = 'auftraegeTop'
const PER_PAGE = 10

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
  d
    ? new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
    : '—'

function computeJobTitle(job: Job): string {
  const procs = (job.verfahren ?? []).map(v => v.name).filter(Boolean).join(' & ')
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
    const name =
      j.user.name || j.user.username || j.user.displayName || j.user.firma || j.user.company
    const rating =
      typeof j.user.rating === 'number'
        ? j.user.rating.toFixed(1)
        : (typeof j.user.sterne === 'number' ? j.user.sterne.toFixed(1) : null)
    if (name) return rating ? `${name} · ${rating}` : name
  }
  const candidates = [
    j.userName, j.username, j.name, j.kunde, j.kundenname,
    j.auftraggeber, j.auftraggeberName, j.owner, j.ownerName,
    j.company, j.firma, j.betrieb, j.kontakt?.name, j.kontakt?.firma,
    j.ersteller?.name, j.ersteller?.username,
  ]
  for (const c of candidates) if (typeof c === 'string' && c.trim()) return c.trim()
  return '—'
}

/** Interner Status (stark getypt) */
function computeStatus(job: Job): {
  key: StatusKey
  label: 'Anlieferung geplant' | 'In Bearbeitung' | 'Abholbereit/Versandt'
} {
  const now = Date.now()
  const annahme = asDateLike(job.warenannahmeDatum)
  const ausgabe = asDateLike(job.warenausgabeDatum ?? job.lieferDatum)
  if (annahme && now < +annahme) return { key: 'wartet', label: 'Anlieferung geplant' }
  if (ausgabe && now < +ausgabe) return { key: 'aktiv',  label: 'In Bearbeitung' }
  if (ausgabe && now >= +ausgabe) return { key: 'fertig', label: 'Abholbereit/Versandt' }
  return { key: 'aktiv', label: 'In Bearbeitung' }
}

/** darf „Auftrag fertig/geliefert“ klicken? → erst NACH Warenausgabe(Kunde) */
function canConfirmDelivered(job?: Job): { ok: boolean; reason: string } {
  const ausgabe = job && asDateLike(job.warenausgabeDatum ?? job.lieferDatum)
  if (!ausgabe) return { ok: false, reason: 'Kein Warenausgabe-Datum hinterlegt' }
  if (Date.now() < +ausgabe) {
    return { ok: false, reason: `Verfügbar ab ${formatDate(ausgabe)}` }
  }
  return { ok: true, reason: '' }
}

/** Status-Schlüssel inkl. delivered-Override */
function getStatusKeyFor(order: Order, job: Job): StatusKey {
  if (order.deliveredAt) return 'fertig'
  return computeStatus(job).key
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()
const daysAgo  = (d: number) => new Date(Date.now() - d * 86400_000).toISOString()

function notifyNavbarCount(count: number) {
  try {
    window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { key: 'orders', count } }))
  } catch {}
}

// Endgültig als geliefert markieren (keine Rücknahme vorgesehen)
function markDeliveredForJob(
  jobId: string | number,
  setOrdersFn: React.Dispatch<React.SetStateAction<Order[]>>
) {
  setOrdersFn(prev => {
    const next = prev.map(o =>
      String(o.jobId) === String(jobId)
        ? { ...o, deliveredAt: o.deliveredAt ?? new Date().toISOString() }
        : o
    )
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    notifyNavbarCount(next.length)
    return next
  })
}

/* ---------------- Beispiel-Aufträge ---------------- */
const EXAMPLE_ORDERS: Order[] = [
  { jobId: 3,  vendor: 'ColorTec · 4.9', amountCents:  9500, acceptedAt: hoursAgo(2),  kind: 'vergeben'   },
  { jobId: 22, vendor: 'MetalX · 4.8',   amountCents: 20000, acceptedAt: daysAgo(1),   kind: 'vergeben'   },
  { jobId: 12, vendor: 'ACME GmbH',      amountCents: 15000, acceptedAt: hoursAgo(3),  kind: 'angenommen' },
  { jobId: 5,  vendor: 'Muster AG',      amountCents: 12000, acceptedAt: daysAgo(2),   kind: 'angenommen' },
]

/* ---------------- Cursor-Utils (Shim) ---------------- */
// Wir kodieren den Offset als base64 "o:<number>"
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

/* ---------------- Component ---------------- */
const AuftraegePage: FC = () => {
  const router = useRouter()
  const params = useSearchParams()

  const jobsById = useMemo(() => {
    const m = new Map<string, Job>()
    for (const j of dummyAuftraege as Job[]) m.set(String(j.id), j)
    return m
  }, [])

  const [orders, setOrders] = useState<Order[]>([])
  const [topSection, setTopSection] = useState<OrderKind>('vergeben')
  const [query, setQuery] = useState('')
  const [sort,  setSort]  = useState<SortKey>('date_desc')
  const [statusFilter, setStatusFilter] = useState<FilterKey>('alle')

  // URL-Cursor je Sektion
  const cursorV = params.get('cursorV') // vergebene
  const cursorA = params.get('cursorA') // angenommene

  // Modal-Steuerung (welcher Job wird bestätigt?)
  const [confirmJobId, setConfirmJobId] = useState<string | number | null>(null)

  // ESC schließt Modal
  useEffect(() => {
    if (confirmJobId == null) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmJobId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmJobId])

  useEffect(() => {
    const savedTop = localStorage.getItem(TOP_KEY)
    if (savedTop === 'vergeben' || savedTop === 'angenommen') setTopSection(savedTop as OrderKind)

    try {
      const raw = localStorage.getItem(LS_KEY)
      const existing: Order[] = raw ? JSON.parse(raw) : []
      const seen = new Set(existing.map(o => `${o.kind}-${o.jobId}`))
      const merged = [...existing]
      for (const ex of EXAMPLE_ORDERS) {
        if (!jobsById.has(String(ex.jobId))) continue
        if (!seen.has(`${ex.kind}-${ex.jobId}`)) {
          seen.add(`${ex.kind}-${ex.jobId}`)
          merged.push(ex)
        }
      }
      setOrders(merged)
      localStorage.setItem(LS_KEY, JSON.stringify(merged))
      notifyNavbarCount(merged.length)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsById])

  useEffect(() => {
    const accepted = params.get('accepted')
    if (!accepted) return
    const offerId = params.get('offerId') ?? undefined
    const vendor  = params.get('vendor')  ?? undefined
    const amountParam = params.get('amount')
    const amountCents = amountParam ? Number(amountParam) : undefined
    const kindParam = (params.get('kind') || params.get('role') || params.get('side')) ?? ''
    const kind: OrderKind = (kindParam.toLowerCase() === 'angenommen' ? 'angenommen' : 'vergeben')

    setOrders(prev => {
      if (prev.some(o => String(o.jobId) === String(accepted) && o.kind === kind)) return prev
      const next: Order[] = [
        ...prev,
        { jobId: accepted, offerId, vendor, amountCents, acceptedAt: new Date().toISOString(), kind },
      ]
      localStorage.setItem(LS_KEY, JSON.stringify(next))
      notifyNavbarCount(next.length)
      return next
    })

    const clean = new URL(window.location.href)
    ;['accepted','offerId','vendor','amount','kind','role','side'].forEach(k => clean.searchParams.delete(k))
    router.replace(clean.pathname + clean.search)
  }, [params, router])

  // Top-Sektion merken
  useEffect(() => {
    localStorage.setItem(TOP_KEY, topSection)
  }, [topSection])

  /* ---------- Filter + Sort ---------- */
  const allVergeben = useMemo(
    () => orders
      .filter(o => o.kind === 'vergeben')
      .map(o => ({ order: o, job: jobsById.get(String(o.jobId)) }))
      .filter(x => !!x.job) as {order:Order, job:Job}[],
    [orders, jobsById]
  )
  const allAngenommen = useMemo(
    () => orders
      .filter(o => o.kind === 'angenommen')
      .map(o => ({ order: o, job: jobsById.get(String(o.jobId)) }))
      .filter(x => !!x.job) as {order:Order, job:Job}[],
    [orders, jobsById]
  )

  const applySearchAndFilter = (items: {order:Order, job:Job}[]) => {
    const q = query.trim().toLowerCase()
    return items.filter(({ order, job }) => {
      if (statusFilter !== 'alle') {
        const key = getStatusKeyFor(order, job)
        if (key !== statusFilter) return false
      }
      if (!q) return true
      const title = computeJobTitle(job).toLowerCase()
      const partyName = order.kind === 'vergeben' ? (order.vendor || '') : getOwnerName(job)
      return (
        String(order.jobId).toLowerCase().includes(q) ||
        title.includes(q) ||
        partyName.toLowerCase().includes(q)
      )
    })
  }

  const applySort = (items: {order: Order, job: Job}[]) => {
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

  /* ---------- Cursor-Pagination Loader (Shim) ----------
     Heute: clientseitig, schneidet Stücke aus filteredSortedX.
     Morgen: einfach diese Funktionen durch API-Fetch ersetzen.
  ----------------------------------------------------- */
  async function loadPage(
    kind: OrderKind,
    cursor: string | null | undefined,
    perPage: number
  ): Promise<PagePayload<{order: Order, job: Job}>> {
    const arr = kind === 'vergeben' ? filteredSortedV : filteredSortedA
    const offset = readCursor(cursor)
    const start = Math.min(Math.max(0, offset), Math.max(0, arr.length))
    const end = Math.min(start + perPage, arr.length)
    const items = arr.slice(start, end)
    const next = end < arr.length ? makeCursor(end) : undefined
    const prev = start > 0 ? makeCursor(Math.max(0, start - perPage)) : undefined

    // TODO (server): fetch(`/api/orders?kind=${kind}&limit=${perPage}&cursor=${cursor ?? ''}&q=${query}&sort=${sort}&status=${statusFilter}`)

    return { items, nextCursor: next, prevCursor: prev, total: arr.length }
  }

  // Seitenzustand je Sektion
  const [pageV, setPageV] = useState<PagePayload<{order:Order, job:Job}>>({ items: [] })
  const [pageA, setPageA] = useState<PagePayload<{order:Order, job:Job}>>({ items: [] })

  // Funktion: Cursor in URL setzen (für Deep-Linkbarkeit)
  const setCursorParam = (key: 'cursorV' | 'cursorA', val?: string) => {
    const url = new URL(window.location.href)
    if (!val) url.searchParams.delete(key)
    else url.searchParams.set(key, val)
    router.replace(url.pathname + '?' + url.searchParams.toString())
  }

  // Initial + bei URL/Filter/Sort/Orders neu laden
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const [pv, pa] = await Promise.all([
        loadPage('vergeben', cursorV, PER_PAGE),
        loadPage('angenommen', cursorA, PER_PAGE),
      ])
      if (ignore) return
      setPageV(pv)
      setPageA(pa)
    })()
    return () => { ignore = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorV, cursorA, filteredSortedV, filteredSortedA])

  // Bei Filter/Suche/Sort/Tab: Cursor zurücksetzen (Seite 1)
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('cursorV')
    url.searchParams.delete('cursorA')
    router.replace(url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort, statusFilter, topSection])

  /* ---------------- Section Renderer + Pager ---------------- */
  const SectionList: FC<{
    kind: OrderKind
    page: PagePayload<{order:Order, job:Job}>
    onPrev: () => void
    onNext: () => void
    totalVisible: number // Anzahl nach Filter (für Chip)
  }> = ({ kind, page, onPrev, onNext, totalVisible }) => (
    <>
      <ul className={styles.list}>
        {page.items.map(({ order, job }) => {
          const j = job as Job
          const title = computeJobTitle(j)
          const baseStatus = computeStatus(j)
          const status = order.deliveredAt
            ? ({ key: 'fertig' as StatusKey, label: 'Abholbereit/Versandt' as const })
            : baseStatus

          const annahme = asDateLike(j.warenannahmeDatum)
          const ausgabe = asDateLike(j.warenausgabeDatum ?? j.lieferDatum)

          const contactLabel = order.kind === 'vergeben' ? 'Dienstleister' : 'Auftraggeber'
          const contactValue = order.kind === 'vergeben' ? (order.vendor ?? '—') : getOwnerName(j)

          const { ok: canClick, reason } = canConfirmDelivered(j)

          return (
            <li key={`${order.kind}-${order.jobId}-${order.offerId ?? 'x'}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Link href={`/auftragsboerse/auftraege/${j.id}`} className={styles.titleLink}>
                    {title}
                  </Link>
                </div>
                <span
                  className={[
                    styles.statusBadge,
                    status.key === 'aktiv' ? styles.statusActive : '',
                    status.key === 'wartet' ? styles.statusPending : '',
                    status.key === 'fertig' ? styles.statusDone : '',
                  ].join(' ').trim()}
                >
                  {status.label}
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
                  <div className={styles.metaLabel}>Warenausgabe (Kunde)</div>
                  <div className={styles.metaValue}>{formatDate(ausgabe)}</div>
                </div>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Warenannahme (Kunde)</div>
                  <div className={styles.metaValue}>{formatDate(annahme)}</div>
                </div>

                {order.deliveredAt && (
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Bestätigt</div>
                    <div className={styles.metaValue}>{formatDate(asDateLike(order.deliveredAt))}</div>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <Link href={`/auftragsboerse/auftraege/${j.id}`} className={styles.primaryBtn}>
                  Zum Auftrag
                </Link>

                {order.kind === 'angenommen' && !order.deliveredAt && (() => {
                  const hintId = `deliver-hint-${order.kind}-${order.jobId}`
                  return (
                    <div className={styles.actionStack}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        disabled={!canClick}
                        aria-disabled={!canClick}
                        aria-describedby={!canClick ? hintId : undefined}
                        onClick={() => { if (canClick) setConfirmJobId(order.jobId) }}
                        title={canClick ? 'Bestätigt Fertigung & Lieferung – endgültig' : reason}
                      >
                        Auftrag abgeschlossen
                      </button>

                      {!canClick && (
                        <div id={hintId} className={styles.btnHint} role="note" aria-live="polite">
                          {reason}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Pager */}
      {page.total && page.total > PER_PAGE && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={onPrev}
            disabled={!page.prevCursor}
            aria-label="Vorherige Seite"
          >
            ‹
          </button>
          <span className={styles.pageInfo}>
            {Math.min(PER_PAGE, page.items.length)} / {page.total} {kind === 'vergeben' ? 'vergeben' : 'angenommen'}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={onNext}
            disabled={!page.nextCursor}
            aria-label="Nächste Seite"
          >
            ›
          </button>
        </div>
      )}
    </>
  )

  // Pager-Aktionen: Cursor vor/zurück in URL schreiben → useEffect lädt neu
  const goPrevV = () => setCursorParam('cursorV', pageV.prevCursor)
  const goNextV = () => setCursorParam('cursorV', pageV.nextCursor)
  const goPrevA = () => setCursorParam('cursorA', pageA.prevCursor)
  const goNextA = () => setCursorParam('cursorA', pageA.nextCursor)

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="search">Suchen</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Auftrags-Nr., Name oder Titel…"
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
            <h2 className={styles.heading}>Vergebene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {(pageV.total ?? filteredSortedV.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge vergeben.</strong></div>
                : <SectionList kind="vergeben" page={pageV} onPrev={goPrevV} onNext={goNextV} totalVisible={filteredSortedV.length} />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vom Auftraggeber angenommene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {(pageA.total ?? filteredSortedA.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge angenommen.</strong></div>
                : <SectionList kind="angenommen" page={pageA} onPrev={goPrevA} onNext={goNextA} totalVisible={filteredSortedA.length} />}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Vom Auftraggeber angenommene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {(pageA.total ?? filteredSortedA.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge angenommen.</strong></div>
                : <SectionList kind="angenommen" page={pageA} onPrev={goPrevA} onNext={goNextA} totalVisible={filteredSortedA.length} />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vergebene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {(pageV.total ?? filteredSortedV.length) === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge vergeben.</strong></div>
                : <SectionList kind="vergeben" page={pageV} onPrev={goPrevV} onNext={goNextV} totalVisible={filteredSortedV.length} />}
            </div>
          </>
        )}
      </div>

      {/* Modal: Endgültige Bestätigung */}
      {confirmJobId !== null && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmJobId(null) }}
        >
          <div className={styles.modalContent}>
            <h3 id="confirmTitle" className={styles.modalTitle}>Bestätigen?</h3>
            <p id="confirmText" className={styles.modalText}>
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirmJobId(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => {
                  const job = jobsById.get(String(confirmJobId))
                  const gate = canConfirmDelivered(job)
                  if (!gate.ok) {
                    alert(gate.reason || 'Noch nicht freigeschaltet.')
                    setConfirmJobId(null)
                    return
                  }
                  markDeliveredForJob(confirmJobId, setOrders)
                  setConfirmJobId(null)
                }}
              >
                Ja, endgültig bestätigen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AuftraegePage
