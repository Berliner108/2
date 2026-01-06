'use client'

import React, { FC, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './bestellungen.module.css'

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

/* ================= Types ================= */
type OrderStatus = 'bezahlt' | 'versandt' | 'geliefert' | 'reklamiert' | 'abgeschlossen'

type MyOrder = {
  id: string
  articleId: string
  articleTitle: string
  sellerName: string
  sellerRating?: number
  sellerRatingCount?: number
  amountCents: number
  dateIso: string
  status: OrderStatus

  paymentReleased?: boolean
  complaintOpen?: boolean
  rated?: boolean
}

/* ================= Routes ================= */
const articlePathBy = (id: string) => `/kaufen/artikel/${encodeURIComponent(String(id))}`

/* ================= Status Badges ================= */
function badgeFor(status: OrderStatus) {
  if (status === 'bezahlt' || status === 'versandt') return { cls: styles.statusPending, label: status === 'bezahlt' ? 'Bezahlt' : 'Versandt' }
  if (status === 'geliefert') return { cls: styles.statusDone, label: 'Geliefert' }
  if (status === 'reklamiert') return { cls: styles.statusDisputed, label: 'Reklamiert' }
  return { cls: styles.statusDone, label: 'Abgeschlossen' }
}

/* ================= Page ================= */
type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'

const BestellungenPage: FC = () => {
  /* ---------- Dummy Orders ---------- */
  const [orders, setOrders] = useState<MyOrder[]>([])

  useEffect(() => {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    setOrders([
      {
        id: 'B-4001',
        articleId: 'a-1002',
        articleTitle: 'RAL 7016 Anthrazit Struktur',
        sellerName: 'anbieter_01',
        sellerRating: 4.8,
        sellerRatingCount: 41,
        amountCents: 10900,
        dateIso: new Date(now - 2 * day).toISOString(),
        status: 'geliefert',
        paymentReleased: false,
        complaintOpen: false,
        rated: false,
      },
      {
        id: 'B-4002',
        articleId: 'a-1006',
        articleTitle: 'Sondereffekt Metallic Silber',
        sellerName: 'b2b_seller',
        sellerRating: 4.6,
        sellerRatingCount: 12,
        amountCents: 13900,
        dateIso: new Date(now - 7 * day).toISOString(),
        status: 'versandt',
        paymentReleased: false,
        complaintOpen: false,
        rated: false,
      },
      {
        id: 'B-4003',
        articleId: 'a-1001',
        articleTitle: 'Vaillant Weiss glatt matt',
        sellerName: 'farbe_profi',
        sellerRating: 4.9,
        sellerRatingCount: 88,
        amountCents: 8900,
        dateIso: new Date(now - 14 * day).toISOString(),
        status: 'reklamiert',
        paymentReleased: false,
        complaintOpen: true,
        rated: false,
      },
      {
        id: 'B-4004',
        articleId: 'a-1004',
        articleTitle: 'Grundierung hellgrau',
        sellerName: 'anbieter_02',
        sellerRating: 4.7,
        sellerRatingCount: 25,
        amountCents: 7600,
        dateIso: new Date(now - 20 * day).toISOString(),
        status: 'abgeschlossen',
        paymentReleased: true,
        complaintOpen: false,
        rated: true,
      },
    ])
  }, [])

  /* ---------- Toolbar ---------- */
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => setPage(1), [query, sort])

  /* ---------- Review Modal (wie konto/lackangebote) ---------- */
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const MAX_REVIEW = 600

  const activeOrder = useMemo(
    () => (reviewOrderId ? orders.find(o => o.id === reviewOrderId) ?? null : null),
    [reviewOrderId, orders]
  )

  useEffect(() => {
    if (!reviewOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeReview() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reviewOpen])

  function openReview(order: MyOrder) {
    if (order.rated) return
    setReviewOrderId(order.id)
    setStars(0)
    setReviewText('')
    setReviewOpen(true)
  }

  function closeReview() {
    setReviewOpen(false)
    setReviewOrderId(null)
    setStars(0)
    setReviewText('')
  }

  function submitReview() {
    if (!activeOrder) return
    setOrders(prev => prev.map(o => o.id === activeOrder.id ? { ...o, rated: true } : o))
    closeReview()
    alert('Bewertung gespeichert (Dummy). Backend später anbinden.')
  }

  /* ---------- Actions ---------- */
  function openComplaint(order: MyOrder) {
    if (order.complaintOpen) return
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, complaintOpen: true, status: 'reklamiert' } : o))
    alert('Reklamation eröffnet (Dummy).')
  }

  function releasePayment(order: MyOrder) {
    if (order.paymentReleased) return
    // typische Logik: Freigabe nur wenn geliefert/abgeschlossen
    if (!(order.status === 'geliefert' || order.status === 'abgeschlossen')) {
      alert('Zahlung kann erst nach Lieferung freigegeben werden.')
      return
    }
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, paymentReleased: true, status: 'abgeschlossen' } : o))
    alert('Zahlung freigegeben (Dummy).')
  }

  /* ---------- Filter/Sort ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = [...orders]
    if (q) {
      arr = arr.filter(o =>
        `${o.articleTitle} ${o.sellerName} ${o.status} ${o.id}`.toLowerCase().includes(q)
      )
    }
    arr.sort((a, b) => {
      if (sort === 'date_desc') return +new Date(b.dateIso) - +new Date(a.dateIso)
      if (sort === 'date_asc') return +new Date(a.dateIso) - +new Date(b.dateIso)
      if (sort === 'price_desc') return b.amountCents - a.amountCents
      if (sort === 'price_asc') return a.amountCents - b.amountCents
      return 0
    })
    return arr
  }, [orders, query, sort])

  const slice = useMemo(() => sliceByPage(filtered, page, pageSize), [filtered, page, pageSize])
  useEffect(() => { if (slice.safePage !== page) setPage(slice.safePage) }, [slice.safePage, page])

  return (
    <>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="q">Suchen</label>
          <input
            id="q"
            className={styles.search}
            placeholder="Bestellungen suchen (Titel, Verkäufer, Status, ID)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <label className={styles.visuallyHidden} htmlFor="sort">Sortierung</label>
          <select id="sort" className={styles.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="price_desc">Preis: hoch → niedrig</option>
            <option value="price_asc">Preis: niedrig → hoch</option>
          </select>

          <div />
          <div className={styles.segmented} role="tablist" aria-label="Ansicht">
            <button type="button" role="tab" aria-selected="true" className={`${styles.segmentedBtn} ${styles.segmentedActive}`}>
              Bestellungen <span className={styles.chip}>{filtered.length}</span>
            </button>
          </div>
        </div>

        <hr className={styles.divider} />

        <h2 className={styles.heading}>Meine Bestellungen</h2>

        <div className={styles.kontoContainer}>
          {slice.total === 0 ? (
            <div className={styles.emptyState}><strong>Keine Bestellungen sichtbar.</strong></div>
          ) : (
            <>
              <ul className={styles.list}>
                {slice.pageItems.map((o) => {
                  const b = badgeFor(o.status)
                  const sellerTxt =
                    typeof o.sellerRating === 'number' && typeof o.sellerRatingCount === 'number'
                      ? `${o.sellerRating.toFixed(1)} ★ (${o.sellerRatingCount})`
                      : '—'

                  const canRelease = (o.status === 'geliefert' || o.status === 'abgeschlossen') && !o.paymentReleased
                  const canComplain = !o.complaintOpen && !o.paymentReleased
                  const canRate = !o.rated

                  return (
                    <li key={o.id} className={`${styles.card} ${styles.cardCyan}`}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                          <Link href={articlePathBy(o.articleId)} className={styles.titleLink}>
                            {o.articleTitle}
                          </Link>
                        </div>
                        <span className={`${styles.statusBadge} ${b.cls}`}>{b.label}</span>
                      </div>

                      <div className={styles.meta}>
                        <div className={styles.metaCol}>
                          <div className={styles.metaLabel}>Verkäufer</div>
                          <div className={styles.metaValue}>
                            {o.sellerName}
                            <span className={styles.vendorRatingSmall}> · {sellerTxt}</span>
                          </div>
                        </div>

                        <div className={styles.metaCol}>
                          <div className={styles.metaLabel}>Preis</div>
                          <div className={styles.metaValue}>{formatEUR(o.amountCents)}</div>
                        </div>

                        <div className={styles.metaCol}>
                          <div className={styles.metaLabel}>Datum</div>
                          <div className={styles.metaValue}>{formatDate(o.dateIso)}</div>
                        </div>

                        <div className={styles.metaCol}>
                          <div className={styles.metaLabel}>Bestell-Nr.</div>
                          <div className={styles.metaValue}>{o.id}</div>
                        </div>
                      </div>

                      {/* Rechts: Buttons wie in lackangebote */}
                      <div className={styles.detailsRow}>
                        <div />
                        <div />
                        <aside className={styles.sideCol}>
                          <button
                            type="button"
                            className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
                            onClick={() => openReview(o)}
                            disabled={!canRate}
                            aria-disabled={!canRate}
                            style={!canRate ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                          >
                            {o.rated ? 'Bewertung abgegeben' : 'Bewertung abgeben'}
                          </button>

                          <button
                            type="button"
                            className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                            onClick={() => openComplaint(o)}
                            disabled={!canComplain}
                            aria-disabled={!canComplain}
                            style={!canComplain ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                          >
                            {o.complaintOpen ? 'Reklamation offen' : 'Reklamation'}
                          </button>

                          <button
                            type="button"
                            className={`${styles.ctaBtn} ${styles.ctaSuccess ?? styles.ctaSecondary}`}
                            onClick={() => releasePayment(o)}
                            disabled={!canRelease}
                            aria-disabled={!canRelease}
                            style={!canRelease ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                          >
                            {o.paymentReleased ? 'Zahlung freigegeben' : 'Zahlung freigeben'}
                          </button>
                        </aside>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <Pagination
                page={slice.safePage}
                setPage={setPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
                total={slice.total}
                from={slice.from}
                to={slice.to}
                idPrefix="orders"
              />
            </>
          )}
        </div>
      </div>

      {/* ===== Review Modal (Popup) ===== */}
      {reviewOpen && activeOrder && (
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
              Bestellung: <strong>{activeOrder.articleTitle}</strong>
              <br />
              Verkäufer: <strong>{activeOrder.sellerName}</strong>
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
                  >
                    {active ? '★' : '☆'}
                  </button>
                )
              })}
            </div>

            <textarea
              className={styles.reviewBox}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, MAX_REVIEW))}
              placeholder="Kurzfeedback (optional)…"
            />
            <div className={styles.counter}>{reviewText.length} / {MAX_REVIEW}</div>

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
    </>
  )
}

export default BestellungenPage
