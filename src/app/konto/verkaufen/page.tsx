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
const [shopSales, setShopSales] = useState<any[]>([])

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
  createdAtIso: string | null
  status: ArtikelStatus
  views: number
  hasStaffelpreise?: boolean // ✅ neu
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

  /* -------- DB Data -------- */
  const [articles, setArticles] = useState<MyArticle[]>([])
  const [sales, setSales] = useState<MySale[]>([])

  const [mineLoading, setMineLoading] = useState(true)
  const [mineError, setMineError] = useState<string | null>(null)

  // ========= API Helpers (wichtig für Refresh nach PATCH) =========
  async function loadMine(cancelledRef?: { current: boolean }) {
    try {
      setMineLoading(true)
      setMineError(null)

      const res = await fetch('/api/konto/verkaufen', { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = json?.error ?? `Fehler beim Laden (${res.status})`
        throw new Error(msg)
      }

      if (!cancelledRef?.current) {
        setArticles(Array.isArray(json?.articles) ? json.articles : [])
        setSales([]) // Orders/Verkäufe kommen später -> vorerst leer
      }
    } catch (e: any) {
      if (!cancelledRef?.current) {
        setArticles([])
        setSales([])
        setMineError(e?.message ?? 'Unbekannter Fehler')
      }
    } finally {
      if (!cancelledRef?.current) setMineLoading(false)
    }
  }

  async function patchArticle(id: string, patch: { published?: boolean }) {
    const res = await fetch(`/api/konto/articles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error ?? 'PATCH_FAILED')
    return json?.article
  }

  useEffect(() => {
    const cancelledRef = { current: false }
    loadMine(cancelledRef)

    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
  let cancelled = false

  ;(async () => {
    const res = await fetch("/api/konto/shop-verkaufen", { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) {
      console.error(json)
      if (!cancelled) setShopSales([])
      return
    }
    if (!cancelled) setShopSales(Array.isArray(json?.orders) ? json.orders : [])
  })()

  return () => { cancelled = true }
}, [])


  // Page reset bei Suche / Sort
  useEffect(() => {
    setPageArtikel(1)
    setPageSales(1)
  }, [query, sortArtikel, sortSales])

  /* -------- Filtering + Sorting -------- */
  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? articles.filter((a) => `${a.title} ${a.category} ${a.status}`.toLowerCase().includes(q)) : articles.slice()

    base.sort((a, b) => {
      if (sortArtikel === 'date_desc') return +new Date(b.createdAtIso ?? 0) - +new Date(a.createdAtIso ?? 0)
      if (sortArtikel === 'date_asc') return +new Date(a.createdAtIso ?? 0) - +new Date(b.createdAtIso ?? 0)
      if (sortArtikel === 'price_desc') return b.priceCents - a.priceCents
      if (sortArtikel === 'price_asc') return a.priceCents - b.priceCents
      if (sortArtikel === 'views_desc') return b.views - a.views
      return 0
    })

    return base
  }, [articles, query, sortArtikel])

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? sales.filter((s) => `${s.title} ${s.buyerName} ${s.status}`.toLowerCase().includes(q)) : sales.slice()

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

  /* -------- Review Modal (Dummy) -------- */
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
    setSales((prev) => prev.map((x) => (x.id === reviewSale.id ? { ...x, rated: true } : x)))
    closeReview()
    alert('Bewertung gespeichert (Dummy). Backend kannst du später anbinden.')
  }

  function invoiceHref(s: MySale) {
    return `/api/invoices/${encodeURIComponent(s.invoiceId)}/download`
  }

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        {/* Toolbar */}
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

        {/* Global state */}
        {mineLoading && (
          <div className={styles.emptyState}>
            <strong>Lade deine Artikel…</strong>
          </div>
        )}

        {!mineLoading && mineError && (
          <div className={styles.emptyState}>
            <strong>Fehler:</strong> {mineError}
            <div style={{ marginTop: 10, opacity: 0.9 }}>
              Wenn du nicht eingeloggt bist, kommt hier oft <code>NOT_AUTHENTICATED</code>.
            </div>
          </div>
        )}

        {/* ===== Artikel ===== */}
        {!mineLoading && !mineError && tab === 'artikel' && (
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
                      const isActive = a.status === 'aktiv'

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
                              <div className={styles.metaValue}>
                                {a.category ? a.category.charAt(0).toUpperCase() + a.category.slice(1) : "—"}
                              </div>
                            </div>

                            <div className={styles.metaCol}>
                              <div className={styles.metaLabel}>{a.hasStaffelpreise ? "Preis ab" : "Preis"}</div>
                              <div className={styles.metaValue}>{formatEUR(a.priceCents)}</div>
                            </div>

                            <div className={styles.metaCol}>
                              <div className={styles.metaLabel}>Erstellt</div>
                              <div className={styles.metaValue}>{formatDate(a.createdAtIso ?? undefined)}</div>
                            </div>
                            <div className={styles.metaCol}>
                              <div className={styles.metaLabel}>Aufrufe</div>
                              <div className={styles.metaValue}>{a.views}</div>
                            </div>
                          </div>

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
                                onClick={() => router.push(`/verkaufen?edit=${encodeURIComponent(a.id)}`)}
                              >
                                Artikel bearbeiten
                              </button>



                              <button
                                type="button"
                                className={isActive ? `${styles.ctaBtn} ${styles.ctaSecondary}` : `${styles.ctaBtn} ${styles.ctaSuccess}`}
                                onClick={async () => {
                                  try {
                                    await patchArticle(a.id, { published: !isActive })
                                    await loadMine()
                                  } catch (e: any) {
                                    alert(e?.message ?? 'Fehler beim Aktualisieren')
                                  }
                                }}
                              >
                                {isActive ? 'Deaktivieren' : 'Aktivieren'}
                              </button>
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
        {!mineLoading && !mineError && tab === 'verkaeufe' && (
          <>
            <h2 className={styles.heading}>Meine Verkäufe</h2>
            <div className={styles.kontoContainer}>
              {sliceSales.total === 0 ? (
                <div className={styles.emptyState}>
                  <strong>Keine Verkäufe sichtbar.</strong>
                  <div style={{ marginTop: 8, opacity: 0.9 }}>Kommt sobald Orders/Checkout existieren.</div>
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

        {/* ===== Review Modal (Dummy) ===== */}
        {reviewOpen && reviewSale && (
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Bewertung abgeben"
            onMouseDown={(e) => {
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
