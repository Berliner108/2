'use client'

import React, { FC, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './kaufen.module.css'
import Navbar from '../../components/navbar/Navbar'

/* ================= Helpers ================= */
function formatEUR(cents?: number) {
  const v = (typeof cents === 'number' ? cents : 0) / 100
  return v.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}
function formatDate(iso?: string) {
  if (!iso) return '–'
  const d = new Date(iso)
  if (Number.isNaN(+d)) return '–'
  return d.toLocaleDateString('de-AT', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

type Slice<T> = { pageItems: T[]; from: number; to: number; total: number; safePage: number; pages: number }
function sliceByPage<T>(arr: T[], page: number, ps: number): Slice<T> {
  const total = arr.length
  const pages = Math.max(1, Math.ceil(total / ps))
  const safePage = Math.min(Math.max(1, page), pages)
  const start = (safePage - 1) * ps
  const end = Math.min(start + ps, total)
  return { pageItems: arr.slice(start, end), from: total === 0 ? 0 : start + 1, to: end, total, safePage, pages }
}

/* ================= Pagination (wie in lackangebote) ================= */
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
          <option value={2}>2</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        <div className={styles.pageButtons}>
          <button type="button" className={styles.pageBtn} onClick={() => setPage(1)} disabled={page <= 1} aria-label="Erste Seite">
            «
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Vorherige Seite"
          >
            ‹
          </button>
          <span className={styles.pageNow} aria-live="polite">
            Seite {page} / {pages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            aria-label="Nächste Seite"
          >
            ›
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setPage(pages)}
            disabled={page >= pages}
            aria-label="Letzte Seite"
          >
            »
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================= Data Types ================= */
type ArtikelStatus = 'aktiv' | 'pausiert' | 'verkauft'
type VerkaufStatus = 'bezahlt' | 'versandt' | 'geliefert'

type MyArticle = {
  id: string
  title: string
  category: string
  priceCents: number
  createdAtIso: string
  status: ArtikelStatus
  views: number
}

type MySale = {
  id: string
  articleId: string
  title: string
  buyerName: string
  buyerRating?: number
  buyerRatingCount?: number
  amountCents: number
  dateIso: string
  status: VerkaufStatus
  invoiceId: string
  rated?: boolean
}

/* ================= Routes ================= */
const articlePathBy = (id: string) => `/kaufen/artikel/${encodeURIComponent(String(id))}`

/* ================= Page ================= */
type TabKey = 'artikel' | 'verkaeufe'
type SortKeyArtikel = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'views_desc'
type SortKeySales = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'

const KontoVerkaufenPage: FC = () => {
  const router = useRouter()
  const params = useSearchParams()

  /* -------- Dummy Data (für jetzt) -------- */
  const [articles, setArticles] = useState<MyArticle[]>([])
  const [sales, setSales] = useState<MySale[]>([])

  useEffect(() => {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000

    setArticles([
      { id: 'a-1001', title: 'Vaillant Weiss glatt matt', category: 'Pulverlack', priceCents: 8900, createdAtIso: new Date(now - 3 * day).toISOString(), status: 'aktiv', views: 128 },
      { id: 'a-1002', title: 'RAL 7016 Anthrazit Struktur', category: 'Pulverlack', priceCents: 10900, createdAtIso: new Date(now - 10 * day).toISOString(), status: 'aktiv', views: 302 },
      { id: 'a-1003', title: 'Eloxal Schwarz (Probe)', category: 'Eloxieren', priceCents: 4900, createdAtIso: new Date(now - 1 * day).toISOString(), status: 'pausiert', views: 44 },
      { id: 'a-1004', title: 'Grundierung hellgrau', category: 'Nasslack', priceCents: 7600, createdAtIso: new Date(now - 21 * day).toISOString(), status: 'aktiv', views: 91 },
      { id: 'a-1005', title: 'Pulver Transparent glänzend', category: 'Pulverlack', priceCents: 12900, createdAtIso: new Date(now - 35 * day).toISOString(), status: 'verkauft', views: 510 },
      { id: 'a-1006', title: 'Sondereffekt Metallic Silber', category: 'Pulverlack', priceCents: 13900, createdAtIso: new Date(now - 6 * day).toISOString(), status: 'aktiv', views: 210 },
    ])

    // Verkäufe: Dummy (du hast gesagt, real noch nicht)
    setSales([
      {
        id: 's-9001',
        articleId: 'a-1005',
        title: 'Pulver Transparent glänzend',
        buyerName: 'Max Mustermann',
        buyerRating: 4.7,
        buyerRatingCount: 18,
        amountCents: 12900,
        dateIso: new Date(now - 5 * day).toISOString(),
        status: 'geliefert',
        invoiceId: 'inv-9001',
        rated: false,
      },
      {
        id: 's-9002',
        articleId: 'a-1002',
        title: 'RAL 7016 Anthrazit Struktur',
        buyerName: 'Anna Beispiel',
        buyerRating: 4.9,
        buyerRatingCount: 6,
        amountCents: 10900,
        dateIso: new Date(now - 2 * day).toISOString(),
        status: 'versandt',
        invoiceId: 'inv-9002',
        rated: false,
      },
    ])
  }, [])

  /* -------- Toolbar State -------- */
  const [tab, setTab] = useState<TabKey>('artikel')
  const [query, setQuery] = useState('')

  const [sortArtikel, setSortArtikel] = useState<SortKeyArtikel>('date_desc')
  const [sortSales, setSortSales] = useState<SortKeySales>('date_desc')

  const [psArtikel, setPsArtikel] = useState(10)
  const [psSales, setPsSales] = useState(10)

  const [pageArtikel, setPageArtikel] = useState(1)
  const [pageSales, setPageSales] = useState(1)

  // Optional: Tab aus URL ?tab=...
  useEffect(() => {
    try {
      const t = params.get('tab')
      if (t === 'artikel' || t === 'verkaeufe') setTab(t)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // URL sync (wie bei lackangebote)
  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (tab !== 'artikel') p.set('tab', tab)
      if (query.trim()) p.set('q', query.trim())
      if (sortArtikel !== 'date_desc') p.set('sortA', sortArtikel)
      if (sortSales !== 'date_desc') p.set('sortS', sortSales)
      if (psArtikel !== 10) p.set('psA', String(psArtikel))
      if (psSales !== 10) p.set('psS', String(psSales))
      if (pageArtikel !== 1) p.set('pageA', String(pageArtikel))
      if (pageSales !== 1) p.set('pageS', String(pageSales))
      const qs = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`
      if (next !== curr) router.replace(next, { scroll: false })
    } catch {}
  }, [tab, query, sortArtikel, sortSales, psArtikel, psSales, pageArtikel, pageSales, router])

  // Page reset bei Suche / Sort
  useEffect(() => {
    setPageArtikel(1)
    setPageSales(1)
  }, [query, sortArtikel, sortSales])

  /* -------- Filtering + Sorting -------- */
  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? articles.filter((a) => `${a.title} ${a.category} ${a.status}`.toLowerCase().includes(q))
      : articles.slice()

    base.sort((a, b) => {
      if (sortArtikel === 'date_desc') return +new Date(b.createdAtIso) - +new Date(a.createdAtIso)
      if (sortArtikel === 'date_asc') return +new Date(a.createdAtIso) - +new Date(b.createdAtIso)
      if (sortArtikel === 'price_desc') return b.priceCents - a.priceCents
      if (sortArtikel === 'price_asc') return a.priceCents - b.priceCents
      if (sortArtikel === 'views_desc') return b.views - a.views
      return 0
    })

    return base
  }, [articles, query, sortArtikel])

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? sales.filter((s) => `${s.title} ${s.buyerName} ${s.status}`.toLowerCase().includes(q))
      : sales.slice()

    base.sort((a, b) => {
      if (sortSales === 'date_desc') return +new Date(b.dateIso) - +new Date(a.dateIso)
      if (sortSales === 'date_asc') return +new Date(a.dateIso) - +new Date(b.dateIso)
      if (sortSales === 'price_desc') return b.amountCents - a.amountCents
      if (sortSales === 'price_asc') return a.amountCents - b.amountCents
      return 0
    })

    return base
  }, [sales, query, sortSales])

  const sliceArtikel = useMemo(() => sliceByPage(filteredArticles, pageArtikel, psArtikel), [filteredArticles, pageArtikel, psArtikel])
  const sliceSales = useMemo(() => sliceByPage(filteredSales, pageSales, psSales), [filteredSales, pageSales, psSales])

  useEffect(() => {
    if (sliceArtikel.safePage !== pageArtikel) setPageArtikel(sliceArtikel.safePage)
  }, [sliceArtikel.safePage, pageArtikel])
  useEffect(() => {
    if (sliceSales.safePage !== pageSales) setPageSales(sliceSales.safePage)
  }, [sliceSales.safePage, pageSales])

  /* -------- Badges / Status Styles -------- */
  function artikelBadge(a: MyArticle) {
    if (a.status === 'aktiv') return { cls: styles.statusActive, label: 'Aktiv' }
    if (a.status === 'pausiert') return { cls: styles.statusPending, label: 'Pausiert' }
    return { cls: styles.statusDone, label: 'Verkauft' }
  }
  function saleBadge(s: MySale) {
    if (s.status === 'bezahlt') return { cls: styles.statusPending, label: 'Bezahlt' }
    if (s.status === 'versandt') return { cls: styles.statusPending, label: 'Versandt' }
    return { cls: styles.statusDone, label: 'Geliefert' }
  }

  /* -------- Review Modal (wie konto/lackangebote) -------- */
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewSale, setReviewSale] = useState<MySale | null>(null)
  const [stars, setStars] = useState(0)
  const [reviewText, setReviewText] = useState('')

  function openReview(s: MySale) {
    setReviewSale(s)
    setStars(0)
    setReviewText('')
    setReviewOpen(true)
  }
  function closeReview() {
    setReviewOpen(false)
    setReviewSale(null)
    setStars(0)
    setReviewText('')
  }
  function submitReview() {
    if (!reviewSale) return
    // Dummy: markiere als bewertet
    setSales((prev) => prev.map((x) => (x.id === reviewSale.id ? { ...x, rated: true } : x)))
    closeReview()
    alert('Bewertung gespeichert (Dummy). Backend kannst du später anbinden.')
  }

  /* -------- Invoice Download (Dummy Link) -------- */
  function invoiceHref(s: MySale) {
    // später: echte Route -> /api/invoices/:id/download
    return `/api/invoices/${encodeURIComponent(s.invoiceId)}/download`
  }

  /* ================= Render ================= */
  return (
    <>
    <Navbar />
    <div className={styles.wrapper}>
      {/* Toolbar (wie lackangebote) */}
      <div className={styles.toolbar}>
        <label className={styles.visuallyHidden} htmlFor="q">
          Suchen
        </label>
        <input
          id="q"
          className={styles.search}
          placeholder={tab === 'artikel' ? 'Artikel suchen (Titel, Kategorie, Status)…' : 'Verkäufe suchen (Titel, Käufer, Status)…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* Sort */}
        {tab === 'artikel' ? (
          <select className={styles.select} value={sortArtikel} onChange={(e) => setSortArtikel(e.target.value as SortKeyArtikel)}>
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Preis: hoch → niedrig</option>
            <option value="price_asc">Preis: niedrig → hoch</option>
            <option value="views_desc">Aufrufe: hoch → niedrig</option>
          </select>
        ) : (
          <select className={styles.select} value={sortSales} onChange={(e) => setSortSales(e.target.value as SortKeySales)}>
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Preis: hoch → niedrig</option>
            <option value="price_asc">Preis: niedrig → hoch</option>
          </select>
        )}

        {/* Spacer (damit Grid wie CSS passt) */}
        <div />

        {/* Segmented */}
        <div className={styles.segmented} role="tablist" aria-label="Ansicht wählen">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'artikel'}
            className={`${styles.segmentedBtn} ${tab === 'artikel' ? styles.segmentedActive : ''}`}
            onClick={() => setTab('artikel')}
          >
            Artikel <span className={styles.chip}>{filteredArticles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'verkaeufe'}
            className={`${styles.segmentedBtn} ${tab === 'verkaeufe' ? styles.segmentedActive : ''}`}
            onClick={() => setTab('verkaeufe')}
          >
            Verkäufe <span className={styles.chip}>{filteredSales.length}</span>
          </button>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* ===== Artikel ===== */}
      {tab === 'artikel' && (
        <>
          <h2 className={styles.heading}>Meine eingestellten Artikel</h2>
          <div className={styles.kontoContainer}>
            {sliceArtikel.total === 0 ? (
              <div className={styles.emptyState}>
                <strong>Keine Artikel sichtbar.</strong>
              </div>
            ) : (
              <>
                <ul className={styles.list}>
                  {sliceArtikel.pageItems.map((a) => {
                    const badge = artikelBadge(a)
                    return (
                      <li key={a.id} className={`${styles.card} ${styles.cardCyan}`}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitle}>
                            <Link href={articlePathBy(a.id)} className={styles.titleLink}>
                              {a.title}
                            </Link>
                          </div>
                          <span className={`${styles.statusBadge} ${badge.cls}`}>{badge.label}</span>
                        </div>

                        <div className={styles.meta}>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Kategorie</div>
                            <div className={styles.metaValue}>{a.category}</div>
                          </div>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Preis</div>
                            <div className={styles.metaValue}>{formatEUR(a.priceCents)}</div>
                          </div>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Erstellt</div>
                            <div className={styles.metaValue}>{formatDate(a.createdAtIso)}</div>
                          </div>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Aufrufe</div>
                            <div className={styles.metaValue}>{a.views}</div>
                          </div>
                        </div>

                        {/* Wie bei lackangebote Orders: 3-Spalten-Zeile, rechts Actions */}
                        <div className={styles.detailsRow}>
                          <div />
                          <div />
                          <aside className={styles.sideCol}>
                            <Link href={articlePathBy(a.id)} className={`${styles.ctaBtn} ${styles.ctaPrimary}`}>
                              Im Shop öffnen
                            </Link>

                            <button
                              type="button"
                              className={`${styles.ctaBtn} ${styles.ctaGhost}`}
                              onClick={() => alert('Dummy: Bearbeiten-Flow später anbinden.')}
                            >
                              Artikel bearbeiten
                            </button>

                            {a.status === 'aktiv' ? (
                              <button
                                type="button"
                                className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                                onClick={() => alert('Dummy: Deaktivieren später anbinden.')}
                              >
                                Deaktivieren
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={`${styles.ctaBtn} ${styles.ctaSuccess}`}
                                onClick={() => alert('Dummy: Aktivieren später anbinden.')}
                              >
                                Aktivieren
                              </button>

                            )}
                          </aside>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <Pagination
                  page={pageArtikel}
                  setPage={setPageArtikel}
                  pageSize={psArtikel}
                  setPageSize={setPsArtikel}
                  total={sliceArtikel.total}
                  from={sliceArtikel.from}
                  to={sliceArtikel.to}
                  idPrefix="my-articles"
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ===== Verkäufe ===== */}
      {tab === 'verkaeufe' && (
        <>
          <h2 className={styles.heading}>Meine Verkäufe</h2>
          <div className={styles.kontoContainer}>
            {sliceSales.total === 0 ? (
              <div className={styles.emptyState}>
                <strong>Keine Verkäufe sichtbar.</strong>
              </div>
            ) : (
              <>
                <ul className={styles.list}>
                  {sliceSales.pageItems.map((s) => {
                    const badge = saleBadge(s)
                    const buyerTxt =
                      typeof s.buyerRating === 'number' && typeof s.buyerRatingCount === 'number'
                        ? `${s.buyerRating.toFixed(1)} ★ (${s.buyerRatingCount})`
                        : '—'

                    return (
                      <li key={s.id} className={`${styles.card} ${styles.cardCyan}`}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitle}>
                            <Link href={articlePathBy(s.articleId)} className={styles.titleLink}>
                              {s.title}
                            </Link>
                          </div>
                          <span className={`${styles.statusBadge} ${badge.cls}`}>{badge.label}</span>
                        </div>

                        <div className={styles.meta}>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Käufer</div>
                            <div className={styles.metaValue}>
                              {s.buyerName}
                              <span className={styles.vendorRatingSmall}> · {buyerTxt}</span>
                            </div>
                          </div>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Preis</div>
                            <div className={styles.metaValue}>{formatEUR(s.amountCents)}</div>
                          </div>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Datum</div>
                            <div className={styles.metaValue}>{formatDate(s.dateIso)}</div>
                          </div>
                          <div className={styles.metaCol}>
                            <div className={styles.metaLabel}>Artikel-ID</div>
                            <div className={styles.metaValue}>{s.articleId}</div>
                          </div>
                        </div>

                        {/* Rechts: Rechnung + Bewertung (wie verlangt) */}
                        <div className={styles.detailsRow}>
                          <div />
                          <div />
                          <aside className={styles.sideCol}>
                            <a
                              href={invoiceHref(s)}
                              className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                              target="_blank"
                              rel="noopener"
                            >
                              Rechnung herunterladen (PDF)
                            </a>

                            <button
                              type="button"
                              className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
                              onClick={() => openReview(s)}
                              disabled={!!s.rated}
                              aria-disabled={!!s.rated}
                              style={s.rated ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                            >
                              {s.rated ? 'Bewertung bereits abgegeben' : 'Bewertung abgeben'}
                            </button>

                            <Link href={articlePathBy(s.articleId)} className={`${styles.ctaBtn} ${styles.ctaGhost}`}>
                              Zum Artikel
                            </Link>
                          </aside>
                        </div>
                      </li>
                    )
                  })}
                </ul>

                <Pagination
                  page={pageSales}
                  setPage={setPageSales}
                  pageSize={psSales}
                  setPageSize={setPsSales}
                  total={sliceSales.total}
                  from={sliceSales.from}
                  to={sliceSales.to}
                  idPrefix="my-sales"
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ===== Review Modal (identisches CSS aus lackangebote) ===== */}
      {reviewOpen && reviewSale && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Bewertung abgeben"
          onMouseDown={(e) => {
            // Klick auf Overlay schließt (aber nicht beim Klick in Content)
            if (e.target === e.currentTarget) closeReview()
          }}
        >
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Bewertung abgeben</h3>
            <p className={styles.modalText}>
              Verkauf: <strong>{reviewSale.title}</strong>
              <br />
              Käufer: <strong>{reviewSale.buyerName}</strong>
            </p>

            <div className={styles.stars} aria-label="Sterne auswählen">
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1
                const active = v <= stars
                return (
                  <button
                    key={v}
                    type="button"
                    className={styles.starBtn}
                    onClick={() => setStars(v)}
                    aria-label={`${v} Sterne`}
                    title={`${v} Sterne`}
                    style={active ? { transform: 'translateY(-1px)' } : undefined}
                  >
                    {active ? '★' : '☆'}
                  </button>
                )
              })}
            </div>

            <textarea
              className={styles.reviewBox}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, 600))}
              placeholder="Kurzer Text (optional)…"
            />
            <div className={styles.counter}>{reviewText.length} / 600</div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={closeReview}>
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={submitReview}
                disabled={stars === 0}
                aria-disabled={stars === 0}
                style={stars === 0 ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                Bewertung senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default KontoVerkaufenPage
