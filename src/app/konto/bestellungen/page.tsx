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
type ShopOrderStatus =
  | "payment_pending"
  | "paid"
  | "shipped"
  | "released"
  | "complaint_open"
  | "refunded";

type ApiShopOrder = {
  id: string;
  created_at: string;
  status: ShopOrderStatus;
  unit: "kg" | "stueck";
  qty: number;
  total_gross_cents: number;

  article_id: string;
  articles?: { title: string | null } | null;

  seller_id: string;
  seller_username: string | null;
  seller_account_type: string | null;
  seller_company_name: string | null;
  seller_vat_number: string | null;
  seller_address: any | null;

  shipped_at: string | null;     // ✅
  released_at: string | null;    // ✅
};


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
  shippedAtIso?: string | null
  releasedAtIso?: string | null



}
/* ================= Routes ================= */
const articlePathBy = (id: string) => `/kaufen/artikel/${encodeURIComponent(String(id))}`

function mapStatus(s: ShopOrderStatus): OrderStatus {
  // UI-Labels die du aktuell hast
  if (s === "paid") return "bezahlt";
  if (s === "shipped") return "versandt";
  if (s === "released") return "abgeschlossen";
  if (s === "complaint_open") return "reklamiert";
  if (s === "refunded") return "abgeschlossen";
  // payment_pending: Käufer sieht das später eher nicht, aber falls doch:
  return "bezahlt";
}

/* ================= Status Badges ================= */
function badgeFor(status: OrderStatus) {
  if (status === 'bezahlt' || status === 'versandt') return { cls: styles.statusPending, label: status === 'bezahlt' ? 'Bezahlt' : 'Versandt' }
  if (status === 'geliefert') return { cls: styles.statusDone, label: 'Geliefert' }
  if (status === 'reklamiert') return { cls: styles.statusDisputed, label: 'Reklamiert' }
  return { cls: styles.statusDone, label: 'Abgeschlossen' }
}
function canBuyerRelease(o: MyOrder) {
  // niemals wenn schon final
  if (o.releasedAtIso) return false;
  if (o.status === "abgeschlossen") return false;

  // wenn reklamiert, kein release
  if (o.complaintOpen || o.status === "reklamiert") return false;

  // Buyer darf NUR nachdem Verkäufer Versand gemeldet hat
  // (du mapst shipped => "versandt")
  if (o.status !== "versandt") return false;

  // shippedAt muss gesetzt sein (optional, aber sauber)
  if (!o.shippedAtIso) return false;

  return true;
}

function canBuyerComplain(o: MyOrder) {
  // nie reklamieren wenn fertig
  if (o.status === "abgeschlossen") return false;
  if (o.status === "reklamiert") return false; // ist ja schon offen

  // nach release nie mehr reklamieren
  if (o.releasedAtIso) return false;

  return true;
}

/* ================= Page ================= */
type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'

const BestellungenPage: FC = () => {
  /* ---------- Dummy Orders ---------- */
  const [orders, setOrders] = useState<MyOrder[]>([])

  useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch("/api/konto/shop-bestellungen", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        console.error("shop-bestellungen error:", json);
        if (!cancelled) setOrders([]);
        return;
      }

      const apiOrders: ApiShopOrder[] = Array.isArray(json?.orders) ? json.orders : [];


    const mapped: MyOrder[] = apiOrders.map((o) => ({
  id: o.id,
  articleId: o.article_id,
  articleTitle: o.articles?.title ?? `Artikel ${o.article_id.slice(0, 8)}`,
  sellerName: o.seller_username ?? "Verkäufer",
  amountCents: o.total_gross_cents,
  dateIso: o.created_at,
  status: mapStatus(o.status),

  shippedAtIso: o.shipped_at ?? null,      // ✅
  releasedAtIso: o.released_at ?? null,    // ✅

  paymentReleased: !!o.released_at || o.status === "released",
  complaintOpen: o.status === "complaint_open",
  rated: false,
}));



      if (!cancelled) setOrders(mapped);
    } catch (e) {
      console.error(e);
      if (!cancelled) setOrders([]);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);


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
async function openComplaint(order: MyOrder) {
  if (order.releasedAtIso) return;   // statt paymentReleased
  if (order.complaintOpen) return;

  const res = await fetch(`/api/shop-orders/${encodeURIComponent(order.id)}/complain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(json?.error ?? "Reklamation fehlgeschlagen");
    return;
  }

  // UI refresh
  const r2 = await fetch("/api/konto/shop-bestellungen", { cache: "no-store" });
  const j2 = await r2.json().catch(() => ({}));
  // gleiches Mapping wie oben (du kannst es auch in eine Funktion ziehen – aber du willst modular, also lass es erstmal so)
  setOrders(Array.isArray(j2?.orders) ? j2.orders.map((o: ApiShopOrder) => ({
    id: o.id,
    articleId: o.article_id,
    articleTitle: o.articles?.title ?? `Artikel ${o.article_id.slice(0, 8)}`,
    sellerName: o.seller_username ?? "Verkäufer",
    amountCents: o.total_gross_cents,
    dateIso: o.created_at,
    status: mapStatus(o.status),
    shippedAtIso: o.shipped_at,
    releasedAtIso: o.released_at ?? null,
    paymentReleased: !!o.released_at || o.status === "released",
    complaintOpen: o.status === "complaint_open",
    rated: false,
  })) : []);
}


  async function releasePayment(order: MyOrder) {
if (!canBuyerRelease(order)) {
  alert("Zahlung kann erst nach gemeldetem Versand freigegeben werden.");
  return;
}


  const res = await fetch(`/api/shop-orders/${encodeURIComponent(order.id)}/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(json?.error ?? "Release fehlgeschlagen");
    return;
  }

  // UI refresh: einfach neu laden
  const r2 = await fetch("/api/konto/shop-bestellungen", { cache: "no-store" });
  const j2 = await r2.json().catch(() => ({}));
  setOrders(Array.isArray(j2?.orders) ? j2.orders.map((o: ApiShopOrder) => ({
    id: o.id,
    articleId: o.article_id,
    articleTitle: o.articles?.title ?? `Artikel ${o.article_id.slice(0, 8)}`,
    sellerName: o.seller_username ?? "Verkäufer",
    amountCents: o.total_gross_cents,
    dateIso: o.created_at,
    status: mapStatus(o.status),
    shippedAtIso: o.shipped_at ?? null,
    releasedAtIso: o.released_at ?? null,
    paymentReleased: !!o.released_at || o.status === "released",
    complaintOpen: o.status === "complaint_open",
    rated: false,
  })) : []);
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

                  const canRelease = canBuyerRelease(o);
                  const canComplain = canBuyerComplain(o);



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
                            {(o.status === "versandt" || o.paymentReleased) && (
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
                            )}

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
