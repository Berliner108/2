'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './konto.module.css' // <- ggf. anpassen (z.B. './konto.module.css')

/* ================= Types ================= */
type MyArticle = {
  id: string
  title: string
  priceCents: number
  createdAt: string
  status: 'active' | 'draft' | 'sold' | 'archived'
  views?: number | null
}

type MySale = {
  id: string
  articleId?: string | null
  articleTitle: string
  buyerHandle?: string | null
  totalCents: number
  createdAt: string
  status: 'paid' | 'shipped' | 'completed' | 'canceled' | 'refunded'
}

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type TopSection = 'articles' | 'sales'

/* ================= Helpers ================= */
const formatEUR = (c: number) =>
  (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })

const formatDateTime = (v?: string) => (v ? new Date(v).toLocaleString('de-AT') : '—')

// ✅ Deine Artikel-Route:
const articlePathBy = (id: string) => `/kaufen/artikel/${encodeURIComponent(String(id))}`

// (optional) falls du später eine Verkaufs-Detailseite machst:
const salePathBy = (id: string) => `/konto/verkaeufe/${encodeURIComponent(String(id))}`

/* ================= Dummy Data ================= */
const now = Date.now()
const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString()

const DUMMY_ARTICLES: MyArticle[] = [
  { id: 'A-1001', title: 'Vaillant Weiss glatt matt', priceCents: 12900, createdAt: daysAgo(2), status: 'active', views: 128 },
  { id: 'A-1002', title: 'IGP Anthrazit metallic', priceCents: 8900, createdAt: daysAgo(5), status: 'active', views: 54 },
  { id: 'A-1003', title: 'RAL 9016 Reinweiß', priceCents: 15900, createdAt: daysAgo(8), status: 'draft', views: 9 },
  { id: 'A-1004', title: 'Struktur schwarz matt', priceCents: 9900, createdAt: daysAgo(10), status: 'active', views: 77 },
  { id: 'A-1005', title: 'Sonderfarbe Kupfer', priceCents: 19900, createdAt: daysAgo(13), status: 'archived', views: 21 },
  { id: 'A-1006', title: 'Feinstruktur grau', priceCents: 10500, createdAt: daysAgo(16), status: 'active', views: 33 },
  { id: 'A-1007', title: 'Glanzlack weiß', priceCents: 7400, createdAt: daysAgo(20), status: 'sold', views: 210 },
  { id: 'A-1008', title: 'Industrie-Set (B2B)', priceCents: 24900, createdAt: daysAgo(28), status: 'active', views: 18 },
]

const DUMMY_SALES: MySale[] = [
  { id: 'S-2001', articleId: 'A-1007', articleTitle: 'Glanzlack weiß', buyerHandle: 'kunde_017', totalCents: 7400, createdAt: daysAgo(1), status: 'paid' },
  { id: 'S-2002', articleId: 'A-1001', articleTitle: 'Vaillant Weiss glatt matt', buyerHandle: 'max.m', totalCents: 12900, createdAt: daysAgo(6), status: 'shipped' },
  { id: 'S-2003', articleId: 'A-1002', articleTitle: 'IGP Anthrazit metallic', buyerHandle: 'b2b_buyer', totalCents: 8900, createdAt: daysAgo(12), status: 'completed' },
]

/* ================= Pagination ================= */
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
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <div className={styles.pageButtons}>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(1)} disabled={page <= 1} aria-label="Erste Seite">
            «
          </button>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(page - 1)} disabled={page <= 1} aria-label="Vorherige Seite">
            ‹
          </button>

          <span className={styles.pageNow} aria-live="polite">
            Seite {page} / {pages}
          </span>

          <button type="button" className={styles.pageBtn} onClick={() => setPage(page + 1)} disabled={page >= pages} aria-label="Nächste Seite">
            ›
          </button>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(pages)} disabled={page >= pages} aria-label="Letzte Seite">
            »
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= Page ================= */
const DEFAULTS = {
  q: '',
  sort: 'date_desc' as SortKey,
  tab: 'articles' as TopSection,
  psA: 10,
  psS: 10,
  pageA: 1,
  pageS: 1,
}

const ALLOWED_SORTS: SortKey[] = ['date_desc', 'date_asc', 'price_desc', 'price_asc']

const VerkaufenKontoPage: FC = () => {
  // Dummy-Daten statt API
  const articlesRaw = DUMMY_ARTICLES
  const salesRaw = DUMMY_SALES // wenn du gar keine willst: []

  const [query, setQuery] = useState(DEFAULTS.q)
  const [sort, setSort] = useState<SortKey>(DEFAULTS.sort)
  const [topSection, setTopSection] = useState<TopSection>(DEFAULTS.tab)

  // Pagination State (separat)
  const [pageA, setPageA] = useState(DEFAULTS.pageA)
  const [psA, setPsA] = useState(DEFAULTS.psA)
  const [pageS, setPageS] = useState(DEFAULTS.pageS)
  const [psS, setPsS] = useState(DEFAULTS.psS)

  // URL + localStorage (wie bei deiner Stil-Seite)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q')
      if (q !== null) setQuery(q)

      const s = params.get('sort') as SortKey | null
      if (s && ALLOWED_SORTS.includes(s)) setSort(s)

      const tab = params.get('tab') as TopSection | null
      if (tab === 'articles' || tab === 'sales') setTopSection(tab)
      else {
        const saved = localStorage.getItem('konto:top')
        if (saved === 'articles' || saved === 'sales') setTopSection(saved as TopSection)
      }

      const lPsA = Number(localStorage.getItem('konto:ps:articles')) || 10
      const lPsS = Number(localStorage.getItem('konto:ps:sales')) || 10
      setPsA([10, 20, 50].includes(Number(params.get('psA'))) ? Number(params.get('psA')) : ([10, 20, 50].includes(lPsA) ? lPsA : 10))
      setPsS([10, 20, 50].includes(Number(params.get('psS'))) ? Number(params.get('psS')) : ([10, 20, 50].includes(lPsS) ? lPsS : 10))

      const lPageA = Number(localStorage.getItem('konto:page:articles')) || 1
      const lPageS = Number(localStorage.getItem('konto:page:sales')) || 1
      setPageA(Number(params.get('pageA')) > 0 ? Number(params.get('pageA')) : (lPageA > 0 ? lPageA : 1))
      setPageS(Number(params.get('pageS')) > 0 ? Number(params.get('pageS')) : (lPageS > 0 ? lPageS : 1))
    } catch {}
  }, [])

  useEffect(() => { try { localStorage.setItem('konto:top', topSection) } catch {} }, [topSection])
  useEffect(() => { try { localStorage.setItem('konto:ps:articles', String(psA)) } catch {} }, [psA])
  useEffect(() => { try { localStorage.setItem('konto:ps:sales', String(psS)) } catch {} }, [psS])
  useEffect(() => { try { localStorage.setItem('konto:page:articles', String(pageA)) } catch {} }, [pageA])
  useEffect(() => { try { localStorage.setItem('konto:page:sales', String(pageS)) } catch {} }, [pageS])

  useEffect(() => {
    setPageA(1)
    setPageS(1)
  }, [query, sort])

  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (query) p.set('q', query)
      if (sort !== 'date_desc') p.set('sort', sort)
      if (topSection !== 'articles') p.set('tab', topSection)
      if (psA !== 10) p.set('psA', String(psA))
      if (psS !== 10) p.set('psS', String(psS))
      if (pageA !== 1) p.set('pageA', String(pageA))
      if (pageS !== 1) p.set('pageS', String(pageS))

      const qs = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`
      if (next !== curr) window.history.replaceState(null, '', next)
    } catch {}
  }, [query, sort, topSection, psA, psS, pageA, pageS])

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = [...articlesRaw]
    if (q) arr = arr.filter((a) => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))

    arr.sort((a, b) => {
      if (sort === 'date_desc') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'date_asc') return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'price_desc') return b.priceCents - a.priceCents
      if (sort === 'price_asc') return a.priceCents - b.priceCents
      return 0
    })
    return arr
  }, [articlesRaw, query, sort])

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = [...salesRaw]
    if (q) {
      arr = arr.filter(
        (s) =>
          s.articleTitle.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.buyerHandle ?? '').toLowerCase().includes(q)
      )
    }

    arr.sort((a, b) => {
      if (sort === 'date_desc') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'date_asc') return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'price_desc') return b.totalCents - a.totalCents
      if (sort === 'price_asc') return a.totalCents - b.totalCents
      return 0
    })
    return arr
  }, [salesRaw, query, sort])

  const pagA = sliceByPage(filteredArticles, pageA, psA)
  useEffect(() => { if (pagA.safePage !== pageA) setPageA(pagA.safePage) }, [pagA.safePage, pageA])

  const pagS = sliceByPage(filteredSales, pageS, psS)
  useEffect(() => { if (pagS.safePage !== pageS) setPageS(pagS.safePage) }, [pagS.safePage, pageS])

  const ArticlesSection = () => (
    <>
      <h2 className={styles.heading}>Meine eingestellten Artikel</h2>

      <div className={styles.kontoContainer}>
        {pagA.total === 0 ? (
          <div className={styles.emptyState}>
            <strong>Keine Artikel gefunden.</strong>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {pagA.pageItems.map((a) => (
                <li key={a.id} className={`${styles.card} ${styles.isLackanfrage}`}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <Link href={articlePathBy(a.id)} className={styles.titleLink}>
                        {a.title}
                      </Link>
                    </div>

                    <div className={styles.price}>{formatEUR(a.priceCents)}</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      Artikel-Nr.: <strong>{a.id}</strong>
                    </span>
                    <span className={styles.metaItem}>
                      Status: <strong>{a.status}</strong>
                    </span>
                    <span className={styles.metaItem}>
                      Erstellt: <strong>{formatDateTime(a.createdAt)}</strong>
                    </span>
                    <span className={styles.metaItem}>
                      Aufrufe: <strong>{Number.isFinite(a.views as any) ? a.views : '—'}</strong>
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <Link className={styles.jobLink} href={articlePathBy(a.id)}>
                      Ansehen
                    </Link>
                    {/* optional */}
                    {/* <Link className={styles.jobLink} href={`/konto/artikel/${a.id}/bearbeiten`}>Bearbeiten</Link> */}
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              page={pagA.safePage}
              setPage={setPageA}
              pageSize={psA}
              setPageSize={setPsA}
              total={pagA.total}
              from={pagA.from}
              to={pagA.to}
              idPrefix="articles"
            />
          </>
        )}
      </div>
    </>
  )

  const SalesSection = () => (
    <>
      <h2 className={styles.heading}>Meine Verkäufe</h2>

      <div className={styles.kontoContainer}>
        {pagS.total === 0 ? (
          <div className={styles.emptyState}>
            <strong>Noch keine Verkäufe.</strong>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {pagS.pageItems.map((s) => (
                <li key={s.id} className={`${styles.card} ${styles.isLackanfrage}`}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      {/* Wenn du KEINE Verkaufsdetailseite willst: einfach articleId-Link nutzen */}
                      <Link href={salePathBy(s.id)} className={styles.titleLink}>
                        {s.articleTitle}
                      </Link>
                    </div>

                    <div className={styles.price}>{formatEUR(s.totalCents)}</div>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      Verkauf-Nr.: <strong>{s.id}</strong>
                    </span>
                    <span className={styles.metaItem}>
                      Status: <strong>{s.status}</strong>
                    </span>
                    <span className={styles.metaItem}>
                      Datum: <strong>{formatDateTime(s.createdAt)}</strong>
                    </span>
                    <span className={styles.metaItem}>
                      Käufer: <strong>{s.buyerHandle || '—'}</strong>
                    </span>
                    {s.articleId ? (
                      <span className={styles.metaItem}>
                        Artikel:{' '}
                        <Link className={styles.titleLink} href={articlePathBy(s.articleId)}>
                          <strong>{s.articleId}</strong>
                        </Link>
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.actions}>
                    <Link className={styles.jobLink} href={salePathBy(s.id)}>
                      Details
                    </Link>

                    {s.articleId ? (
                      <Link className={styles.jobLink} href={articlePathBy(s.articleId)}>
                        Zum Artikel
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              page={pagS.safePage}
              setPage={setPageS}
              pageSize={psS}
              setPageSize={setPsS}
              total={pagS.total}
              from={pagS.from}
              to={pagS.to}
              idPrefix="sales"
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
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="search">
            Suchen
          </label>

          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID, Titel oder Käufer…"
            className={styles.search}
          />

          <label className={styles.visuallyHidden} htmlFor="sort">
            Sortierung
          </label>

          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={styles.select}
          >
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Preis absteigend</option>
            <option value="price_asc">Preis aufsteigend</option>
          </select>

          <div className={styles.segmented} role="tablist" aria-label="Reihenfolge wählen">
            <button
              role="tab"
              aria-selected={topSection === 'articles'}
              className={`${styles.segmentedBtn} ${topSection === 'articles' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('articles')}
              type="button"
              title={`Artikel oben – ${pagA.total} Einträge`}
            >
              Artikel oben <span className={styles.chip}>{pagA.total}</span>
            </button>

            <button
              role="tab"
              aria-selected={topSection === 'sales'}
              className={`${styles.segmentedBtn} ${topSection === 'sales' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('sales')}
              type="button"
              title={`Verkäufe oben – ${pagS.total} Einträge`}
            >
              Verkäufe oben <span className={styles.chip}>{pagS.total}</span>
            </button>
          </div>
        </div>

        {topSection === 'articles' ? (
          <>
            <ArticlesSection />
            <hr className={styles.divider} />
            <SalesSection />
          </>
        ) : (
          <>
            <SalesSection />
            <hr className={styles.divider} />
            <ArticlesSection />
          </>
        )}
      </div>
    </>
  )
}

export default VerkaufenKontoPage
