'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './lackanfragen.module.css' // gleicher Look & Feel
import { artikelDaten, type Artikel } from '@/data/ArtikelDatenLackanfragen'

type LackOffer = {
  id: string
  requestId: string | number
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

function computeItemTitle(a: Artikel): string {
  // Haupttitel + nützliche Extras (Hersteller · Ort · Menge)
  const extras = [a.hersteller, a.ort, (a.menge ? `${a.menge} kg` : '')].filter(Boolean).join(' · ')
  return [a.titel, extras].filter(Boolean).join(' — ')
}

const itemPath   = (a: Artikel) => `/lackanfragen/artikel/${encodeURIComponent(String(a.id))}`
const itemPathBy = (id: string | number) => `/lackanfragen/artikel/${encodeURIComponent(String(id))}`

const formatEUR = (c: number) =>
  (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const formatDateTime = (d?: Date) => (d ? d.toLocaleString('de-AT') : '—')

/** Gültig bis: min(created+72h, (lieferdatum - 1 Tag, 23:59)) */
function computeValidUntil(offer: LackOffer, artikel?: Artikel): Date | undefined {
  const now = Date.now()
  const created = asDateLike(offer.createdAt)
  const plus72h = created ? new Date(created.getTime() + 72 * 60 * 60 * 1000) : undefined

  const liefer = asDateLike(artikel?.lieferdatum)
  let dayBeforeEnd: Date | undefined
  if (liefer) {
    dayBeforeEnd = new Date(liefer)
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

/* ===== Dummy-Angebote (Lack) =====
   requestId referenziert Artikel.id (string in deinen Beispieldaten)
*/
const initialReceived: LackOffer[] = [
  { id:'r1a', requestId:'1', vendor:'LackPro · 4.7',    priceCents: 9900, createdAt: hoursAgo(20) },
  { id:'r1b', requestId:'1', vendor:'ColorTec · 4.9',   priceCents: 9500, createdAt: hoursAgo(10) },
  { id:'r2a', requestId:'3', vendor:'PowderX · 4.6',    priceCents:14900, createdAt: hoursAgo(50) },
  { id:'r3a', requestId:'4', vendor:'CoatHub · 4.8',    priceCents:21000, createdAt: hoursAgo(30) },
  { id:'r3b', requestId:'4', vendor:'CoatIt · 4.5',     priceCents:18900, createdAt: hoursAgo(28) },
]
const initialSubmitted: LackOffer[] = [
  { id:'s1', requestId:'2', vendor:'Du', priceCents:12000, createdAt: hoursAgo(12) },
  { id:'s2', requestId:'3', vendor:'Du', priceCents:18000, createdAt: hoursAgo(60) },
  { id:'s3', requestId:'4', vendor:'Du', priceCents:21000, createdAt: hoursAgo(6)  },
]

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type TopSection = 'received' | 'submitted'

/* ===== Defaults & Allowed PageSizes ===== */
const DEFAULTS = {
  q: '',
  sort: 'date_desc' as SortKey,
  tab: 'received' as TopSection,
  psRec: 10,
  psSub: 10,
  pageRec: 1,
  pageSub: 1,
}
const ALLOWED_PS = [2, 10, 20, 50]

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

const LackanfragenAngebote: FC = () => {
  const router = useRouter()

  const itemsById = useMemo(() => {
    const map = new Map<string, Artikel>()
    for (const a of artikelDaten as Artikel[]) map.set(String(a.id), a)
    return map
  }, [])

  // Alle sichtbaren Lackanfragen (Gruppen) – zeigt auch Gruppen ohne Angebote
  const OPEN_REQUEST_IDS = useMemo(() => Array.from(itemsById.keys()), [itemsById])

  const [receivedData, setReceivedData] = useState<LackOffer[]>(initialReceived)
  const [submittedData, setSubmittedData] = useState<LackOffer[]>(initialSubmitted)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  // Modal-Zustand
  const [confirmOffer, setConfirmOffer] = useState<null | {
    requestId: string | number
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
    try { localStorage.setItem('lack-angeboteTop', topSection) } catch {}
  }, [topSection])

  // Abgelaufene Angebote entfernen
  const pruneExpiredOffers = () => {
    const now = Date.now()
    setReceivedData(prev =>
      prev.filter(o => {
        const a = itemsById.get(String(o.requestId))
        const vu = computeValidUntil(o, a)
        return !!vu && +vu > now
      })
    )
    setSubmittedData(prev =>
      prev.filter(o => {
        const a = itemsById.get(String(o.requestId))
        const vu = computeValidUntil(o, a)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Preis-Comparator (Infinity robust)
  const compareBestPrice = (a: number, b: number, dir: 'asc' | 'desc') => {
    const aInf = !Number.isFinite(a), bInf = !Number.isFinite(b)
    if (aInf && bInf) return 0
    if (aInf) return 1
    if (bInf) return -1
    return dir === 'asc' ? a - b : b - a
  }

  /* ===== Filter + Sort ===== */
  const receivedGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const groups = OPEN_REQUEST_IDS.map(id => {
      const artikel = itemsById.get(String(id))
      const titleLC = artikel ? computeItemTitle(artikel).toLowerCase() : `anfrage #${id}`
      const offersForItem = receivedData.filter(o => String(o.requestId) === String(id))
      const offers = offersForItem.filter(o =>
        !q ||
        String(o.requestId).toLowerCase().includes(q) ||
        o.vendor.toLowerCase().includes(q) ||
        titleLC.includes(q)
      )
      const showNoOffersGroup = offersForItem.length === 0 && (!q || titleLC.includes(q))
      const bestPrice = offers.length ? Math.min(...offers.map(o => o.priceCents)) : Infinity
      const latest = offers.length ? Math.max(...offers.map(o => +new Date(o.createdAt))) : 0
      return { requestId: String(id), artikel, offers, showNoOffersGroup, bestPrice, latest }
    })
    const visible = groups.filter(g => g.offers.length > 0 || g.showNoOffersGroup)
    visible.sort((a, b) => {
      if (sort === 'date_desc')  return b.latest - a.latest
      if (sort === 'date_asc')   return a.latest - b.latest
      if (sort === 'price_desc') return compareBestPrice(a.bestPrice, b.bestPrice, 'desc')
      if (sort === 'price_asc')  return compareBestPrice(a.bestPrice, b.bestPrice, 'asc')
      return 0
    })
    return visible
  }, [OPEN_REQUEST_IDS, itemsById, receivedData, query, sort])

  const submitted = useMemo(() => {
    let arr = submittedData
    if (query.trim()) {
      const q = query.toLowerCase()
      arr = arr.filter(o => String(o.requestId).toLowerCase().includes(q))
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

  /* ===== URL → State (mit Fallback LocalStorage) ===== */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)

      // Query
      const q = params.get('q')
      if (q !== null) setQuery(q)

      // Sort
      const s = params.get('sort') as SortKey | null
      if (s && ['date_desc','date_asc','price_desc','price_asc'].includes(s)) setSort(s)

      // Tab (URL bevorzugt, sonst localStorage)
      const tab = params.get('tab') as TopSection | null
      if (tab && (tab === 'received' || tab === 'submitted')) {
        setTopSection(tab)
      } else {
        const saved = localStorage.getItem('lack-angeboteTop')
        if (saved === 'received' || saved === 'submitted') setTopSection(saved as TopSection)
      }

      // PageSize (URL > localStorage > Default) + Validation
      const lPsRec = Number(localStorage.getItem('lack-angebote:ps:received')) || DEFAULTS.psRec
      const lPsSub = Number(localStorage.getItem('lack-angebote:ps:submitted')) || DEFAULTS.psSub
      const urlPsRec = Number(params.get('psRec'))
      const urlPsSub = Number(params.get('psSub'))
      const initPsRec = ALLOWED_PS.includes(urlPsRec) ? urlPsRec : (ALLOWED_PS.includes(lPsRec) ? lPsRec : DEFAULTS.psRec)
      const initPsSub = ALLOWED_PS.includes(urlPsSub) ? urlPsSub : (ALLOWED_PS.includes(lPsSub) ? lPsSub : DEFAULTS.psSub)
      setPsRec(initPsRec)
      setPsSub(initPsSub)

      // Page (URL > localStorage > Default)
      const lPageRec = Number(localStorage.getItem('lack-angebote:page:received')) || DEFAULTS.pageRec
      const lPageSub = Number(localStorage.getItem('lack-angebote:page:submitted')) || DEFAULTS.pageSub
      const urlPageRec = Number(params.get('pageRec')) || undefined
      const urlPageSub = Number(params.get('pageSub')) || undefined
      setPageRec(urlPageRec && urlPageRec > 0 ? urlPageRec : (lPageRec > 0 ? lPageRec : DEFAULTS.pageRec))
      setPageSub(urlPageSub && urlPageSub > 0 ? urlPageSub : (lPageSub > 0 ? lPageSub : DEFAULTS.pageSub))
    } catch {}
  }, [])

  /* ===== Persistenzen ===== */
  // PageSizes
  useEffect(() => { try { localStorage.setItem('lack-angebote:ps:received', String(psRec)) } catch {} }, [psRec])
  useEffect(() => { try { localStorage.setItem('lack-angebote:ps:submitted', String(psSub)) } catch {} }, [psSub])

  // Pages
  useEffect(() => { try { localStorage.setItem('lack-angebote:page:received', String(pageRec)) } catch {} }, [pageRec])
  useEffect(() => { try { localStorage.setItem('lack-angebote:page:submitted', String(pageSub)) } catch {} }, [pageSub])

  // bei Such-/Sort-Änderung Seite zurücksetzen
  useEffect(() => { setPageRec(1); setPageSub(1) }, [query, sort])

  /* ===== URL-Synchronisation ===== */
  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (query !== DEFAULTS.q)         p.set('q', query)
      if (sort !== DEFAULTS.sort)       p.set('sort', sort)
      if (topSection !== DEFAULTS.tab)  p.set('tab', topSection)
      if (psRec !== DEFAULTS.psRec)     p.set('psRec', String(psRec))
      if (psSub !== DEFAULTS.psSub)     p.set('psSub', String(psSub))
      if (pageRec !== DEFAULTS.pageRec) p.set('pageRec', String(pageRec))
      if (pageSub !== DEFAULTS.pageSub) p.set('pageSub', String(pageSub))

      const qs   = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`

      if (next !== curr) {
        router.replace(next, { scroll: false })
      }
    } catch {}
  }, [query, sort, topSection, psRec, psSub, pageRec, pageSub, router])

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

  const rec = sliceByPage(receivedGroups, pageRec, psRec)
  useEffect(() => { if (rec.safePage !== pageRec) setPageRec(rec.safePage) }, [rec.safePage, pageRec])

  const sub = sliceByPage(submitted, pageSub, psSub)
  useEffect(() => { if (sub.safePage !== pageSub) setPageSub(sub.safePage) }, [sub.safePage, pageSub])

  /* ===== Payment + Modal ===== */
  function paymentUrl({ requestId, offerId, amountCents, vendor }: { requestId: string | number, offerId: string, amountCents: number, vendor: string }) {
    return (
      `/zahlung?requestId=${encodeURIComponent(String(requestId))}` +
      `&offerId=${encodeURIComponent(offerId)}` +
      `&amount=${amountCents}` +
      `&vendor=${encodeURIComponent(vendor)}` +
      `&returnTo=${encodeURIComponent('/konto/lackanfragen')}`
    )
  }
  function openConfirm(requestId: string | number, offerId: string, amountCents: number, vendor: string) {
    setConfirmOffer({ requestId, offerId, amountCents, vendor })
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
      <h2 className={styles.heading}>Erhaltene Angebote für deine Lackanfragen</h2>
      <div className={styles.kontoContainer}>
        {rec.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine Lackanfragen/Angebote sichtbar.</strong></div>
        ) : (
          <>
            <ul className={styles.groupList}>
              {rec.pageItems.map(({ requestId, artikel, offers, showNoOffersGroup, bestPrice }) => {
                const title = artikel ? computeItemTitle(artikel) : `Anfrage #${requestId}`
                const href  = artikel ? itemPath(artikel) : itemPathBy(requestId)
                return (
                  <li key={requestId} className={styles.groupCard}>
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
                        <Link href={href} className={styles.jobLink}>Zur Lackanfrage</Link>
                      </div>
                    </div>

                    {offers.length === 0 && showNoOffersGroup ? (
                      <div className={styles.groupFootNote}>Derzeit keine gültigen Angebote.</div>
                    ) : (
                      <div className={styles.offerTable} role="table" aria-label="Angebote zu dieser Lackanfrage">
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
                            const a = itemsById.get(String(o.requestId))
                            const validUntil = computeValidUntil(o, a)!
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
                                    onClick={() => openConfirm(o.requestId, o.id, o.priceCents, o.vendor)}
                                    title="Angebot annehmen"
                                  >
                                    {acceptingId === o.id ? 'Wird angenommen…' : 'Angebot annehmen'}
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
      <h2 className={styles.heading}>Übersicht zu deinen abgegebenen Angebote (Lack)</h2>
      <div className={styles.kontoContainer}>
        {sub.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine gültigen Angeboten abgegeben.</strong></div>
        ) : (
          <>
            <ul className={styles.list}>
              {sub.pageItems.map(o => {
                const artikel = itemsById.get(String(o.requestId))
                const title   = artikel ? computeItemTitle(artikel) : `Anfrage #${o.requestId} (nicht verfügbar)`
                const href    = artikel ? itemPath(artikel) : '/lackanfragen'
                const validUntil = computeValidUntil(o, artikel)!
                const remaining  = formatRemaining(validUntil)
                return (
                  <li key={o.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>
                        <Link href={href} className={styles.titleLink}>{title}</Link>
                      </div>
                      <div className={styles.price}>{formatEUR(o.priceCents)}</div>
                    </div>
                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>Anfrage-Nr.: <strong>{o.requestId}</strong></span>
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
                      <Link href={href} className={styles.jobLink}>Zur Lackanfrage</Link>
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
            placeholder="Anfrage-Nr., Anbieter oder Titel…"
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

      {/* ===== Modal „Angebot annehmen“ ===== */}
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
              <div><strong>Lackanfrage:</strong> #{String(confirmOffer.requestId)}</div>
              <div><strong>Anbieter:</strong> {confirmOffer.vendor}</div>
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
                Ja, Angebot annehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default LackanfragenAngebote
