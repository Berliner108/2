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

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'

const LS_KEY  = 'myAuftraegeV2'
const TOP_KEY = 'auftraegeTop'

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

function computeStatus(job: Job) {
  const now = Date.now()
  const annahme = asDateLike(job.warenannahmeDatum)
  const ausgabe = asDateLike(job.warenausgabeDatum ?? job.lieferDatum)
  if (annahme && now < +annahme) return { key: 'wartet', label: 'Anlieferung geplant' as const }
  if (ausgabe && now < +ausgabe) return { key: 'aktiv',  label: 'In Bearbeitung' as const }
  if (ausgabe && now >= +ausgabe) return { key: 'fertig', label: 'Abholbereit/Versandt' as const }
  return { key: 'aktiv', label: 'In Bearbeitung' as const }
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

  // NEW: Modal-Steuerung (welcher Job wird bestätigt?)
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

  useEffect(() => {
    localStorage.setItem(TOP_KEY, topSection)
  }, [topSection])

  const vergebenRaw = useMemo(
    () => orders
      .filter(o => o.kind === 'vergeben')
      .map(o => ({ order: o, job: jobsById.get(String(o.jobId)) }))
      .filter(x => !!x.job) as {order:Order, job:Job}[],
    [orders, jobsById]
  )
  const angenommenRaw = useMemo(
    () => orders
      .filter(o => o.kind === 'angenommen')
      .map(o => ({ order: o, job: jobsById.get(String(o.jobId)) }))
      .filter(x => !!x.job) as {order:Order, job:Job}[],
    [orders, jobsById]
  )

  const applySearch = (items: {order: Order, job: Job}[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(({ order, job }) => {
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

  const vergeben   = useMemo(() => applySort(applySearch(vergebenRaw)),   [vergebenRaw, query, sort])
  const angenommen = useMemo(() => applySort(applySearch(angenommenRaw)), [angenommenRaw, query, sort])

  const SectionList: FC<{items: {order: Order, job: Job}[]}> = ({ items }) => (
    <ul className={styles.list}>
      {items.map(({ order, job }) => {
        const j = job as Job
        const title = computeJobTitle(j)
        const baseStatus = computeStatus(j)
        const status = order.deliveredAt
          ? ({ key: 'fertig' as const, label: 'Geliefert (bestätigt)' as const })
          : baseStatus
        const annahme = asDateLike(j.warenannahmeDatum)
        const ausgabe = asDateLike(j.warenausgabeDatum ?? j.lieferDatum)
        const contactLabel = order.kind === 'vergeben' ? 'Dienstleister' : 'Auftraggeber'
        const contactValue = order.kind === 'vergeben' ? (order.vendor ?? '—') : getOwnerName(j)

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

              {order.kind === 'angenommen' && !order.deliveredAt && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setConfirmJobId(order.jobId)}
                  title="Bestätigt Fertigung & Lieferung – endgültig"
                >
                  Auftrag gefertigt 
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )

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

          <div className={styles.segmented} role="tablist" aria-label="Reihenfolge wählen">
            <button
              role="tab"
              aria-selected={topSection === 'vergeben'}
              className={`${styles.segmentedBtn} ${topSection === 'vergeben' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('vergeben')}
              type="button"
            >
              Vergebene oben <span className={styles.chip}>{vergeben.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={topSection === 'angenommen'}
              className={`${styles.segmentedBtn} ${topSection === 'angenommen' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('angenommen')}
              type="button"
            >
              Angenommene oben <span className={styles.chip}>{angenommen.length}</span>
            </button>
          </div>
        </div>

        {topSection === 'vergeben' ? (
          <>
            <h2 className={styles.heading}>Vergebene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {vergeben.length === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge vergeben.</strong></div>
                : <SectionList items={vergeben} />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vom Auftraggeber angenommene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {angenommen.length === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge angenommen.</strong></div>
                : <SectionList items={angenommen} />}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.heading}>Vom Auftraggeber angenommene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {angenommen.length === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge angenommen.</strong></div>
                : <SectionList items={angenommen} />}
            </div>

            <hr className={styles.divider} />

            <h2 className={styles.heading}>Vergebene Aufträge</h2>
            <div className={styles.kontoContainer}>
              {vergeben.length === 0
                ? <div className={styles.emptyState}><strong>Noch keine Aufträge vergeben.</strong></div>
                : <SectionList items={vergeben} />}
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
                onClick={() => { markDeliveredForJob(confirmJobId, setOrders); setConfirmJobId(null) }}
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
