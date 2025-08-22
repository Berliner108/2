'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Pager from './../navbar/pager'
import styles from './auftraege.module.css'
import { dummyAuftraege } from '@/data/dummyAuftraege'

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
  // aus dummyAuftraege: user ist ein String wie "Schlosserei Kalb - 4.5"
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
}

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'

const LS_KEY  = 'myAuftraegeV2'
const TOP_KEY = 'auftraegeTop' // 'vergeben' | 'angenommen'

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

// nur Datum (TT.MM.JJ), ohne Uhrzeit
const formatDate = (d?: Date) =>
  d
    ? new Intl.DateTimeFormat('de-AT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d)
    : '—'

// Auftragstitel
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

// Auftraggebername (Owner) aus dem Job (dummyAuftraege.user)
function getOwnerName(job: Job): string {
  const j: any = job

  // 1) user als String
  if (typeof j.user === 'string' && j.user.trim()) return j.user.trim()

  // 2) user als Objekt (Fallbacks)
  if (j.user && typeof j.user === 'object') {
    const name =
      j.user.name ||
      j.user.username ||
      j.user.displayName ||
      j.user.firma ||
      j.user.company
    const rating =
      typeof j.user.rating === 'number'
        ? j.user.rating.toFixed(1)
        : (typeof j.user.sterne === 'number' ? j.user.sterne.toFixed(1) : null)
    if (name) return rating ? `${name} · ${rating}` : name
  }

  // 3) sonstige mögliche Felder
  const candidates = [
    j.userName, j.username, j.name,
    j.kunde, j.kundenname,
    j.auftraggeber, j.auftraggeberName,
    j.owner, j.ownerName,
    j.company, j.firma, j.betrieb,
    j.kontakt?.name, j.kontakt?.firma,
    j.ersteller?.name, j.ersteller?.username,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
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

/* ---------------- Beispiel-Aufträge (werden gemerged) ---------------- */
const EXAMPLE_ORDERS: Order[] = [
  // Vergebene (du hast jemand beauftragt)
  { jobId: 3,  vendor: 'ColorTec · 4.9', amountCents:  9500, acceptedAt: hoursAgo(2),  kind: 'vergeben'   },
  { jobId: 22, vendor: 'MetalX · 4.8',   amountCents: 20000, acceptedAt: daysAgo(1),   kind: 'vergeben'   },
  // Angenommene (du wurdest beauftragt)
  { jobId: 12, vendor: 'ACME GmbH',      amountCents: 15000, acceptedAt: hoursAgo(3),  kind: 'angenommen' },
  { jobId: 5,  vendor: 'Muster AG',      amountCents: 12000, acceptedAt: daysAgo(2),   kind: 'angenommen' },
]

/* ---------------- Component ---------------- */
const AuftraegePage: FC = () => {
  const router = useRouter()
  const params = useSearchParams()

  // Jobs-Index
  const jobsById = useMemo(() => {
    const m = new Map<string, Job>()
    for (const j of dummyAuftraege as Job[]) m.set(String(j.id), j)
    return m
  }, [])

  const [orders, setOrders] = useState<Order[]>([])
  const [topSection, setTopSection] = useState<OrderKind>('vergeben')

  // Toolbar-States (wie Angebotsseite)
  const [query, setQuery] = useState('')
  const [sort,  setSort]  = useState<SortKey>('date_desc')

  // Initial laden + Beispiele mergen + Top-Sektion aus localStorage
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
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsById])

  // Neue Annahme via Query übernehmen (Rücksprung z.B. von /zahlung)
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
      // Navbar-Badge anstoßen (optional)
      window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { key: 'orders', count: next.length } }))
      return next
    })

    // URL säubern
    const clean = new URL(window.location.href)
    ;['accepted','offerId','vendor','amount','kind','role','side'].forEach(k => clean.searchParams.delete(k))
    router.replace(clean.pathname + clean.search)
  }, [params, router])

  // Top-Sektion merken
  useEffect(() => {
    localStorage.setItem(TOP_KEY, topSection)
  }, [topSection])

  // Basis-Splits
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

  // Suche + Sortierung (wie Angebotsseite), inkl. Owner-Name für „angenommen“
  const applySearch = (items: {order: Order, job: Job}[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(({ order, job }) => {
      const title = computeJobTitle(job).toLowerCase()
      const partyName =
        order.kind === 'vergeben'
          ? (order.vendor || '')
          : getOwnerName(job)
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
        const status = computeStatus(j)
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
            </div>

            <div className={styles.actions}>
              <Link href={`/auftragsboerse/auftraege/${j.id}`} className={styles.primaryBtn}>
                Zum Auftrag
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        {/* Toolbar (wie Angebotsseite): Suche + Sort + Segmented */}
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

        {/* Reihenfolge nach Wahl */}
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
    </>
  )
}

export default AuftraegePage
