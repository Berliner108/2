'use client'

import React, { useEffect, useMemo, useRef, useState, useId } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import Navbar from '@/app/components/navbar/Navbar'
import styles from './user-reviews.module.css'

type ReviewItem = {
  id: string
  createdAt: string
  comment: string
  stars: number
  rater: { id: string, username: string | null, companyName?: string | null }
  orderId: string | null
  requestId: string | null
  requestTitle: string | null
  // optional – für Shop-Bewertungen
  productId?: string | null
  productTitle?: string | null
  shopOrderId?: string | null
}

type ApiResp = {
  profile: {
    id: string
    username: string | null
    companyName?: string | null
    ratingAvg: number | null
    ratingCount: number | null
  }
  page: number
  pageSize: number
  total: number
  items: ReviewItem[]
}

const fetcher = async (u: string) => {
  const r = await fetch(u, { credentials: 'include' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error || 'Laden fehlgeschlagen')
  return j as ApiResp
}

/* ---------- Stars mit Halb-Schritten (Text-basiert, kein SVG nötig) ---------- */
function Stars({
  value,
  max = 5,
  className,
  size = 18,
  ariaLabel,
}: {
  value: number
  max?: number
  className?: string
  size?: number
  ariaLabel?: string
}) {
  const stars = []
  for (let i = 1; i <= max; i++) {
    // wie viel dieser Stern gefüllt ist (0..1)
    const fill = Math.max(0, Math.min(1, value - (i - 1)))
    const pct = Math.round(fill * 100)
    stars.push(
      <span key={i} className={styles.star} style={{ ['--starSize' as any]: `${size}px` }}>
        <span className={styles.starBase}>★</span>
        <span className={`${styles.starFill} ${styles.starsYellow}`} style={{ width: `${pct}%` }}>★</span>
      </span>
    )
  }
  const label = ariaLabel ?? `${value.toFixed(1)} von ${max} Sternen`
  return (
    <span className={`${styles.starsWrap} ${className || ''}`} aria-label={label}>
      {stars}
    </span>
  )
}

/* ---------------- Skeletons ---------------- */
function HeaderSkeleton() {
  return (
    <div className={`${styles.card} ${styles.headerCard} ${styles.skeletonCard}`}>
      <div className={styles.skelTitle} />
      <div className={styles.skelMetaRow}>
        <div className={styles.skelMetaBox}><div className={styles.skelLine} /></div>
        <div className={styles.skelMetaBox}><div className={styles.skelLine} /></div>
      </div>
    </div>
  )
}
function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className={`${styles.card} ${styles.skeletonCard}`}>
          <div className={styles.skelHeaderRow}>
            <div className={styles.skelTitleSm} />
            <div className={styles.skelStars} />
          </div>
          <div className={styles.skelLines}>
            <div className={styles.skelLine} />
            <div className={styles.skelLine} />
            <div className={styles.skelLineShort} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------------- Kontext-Erkennung ---------------- */
type Ctx =
  | { kind: 'lackanfrage'; label: string; title: string; href: string }
  | { kind: 'auftrag'; label: string; title: string; href: string }
  | { kind: 'shop'; label: string; title: string; href?: string }
  | { kind: 'sonstiges'; label: string; title: string; href?: string }

function getContext(it: ReviewItem): Ctx {
  if (it.requestId) {
    const id = String(it.requestId).trim()
    return { kind: 'lackanfrage', label: 'Lackanfrage', title: it.requestTitle?.trim() || `Anfrage #${id}`, href: `/lackanfragen/artikel/${encodeURIComponent(id)}` }
  }
  if (it.orderId) {
    const id = String(it.orderId).trim()
    return { kind: 'auftrag', label: 'Auftrag', title: `Auftrag #${id}`, href: `/auftraege/${encodeURIComponent(id)}` }
  }
  if (it.productId || it.shopOrderId) {
    const pid = (it.productId || it.shopOrderId || '').toString()
    return { kind: 'shop', label: 'Shop', title: it.productTitle?.trim() || (pid ? `Shop-Artikel #${pid}` : 'Shop-Bewertung') }
  }
  return { kind: 'sonstiges', label: 'Bewertung', title: 'Bewertung' }
}

/* ---------------- Collapsible Kommentar (nur beim Toggle scrollen) ---------------- */
function CollapsibleText({ text, lines = 5 }: { text: string; lines?: number }) {
  const ref = useRef<HTMLParagraphElement | null>(null)
  const [open, setOpen] = useState(false)
  const [clampNeeded, setClampNeeded] = useState(false)

  // Nur messen, nicht scrollen, open nicht anfassen
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const lh = parseFloat(getComputedStyle(el).lineHeight || '24')
    const maxH = lh * lines
    setClampNeeded(el.scrollHeight > maxH + 2)
  }, [text, lines])

  const cls = useMemo(() => {
    const base = styles.comment
    if (!clampNeeded) return base
    return open ? base : `${base} ${styles.clamp}`
  }, [clampNeeded, open])

  const onToggle = () => {
    setOpen(prev => {
      const next = !prev
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
      return next
    })
  }

  return (
    <>
      <p ref={ref} className={cls}>{text}</p>
      {clampNeeded && (
        <button type="button" className={styles.readMore} onClick={onToggle} aria-expanded={open}>
          {open ? 'Weniger' : 'Mehr lesen'}
          <svg width="16" height="16" viewBox="0 0 24 24" className={styles.readMoreIcon} aria-hidden>
            <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </>
  )
}

export default function UserReviewsPage() {
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  const router = useRouter()

  // Deaktiviere automatische Scroll-Wiederherstellung des Browsers
  useEffect(() => {
    if ('scrollRestoration' in history) {
      const prev = (history as any).scrollRestoration
      ;(history as any).scrollRestoration = 'manual'
      return () => { (history as any).scrollRestoration = prev }
    }
  }, [])

  const page = Math.max(1, parseInt(search.get('page') || '1', 10))
  const pageSize = Math.max(1, Math.min(50, parseInt(search.get('pageSize') || '10', 10)))
  const sortDefault = (search.get('sort') as 'neueste'|'älteste'|'beste'|'schlechteste') || 'neueste'
  const [sortBy, setSortBy] = useState<'neueste'|'älteste'|'beste'|'schlechteste'>(sortDefault)

  const { data, error, isLoading } = useSWR<ApiResp>(
    `/api/reviews/by-user/${encodeURIComponent(params.slug)}?page=${page}&pageSize=${pageSize}`,
    fetcher
  )

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))

  function go(to: number) {
    const sp = new URLSearchParams(search.toString())
    if (to <= 1) sp.delete('page'); else sp.set('page', String(to))
    sp.set('sort', sortBy)
    if (pageSize !== 10) sp.set('pageSize', String(pageSize))
    const qs = sp.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }

  // Sortierung: clientseitig
  const sortedItems = useMemo(() => {
    if (!data?.items) return []
    const arr = [...data.items]
    switch (sortBy) {
      case 'beste':        return arr.sort((a,b) => b.stars - a.stars || +new Date(b.createdAt) - +new Date(a.createdAt))
      case 'schlechteste': return arr.sort((a,b) => a.stars - b.stars || +new Date(a.createdAt) - +new Date(b.createdAt))
      case 'älteste':      return arr.sort((a,b) => +new Date(a.createdAt) - +new Date(b.createdAt))
      case 'neueste':
      default:             return arr.sort((a,b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    }
  }, [data?.items, sortBy])

  const renderProfileTitle = () => {
    if (!data) return 'Nutzer'
    const u = data.profile.username?.replace(/^@+/, '')
    return u || 'Nutzer'
  }

  // bei Sortwechsel URL aktualisieren (ohne Reload)
  useEffect(() => {
    const sp = new URLSearchParams(search.toString())
    if (sortBy === 'neueste') sp.delete('sort'); else sp.set('sort', sortBy)
    router.replace(sp.size ? `?${sp.toString()}` : '?', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy])

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>

        {isLoading && (<><HeaderSkeleton /><ListSkeleton /></>)}

        {error && (
          <div className={styles.emptyState}>
            <div className={styles.errorBadge}>⚠︎</div>
            <div><strong>Fehler beim Laden.</strong><br />{(error as any)?.message || 'Bitte später erneut versuchen.'}</div>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* HEADER */}
            <div className={`${styles.card} ${styles.headerCard}`}>
              <div className={styles.headerTop}>
                <h1 className={styles.headerTitle}>Bewertungen für {renderProfileTitle()}</h1>
                <div className={styles.headerBadge}>
                  <Stars value={Math.round((data.profile.ratingAvg ?? 0) * 2) / 2} className={styles.starsYellow} size={20} />
                </div>
              </div>

              <div className={styles.headerStats}>
                <div className={styles.statBox}>
                  <div className={styles.statLabel}>Durchschnitt</div>
                  <div className={styles.statValue}>
                    {typeof data.profile.ratingAvg === 'number' ? data.profile.ratingAvg.toFixed(1) : '—'}<span>/5</span>
                  </div>
                </div>
                <div className={styles.statBox}>
                  <div className={styles.statLabel}>Anzahl</div>
                  <div className={styles.statValue}>{data.profile.ratingCount ?? 0}</div>
                </div>
              </div>

              {/* Sortierung */}
              <div className={styles.controls}>
                <label className={styles.sortLabel}>
                  Sortieren:
                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                  >
                    <option value="neueste">Neueste zuerst</option>
                    <option value="älteste">Älteste zuerst</option>
                    <option value="beste">Beste zuerst</option>
                    <option value="schlechteste">Schlechteste zuerst</option>
                  </select>
                </label>
              </div>
            </div>

            {/* LISTE */}
            {sortedItems.length === 0 ? (
              <div className={styles.emptyState}>Noch keine Bewertungen.</div>
            ) : (
              <ul className={styles.list}>
                {sortedItems.map((it) => {
                  const r = it.rater
                  const name = r.username?.replace(/^@+/, '') || null
                  const raterHref = `/u/${encodeURIComponent(name || r.id)}/reviews`

                  const ctx = getContext(it)
                  const titleEl = ctx.href
                    ? <Link className={styles.titleLink} href={ctx.href} prefetch={false}>{ctx.title}</Link>
                    : <span className={styles.titleLink}>{ctx.title}</span>

                  return (
                    <li key={it.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                          {ctx.kind !== 'sonstiges' && <span className={styles.badge}>{ctx.label}</span>}
                          {titleEl}
                        </div>
                        <div className={styles.cardMetaRight}>
                          <Stars value={it.stars} className={styles.starsYellow} />
                          <span className={styles.dot}>·</span>
                          <span className={styles.date}>
                            {new Intl.DateTimeFormat('de-AT', { day:'2-digit', month:'2-digit', year:'numeric' }).format(new Date(it.createdAt))}
                          </span>
                        </div>
                      </div>

                      <div className={styles.meta}>
                        <div className={styles.metaCol} style={{ maxWidth: '100%' }}>
                          <div className={styles.metaLabel}>
                            {ctx.kind === 'lackanfrage' ? 'Kommentar zu Lackanfrage'
                              : ctx.kind === 'auftrag' ? 'Kommentar zu Auftrag'
                              : ctx.kind === 'shop' ? 'Kommentar zum Shop-Artikel'
                              : 'Kommentar'}
                          </div>

                          <CollapsibleText text={it.comment} lines={5} />
                        </div>
                      </div>

                      <div className={styles.byline}>
                        von {name ? <Link className={styles.titleLink} href={raterHref} prefetch={false}>{name}</Link> : '—'}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* PAGINATION */}
            <div className={styles.pagination} aria-label="Seitensteuerung" style={{ marginTop: 16 }}>
              <div className={styles.pageInfo} aria-live="polite">
                {data.total === 0 ? 'Keine Einträge' : <>Seite <strong>{data.page}</strong> / <strong>{Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize || 10)))}</strong> – {data.total} Reviews</>}
              </div>
              <div className={styles.pageButtons}>
                <button className={styles.pageBtn} onClick={() => go(1)} disabled={page <= 1}>«</button>
                <button className={styles.pageBtn} onClick={() => go(page - 1)} disabled={page <= 1}>‹</button>
                <span className={styles.pageNow}>Seite {page}</span>
                <button className={styles.pageBtn} onClick={() => go(page + 1)} disabled={page >= pages}>›</button>
                <button className={styles.pageBtn} onClick={() => go(pages)} disabled={page >= pages}>»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
