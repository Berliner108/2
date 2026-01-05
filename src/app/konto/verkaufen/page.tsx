'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './konto.module.css' // ✅ Buttons + Modal wie konto/lackangebote

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
  myReview?: { stars: 1 | 2 | 3 | 4 | 5; text: string } | null
}

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type TopSection = 'articles' | 'sales'

/* ================= Helpers ================= */
const formatEUR = (c: number) =>
  (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })

const formatDateTime = (v?: string) => (v ? new Date(v).toLocaleString('de-AT') : '—')

const articlePathBy = (id: string) => `/kaufen/artikel/${encodeURIComponent(String(id))}`

// ✅ Rechnung-Download (wie bei konto/lackangebote)
// Wenn du später echte IDs hast: hier einfach anpassen (sale.id oder orderId).
const invoiceUrl = (s: MySale) => `/api/invoices/${encodeURIComponent(String(s.id))}/download`

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
]

const DUMMY_SALES_INIT: MySale[] = [
  { id: 'S-2001', articleId: 'A-1007', articleTitle: 'Glanzlack weiß', buyerHandle: 'kunde_017', totalCents: 7400, createdAt: daysAgo(1), status: 'paid', myReview: null },
  { id: 'S-2002', articleId: 'A-1001', articleTitle: 'Vaillant Weiss glatt matt', buyerHandle: 'max.m', totalCents: 12900, createdAt: daysAgo(6), status: 'shipped', myReview: null },
  { id: 'S-2003', articleId: 'A-1002', articleTitle: 'IGP Anthrazit metallic', buyerHandle: 'b2b_buyer', totalCents: 8900, createdAt: daysAgo(12), status: 'completed', myReview: { stars: 5, text: 'Top, schnell bezahlt.' } },
]

/* ================= Pagination ================= */
type Slice<T> = { pageItems: T[]; from: number; to: number; total: number; safePage: number; pages: number }
function sliceByPage<T>(arr: T[], page: number, ps: number): Slice<T> {
  const total = arr.length
  const pages = Math.max(1, Math.ceil(total / ps))
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * ps
  const end = Math.min(start + ps, total)
  return { pageItems: arr.slice(start, end), from: total === 0 ? 0 : start + 1, to: end, total, safePage, pages }
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
        {total === 0 ? 'Keine Einträge' : <>Zeige <strong>{from}</strong>–<strong>{to}</strong> von <strong>{total}</strong></>}
      </div>
      <div className={styles.pagiControls}>
        <label className={styles.pageSizeLabel} htmlFor={`${idPrefix}-ps`}>Pro Seite:</label>
        <select
          id={`${idPrefix}-ps`}
          className={styles.pageSize}
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
        >
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

/* ================= Status Badge Mapping ================= */
function articleBadgeClass(status: MyArticle['status']) {
  if (status === 'active') return styles.statusActive
  if (status === 'draft') return styles.statusPending
  if (status === 'sold') return styles.statusDone
  return styles.statusDisputed // archived -> rot-ish (passt optisch)
}

function saleBadgeClass(status: MySale['status']) {
  if (status === 'paid' || status === 'shipped') return styles.statusPending
  if (status === 'completed') return styles.statusDone
  return styles.statusDisputed // canceled/refunded
}

function saleLabel(status: MySale['status']) {
  if (status === 'paid') return 'Bezahlt'
  if (status === 'shipped') return 'Versandt'
  if (status === 'completed') return 'Abgeschlossen'
  if (status === 'refunded') return 'Erstattet'
  return 'Storniert'
}

/* ================= Page ================= */
const VerkaufenKontoPage: FC = () => {
  const [articles] = useState<MyArticle[]>(DUMMY_ARTICLES)
  const [sales, setSales] = useState<MySale[]>(DUMMY_SALES_INIT)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [topSection, setTopSection] = useState<TopSection>('articles')

  // Pagination getrennt
  const [pageA, setPageA] = useState(1)
  const [psA, setPsA] = useState(10)
  const [pageS, setPageS] = useState(1)
  const [psS, setPsS] = useState(10)

  // ✅ Bewertung Modal (wie konto/lackangebote)
  const [rateSaleId, setRateSaleId] = useState<string | null>(null)
  const [ratingStars, setRatingStars] = useState<1 | 2 | 3 | 4 | 5>(5)
  const [ratingText, setRatingText] = useState('')
  const MAX_REVIEW = 400

  const activeSale = useMemo(
    () => (rateSaleId ? sales.find(s => s.id === rateSaleId) ?? null : null),
    [rateSaleId, sales]
  )

  // ESC schließt Modal
  useEffect(() => {
    if (!rateSaleId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setRateSaleId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rateSaleId])

  useEffect(() => { setPageA(1); setPageS(1) }, [query, sort])

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = [...articles]
    if (q) arr = arr.filter(a => a.title.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
    arr.sort((a, b) => {
      if (sort === 'date_desc') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'date_asc') return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'price_desc') return b.priceCents - a.priceCents
      if (sort === 'price_asc') return a.priceCents - b.priceCents
      return 0
    })
    return arr
  }, [articles, query, sort])

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = [...sales]
    if (q) {
      arr = arr.filter(s =>
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
  }, [sales, query, sort])

  const pagA = sliceByPage(filteredArticles, pageA, psA)
  useEffect(() => { if (pagA.safePage !== pageA) setPageA(pagA.safePage) }, [pagA.safePage, pageA])

  const pagS = sliceByPage(filteredSales, pageS, psS)
  useEffect(() => { if (pagS.safePage !== pageS) setPageS(pagS.safePage) }, [pagS.safePage, pageS])

  const alreadyRated = (s: MySale) => !!s.myReview

  function openRate(s: MySale) {
    if (alreadyRated(s)) return
    setRateSaleId(s.id)
    setRatingStars(5)
    setRatingText('')
  }

  function saveRating() {
    if (!activeSale) return
    const text = ratingText.trim().slice(0, MAX_REVIEW)
    setSales(prev =>
      prev.map(s =>
        s.id === activeSale.id ? { ...s, myReview: { stars: ratingStars, text } } : s
      )
    )
    setRateSaleId(null)
    setRatingText('')
  }

  const ArticlesSection = () => (
    <>
      <h2 className={styles.heading}>Meine eingestellten Artikel</h2>

      <div className={styles.kontoContainer}>
        {pagA.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine Artikel gefunden.</strong></div>
        ) : (
          <>
            <ul className={styles.list}>
              {pagA.pageItems.map((a) => (
                <li key={a.id} className={`${styles.card} ${styles.cardCyan}`}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      <Link href={articlePathBy(a.id)} className={styles.titleLink}>
                        {a.title}
                      </Link>
                    </div>

                    <span className={`${styles.statusBadge} ${articleBadgeClass(a.status)}`}>
                      {a.status === 'active' ? 'Aktiv' : a.status === 'draft' ? 'Entwurf' : a.status === 'sold' ? 'Verkauft' : 'Archiviert'}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Preis</div>
                      <div className={styles.metaValue}>{formatEUR(a.priceCents)}</div>
                    </div>

                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Artikel-Nr.</div>
                      <div className={styles.metaValue}>{a.id}</div>
                    </div>

                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Erstellt</div>
                      <div className={styles.metaValue}>{formatDateTime(a.createdAt)}</div>
                    </div>

                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Aufrufe</div>
                      <div className={styles.metaValue}>{Number.isFinite(a.views as any) ? a.views : '—'}</div>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <Link className={styles.primaryBtn} href={articlePathBy(a.id)}>
                      Ansehen
                    </Link>
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
          <div className={styles.emptyState}><strong>Noch keine Verkäufe.</strong></div>
        ) : (
          <>
            <ul className={styles.list}>
              {pagS.pageItems.map((s) => (
                <li key={s.id} className={`${styles.card} ${styles.cardCyan}`}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitle}>
                      {s.articleId ? (
                        <Link href={articlePathBy(s.articleId)} className={styles.titleLink}>
                          {s.articleTitle}
                        </Link>
                      ) : (
                        <span>{s.articleTitle}</span>
                      )}
                    </div>

                    <span className={`${styles.statusBadge} ${saleBadgeClass(s.status)}`}>
                      {saleLabel(s.status)}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Gesamt</div>
                      <div className={styles.metaValue}>{formatEUR(s.totalCents)}</div>
                    </div>

                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Verkauf-Nr.</div>
                      <div className={styles.metaValue}>{s.id}</div>
                    </div>

                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Datum</div>
                      <div className={styles.metaValue}>{formatDateTime(s.createdAt)}</div>
                    </div>

                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Käufer</div>
                      <div className={styles.metaValue}>{s.buyerHandle || '—'}</div>
                    </div>
                  </div>

                  {/* ✅ Actions wie in konto/lackangebote: CTA Buttons rechts/untereinander */}
                  <div className={styles.actions}>
                    <a
                      href={invoiceUrl(s)}
                      className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                      target="_blank"
                      rel="noopener"
                    >
                      Rechnung herunterladen (PDF)
                    </a>

                    {!alreadyRated(s) ? (
                      <button
                        type="button"
                        className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
                        onClick={() => openRate(s)}
                      >
                        Bewertung abgeben
                      </button>
                    ) : (
                      <div className={styles.btnHint}>
                        Bewertung abgegeben: <strong>{s.myReview?.stars}/5</strong>
                      </div>
                    )}
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
          <label className={styles.visuallyHidden} htmlFor="search">Suchen</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID, Titel oder Käufer…"
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
            >
              Artikel oben <span className={styles.chip}>{pagA.total}</span>
            </button>

            <button
              role="tab"
              aria-selected={topSection === 'sales'}
              className={`${styles.segmentedBtn} ${topSection === 'sales' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('sales')}
              type="button"
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

      {/* ================= Bewertung Modal (Popup) ================= */}
      {rateSaleId && activeSale && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Bewertung abgeben"
          onMouseDown={(e) => {
            // Klick auf Backdrop schließt
            if (e.target === e.currentTarget) setRateSaleId(null)
          }}
        >
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Bewertung abgeben</h3>
            <p className={styles.modalText}>
              Für: <strong>{activeSale.articleTitle}</strong>
            </p>

            <div className={styles.stars} aria-label="Sterne auswählen">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.starBtn}
                  onClick={() => setRatingStars(n)}
                  aria-label={`${n} Sterne`}
                >
                  {n <= ratingStars ? '★' : '☆'}
                </button>
              ))}
            </div>

            <textarea
              className={styles.reviewBox}
              value={ratingText}
              maxLength={MAX_REVIEW}
              onChange={(e) => setRatingText(e.target.value)}
              placeholder="Kurzfeedback (optional)…"
            />

            <div className={styles.counter}>
              {ratingText.length}/{MAX_REVIEW}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setRateSaleId(null)}>
                Abbrechen
              </button>
              <button type="button" className={styles.btnDanger} onClick={saveRating}>
                Bewertung speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default VerkaufenKontoPage
