'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './angebote.module.css'
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
}

type Offer = {
  id: string
  jobId: string | number
  vendor: string
  priceCents: number
  createdAt: string // ISO
}

/* ================= Helpers ================= */

function asDateLike(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return new Date(v.getTime())
  const d = new Date(v as any)
  return isNaN(+d) ? undefined : d
}

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

const jobPath = (job: Job) => `/auftragsboerse/auftraege/${job.id}`
const jobPathById = (id: string | number) => `/auftragsboerse/auftraege/${id}`

const formatEUR = (c: number) =>
  (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const formatDateTime = (d?: Date) => (d ? d.toLocaleString('de-AT') : '—')

function computeValidUntil(offer: Offer, job?: Job): Date | undefined {
  const now = Date.now()
  const created = asDateLike(offer.createdAt)
  const plus72h = created ? new Date(created.getTime() + 72 * 60 * 60 * 1000) : undefined
  const ausgabe = asDateLike(job?.warenausgabeDatum ?? job?.lieferDatum)
  let dayBeforeEnd: Date | undefined
  if (ausgabe) {
    dayBeforeEnd = new Date(ausgabe)
    dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1)
    dayBeforeEnd.setHours(23, 59, 59, 999)
  }
  const candidates = [plus72h, dayBeforeEnd].filter((d): d is Date => !!d && +d > now)
  if (candidates.length === 0) return undefined
  return new Date(Math.min(...candidates.map(d => +d)))
}

function formatRemaining(target?: Date) {
  if (!target) return { text: '—', level: 'ok' as const }
  const ms = +target - Date.now()
  if (ms <= 0) return { text: 'abgelaufen', level: 'over' as const }
  const totalMinutes = Math.floor(ms / 60000)
  const days  = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60)
  const mins  = totalMinutes % 60
  let text: string
  if (days >= 1)       text = `${days} ${days === 1 ? 'Tag' : 'Tage'} ${hours} Std`
  else if (hours >= 1) text = `${hours} Std ${mins} Min`
  else                 text = `${mins} Min`
  const level = totalMinutes <= 60 ? 'critical' : (totalMinutes <= 24 * 60 ? 'soon' : 'ok')
  return { text, level: level as 'critical' | 'soon' | 'ok' }
}

/* ===== Zeit-Helper ===== */
const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

/* ===== Dummy-Angebote ===== */
const initialReceived: Offer[] = [
  { id:'r1a', jobId:3,   vendor:'Blank · 4.7',    priceCents:10000, createdAt: hoursAgo(20) },
  { id:'r1b', jobId:3,   vendor:'ColorTec · 4.9', priceCents: 9500, createdAt: hoursAgo(10) },
  { id:'r2a', jobId:12,  vendor:'AluPro · 4.6',   priceCents:15000, createdAt: hoursAgo(50) },
  { id:'r3a', jobId:22,  vendor:'MetalX · 4.8',   priceCents:20000, createdAt: hoursAgo(30) },
  { id:'r3b', jobId:22,  vendor:'CoatIt · 4.5',   priceCents:18900, createdAt: hoursAgo(28) },
]
const initialSubmitted: Offer[] = [
  { id:'s1', jobId: 5,  vendor:'Du', priceCents:12000, createdAt: hoursAgo(12) },
  { id:'s2', jobId: 15, vendor:'Du', priceCents:18000, createdAt: hoursAgo(60) },
  { id:'s3', jobId: 18, vendor:'Du', priceCents:21000, createdAt: hoursAgo(6)  },
]

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type TopSection = 'received' | 'submitted'

/* ============ Pagination-UI ============ */
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
      <div className={styles.pageInfo} id={`${idPrefix}-info`}>
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
          {/* Du kannst hier 2 lassen zum Testen */}
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
          >«</button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Vorherige Seite"
          >‹</button>
          <span className={styles.pageNow} aria-live="polite">Seite {page} / {pages}</span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            aria-label="Nächste Seite"
          >›</button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(pages)}
            disabled={page >= pages}
            aria-label="Letzte Seite"
          >»</button>
        </div>
      </div>
    </div>
  )
}

/* ================= Component ================= */

const Angebote: FC = () => {
  const router = useRouter()

  const jobsById = useMemo(() => {
    const map = new Map<string, Job>()
    for (const j of dummyAuftraege as Job[]) map.set(String(j.id), j)
    return map
  }, [])

  const OPEN_JOB_IDS = useMemo(() => {
    const ids = new Set<string>(['1'])
    for (const o of initialReceived) ids.add(String(o.jobId))
    return Array.from(ids)
  }, [])

  const [receivedData, setReceivedData] = useState<Offer[]>(initialReceived)
  const [submittedData, setSubmittedData] = useState<Offer[]>(initialSubmitted)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  // Modal-Zustand
  const [confirmOffer, setConfirmOffer] = useState<null | {
    jobId: string | number
    offerId: string
    amountCents: number
    vendor: string
  }>(null)

  // ESC schließt Modal
  useEffect(() => {
    if (!confirmOffer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmOffer(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOffer])

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')

  const [topSection, setTopSection] = useState<TopSection>('received')
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('angeboteTop') : null
    if (saved === 'received' || saved === 'submitted') setTopSection(saved)
  }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('angeboteTop', topSection)
  }, [topSection])

  const pruneExpiredOffers = () => {
    const now = Date.now()
    setReceivedData(prev =>
      prev.filter(o => {
        const job = jobsById.get(String(o.jobId))
        const vu = computeValidUntil(o, job)
        return !!vu && +vu > now
      })
    )
    setSubmittedData(prev =>
      prev.filter(o => {
        const job = jobsById.get(String(o.jobId))
        const vu = computeValidUntil(o, job)
        return !!vu && +vu > now
      })
    )
  }

  useEffect(() => {
    pruneExpiredOffers()
    const id = setInterval(pruneExpiredOffers, 60_000)
    const onVis = () => { if (!document.hidden) pruneExpiredOffers() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  /* ===== Filter + Sort ===== */
  const receivedGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const groups = OPEN_JOB_IDS.map(id => {
      const job = jobsById.get(String(id))
      const titleLC = job ? computeJobTitle(job).toLowerCase() : `auftrag #${id}`
      const offersForJob = receivedData.filter(o => String(o.jobId) === String(id))
      const offers = offersForJob.filter(o =>
        !q ||
        String(o.jobId).toLowerCase().includes(q) ||
        o.vendor.toLowerCase().includes(q) ||
        titleLC.includes(q)
      )
      const showNoOffersGroup = offersForJob.length === 0 && (!q || titleLC.includes(q))
      const bestPrice = offers.length ? Math.min(...offers.map(o => o.priceCents)) : Infinity
      const latest = offers.length ? Math.max(...offers.map(o => +new Date(o.createdAt))) : 0
      return { jobId: String(id), job, offers, showNoOffersGroup, bestPrice, latest }
    })
    const visible = groups.filter(g => g.offers.length > 0 || g.showNoOffersGroup)
    visible.sort((a, b) => {
      if (sort === 'date_desc')  return b.latest - a.latest
      if (sort === 'date_asc')   return a.latest - b.latest
      if (sort === 'price_desc') return b.bestPrice - a.bestPrice
      if (sort === 'price_asc')  return a.bestPrice - b.bestPrice
      return 0
    })
    return visible
  }, [OPEN_JOB_IDS, jobsById, receivedData, query, sort])

  const submitted = useMemo(() => {
    let arr = submittedData
    if (query.trim()) {
      const q = query.toLowerCase()
      arr = arr.filter(o => String(o.jobId).toLowerCase().includes(q))
    }
    arr = [...arr].sort((a, b) => {
      if (sort === 'date_desc')  return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'date_asc')   return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'price_desc') return b.priceCents - a.priceCents
      if (sort === 'price_asc')  return a.priceCents - b.priceCents
      return 0
    })
    return arr
  }, [submittedData, query, sort])

  /* ===== Pagination-States (persistiert) ===== */
  const [pageRec, setPageRec] = useState(1)
  const [psRec, setPsRec] = useState<number>(10)

  const [pageSub, setPageSub] = useState(1)
  const [psSub, setPsSub] = useState<number>(10)

  // initial aus localStorage
  useEffect(() => {
    try {
      const a = Number(localStorage.getItem('angebote:ps:received')) || 10
      const b = Number(localStorage.getItem('angebote:ps:submitted')) || 10
      if (a) setPsRec(a)
      if (b) setPsSub(b)
    } catch {}
  }, [])
  // speichern
  useEffect(() => { try { localStorage.setItem('angebote:ps:received', String(psRec)) } catch {} }, [psRec])
  useEffect(() => { try { localStorage.setItem('angebote:ps:submitted', String(psSub)) } catch {} }, [psSub])

  // bei Such-/Sort-Änderung Seite zurücksetzen
  useEffect(() => { setPageRec(1); setPageSub(1) }, [query, sort])

  // Slice-Helfer
  function sliceByPage<T>(arr: T[], page: number, ps: number) {
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

  // Slices berechnen
  const rec = sliceByPage(receivedGroups, pageRec, psRec)
  useEffect(() => { if (rec.safePage !== pageRec) setPageRec(rec.safePage) }, [rec.safePage, pageRec])

  const sub = sliceByPage(submitted, pageSub, psSub)
  useEffect(() => { if (sub.safePage !== pageSub) setPageSub(sub.safePage) }, [sub.safePage, pageSub])

  /* ===== Payment + Modal ===== */
  function paymentUrl({ jobId, offerId, amountCents, vendor }: { jobId: string | number, offerId: string, amountCents: number, vendor: string }) {
    return (
      `/zahlung?jobId=${encodeURIComponent(String(jobId))}` +
      `&offerId=${encodeURIComponent(offerId)}` +
      `&amount=${amountCents}` +
      `&vendor=${encodeURIComponent(vendor)}` +
      `&returnTo=${encodeURIComponent('/konto/auftraege')}`
    )
  }
  function openConfirm(jobId: string | number, offerId: string, amountCents: number, vendor: string) {
    setConfirmOffer({ jobId, offerId, amountCents, vendor })
  }
  function confirmAccept() {
    if (!confirmOffer) return
    setAcceptingId(confirmOffer.offerId)
    const url = paymentUrl(confirmOffer)
    setConfirmOffer(null)
    router.push(url)
  }

  const cols = '2fr 1fr 1.6fr 1fr'

  const ReceivedSection = () => (
    <>
      <h2 className={styles.heading}>Erhaltene Angebote für deine zu vergebenden Aufträge</h2>
      <div className={styles.kontoContainer}>
        {rec.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine Aufträge/Angebote sichtbar.</strong></div>
        ) : (
          <>
            <ul className={styles.groupList}>
              {rec.pageItems.map(({ jobId, job, offers, showNoOffersGroup, bestPrice }) => {
                const title = job ? computeJobTitle(job) : `Auftrag #${jobId}`
                const href  = job ? jobPath(job) : jobPathById(jobId)
                return (
                  <li key={jobId} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div className={styles.groupTitle}>
                        <Link href={href} className={styles.titleLink}>{title}</Link>
                        <span className={styles.groupCounter}>
                          {offers.length} {offers.length === 1 ? 'Angebot' : 'Angebote'}
                        </span>
                        {offers.length > 0 && (
                          <span className={styles.bestPrice}>{formatEUR(bestPrice)}</span>
                        )}
                      </div>
                      <div className={styles.groupActions}>
                        <Link href={href} className={styles.jobLink}>Zum Auftrag</Link>
                      </div>
                    </div>

                    {offers.length === 0 && showNoOffersGroup ? (
                      <div className={styles.groupFootNote}>Derzeit keine gültigen Angebote.</div>
                    ) : (
                      <div className={styles.offerTable} role="table" aria-label="Angebote zu diesem Auftrag">
                        {offers.length >= 1 && (
                          <div className={styles.offerHeader} role="row" style={{ gridTemplateColumns: cols }}>
                            <div role="columnheader">Anbieter</div>
                            <div role="columnheader">Preis</div>
                            <div role="columnheader">Angebot gültig bis</div>
                            <div role="columnheader" className={styles.colAction}>Aktion</div>
                          </div>
                        )}

                        {offers
                          .slice()
                          .sort((a,b)=>a.priceCents-b.priceCents)
                          .map(o => {
                            const j = jobsById.get(String(o.jobId))
                            const validUntil = computeValidUntil(o, j)!
                            const remaining = formatRemaining(validUntil)
                            return (
                              <div key={o.id} className={styles.offerRow} role="row" style={{ gridTemplateColumns: cols }}>
                                <div role="cell" data-label="Anbieter">
                                  <span className={styles.vendor}>{o.vendor}</span>
                                  {o.priceCents === bestPrice && offers.length > 1 && (
                                    <span className={styles.tagBest}>Bester Preis</span>
                                  )}
                                </div>
                                <div role="cell" className={styles.priceCell} data-label="Preis">
                                  {formatEUR(o.priceCents)}
                                </div>
                                <div role="cell" className={styles.validCell} data-label="Gültig bis">
                                  <span>{formatDateTime(validUntil)}</span>
                                  <span
                                    className={[
                                      styles.expBadge,
                                      remaining.level === 'soon' ? styles.expSoon : '',
                                      remaining.level === 'critical' ? styles.expCritical : '',
                                    ].join(' ')}
                                  >
                                    läuft ab in {remaining.text}
                                  </span>
                                </div>
                                <div role="cell" className={styles.colAction} data-label="Aktion">
                                  <button
                                    type="button"
                                    className={styles.acceptBtn}
                                    disabled={acceptingId === o.id}
                                    onClick={() => openConfirm(o.jobId, o.id, o.priceCents, o.vendor)}
                                    title="Anbieter beauftragen"
                                  >
                                    {acceptingId === o.id ? 'Wird angenommen…' : 'Auftrag vergeben'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <Pagination
              page={rec.safePage}
              setPage={setPageRec}
              pageSize={psRec}
              setPageSize={setPsRec}
              total={rec.total}
              from={rec.from}
              to={rec.to}
              idPrefix="rec"
            />
          </>
        )}
      </div>
    </>
  )

  const SubmittedSection = () => (
    <>
      <h2 className={styles.heading}>Übersicht zu deinen abgegebenen Angeboten</h2>
      <div className={styles.kontoContainer}>
        {sub.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine gültigen Angebote abgegeben.</strong></div>
        ) : (
          <>
            <ul className={styles.list}>
              {sub.pageItems.map(o => {
                const job   = jobsById.get(String(o.jobId))
                const title = job ? computeJobTitle(job) : `Auftrag #${o.jobId} (nicht verfügbar)`
                const href  = job ? jobPath(job) : '/auftragsboerse'
                const validUntil = computeValidUntil(o, job)!
                const remaining = formatRemaining(validUntil)
                return (
                  <li key={o.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>
                        <Link href={href} className={styles.titleLink}>{title}</Link>
                      </div>
                      <div className={styles.price}>{formatEUR(o.priceCents)}</div>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>Auftrags-Nr.: <strong>{o.jobId}</strong></span>
                      <span className={styles.metaItem}>
                        Gültig bis: {formatDateTime(validUntil)}{' '}
                        <span
                          className={[
                            styles.expBadge,
                            remaining.level === 'soon' ? styles.expSoon : '',
                            remaining.level === 'critical' ? styles.expCritical : '',
                          ].join(' ')}
                        >
                          läuft ab in {remaining.text}
                        </span>
                      </span>
                    </div>
                    <div className={styles.actions}>
                      <Link href={href} className={styles.jobLink}>Zum Auftrag</Link>
                    </div>
                  </li>
                )
              })}
            </ul>

            <Pagination
              page={sub.safePage}
              setPage={setPageSub}
              pageSize={psSub}
              setPageSize={setPsSub}
              total={sub.total}
              from={sub.from}
              to={sub.to}
              idPrefix="sub"
            />
          </>
        )}
      </div>
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
            placeholder="Auftrags-Nr., Anbieter oder Titel…"
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
            <option value="price_desc">Bester Preis zuletzt</option>
            <option value="price_asc">Bester Preis zuerst</option>
          </select>

          <div className={styles.segmented} role="tablist" aria-label="Reihenfolge wählen">
            <button
              role="tab"
              aria-selected={topSection === 'received'}
              className={`${styles.segmentedBtn} ${topSection === 'received' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('received')}
              type="button"
            >
              Erhaltene oben
            </button>
            <button
              role="tab"
              aria-selected={topSection === 'submitted'}
              className={`${styles.segmentedBtn} ${topSection === 'submitted' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('submitted')}
              type="button"
            >
              Abgegebene oben
            </button>
          </div>
        </div>

        {/* Reihenfolge nach Wahl */}
        {topSection === 'received' ? (
          <>
            <ReceivedSection />
            <hr className={styles.divider} />
            <SubmittedSection />
          </>
        ) : (
          <>
            <SubmittedSection />
            <hr className={styles.divider} />
            <ReceivedSection />
          </>
        )}
      </div>

      {/* ===== Modal „Auftrag vergeben“ ===== */}
      {confirmOffer && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOffer(null) }}
        >
          <div className={styles.modalContent}>
            <h3 id="confirmTitle" className={styles.modalTitle}>Bestätigen?</h3>
            <p id="confirmText" className={styles.modalText}>
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className={styles.modalSummary}>
              <div><strong>Auftragnummer:</strong> #{String(confirmOffer.jobId)}</div>
              <div><strong>Auftragnehmer:</strong> {confirmOffer.vendor}</div>
              <div><strong>Preis:</strong> {formatEUR(confirmOffer.amountCents)}</div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirmOffer(null)}>
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={confirmAccept}
              >
                Ja, endgültig vergeben
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Angebote
