'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
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
  // optional – falls du Shop einbindest
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

function Stars({ n }: { n: number }) {
  const full = Math.max(1, Math.min(5, Math.round(n)))
  return <span aria-label={`${full} Sterne`}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
}

/* ---------- Skeletons ---------- */
function HeaderSkeleton() {
  return (
    <div className={`${styles.card} ${styles.skeletonCard}`}>
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

/* ---------- Kontext-Erkennung ---------- */
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

/* ---------- Collapsible Kommentar (funktioniert immer) ---------- */
function CollapsibleText({ text, lines = 5 }: { text: string; lines?: number }) {
  const ref = useRef<HTMLParagraphElement | null>(null)
  const [open, setOpen] = useState(false)
  const [clampNeeded, setClampNeeded] = useState(false)

  // messen, ob Clamp nötig ist
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // kurz öffnen, messen, dann schließen
    setOpen(false)
    requestAnimationFrame(() => {
      const lh = parseFloat(getComputedStyle(el).lineHeight || '24')
      const maxH = lh * lines
      setClampNeeded(el.scrollHeight > maxH + 2) // Toleranz
    })
  }, [text, lines])

  // nach Toggle smooth scrollen
  useEffect(() => {
    if (!ref.current) return
    ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [open])

  const cls = useMemo(() => {
    const base = styles.comment
    if (!clampNeeded) return base
    return open ? base : `${base} ${styles.clamp}`
  }, [clampNeeded, open])

  return (
    <>
      <p ref={ref} className={cls}>{text}</p>
      {clampNeeded && (
        <button type="button" className={styles.readMore} onClick={() => setOpen(v => !v)} aria-expanded={open}>
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

  const page = Math.max(1, parseInt(search.get('page') || '1', 10))
  const pageSize = Math.max(1, Math.min(50, parseInt(search.get('pageSize') || '10', 10)))

  const { data, error, isLoading } = useSWR<ApiResp>(
    `/api/reviews/by-user/${encodeURIComponent(params.slug)}?page=${page}&pageSize=${pageSize}`,
    fetcher
  )

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))

  function go(to: number) {
    const sp = new URLSearchParams(search.toString())
    if (to <= 1) sp.delete('page'); else sp.set('page', String(to))
    if (pageSize !== 10) sp.set('pageSize', String(pageSize))
    const qs = sp.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }

  const renderProfileTitle = () => {
    if (!data) return 'Nutzer'
    const u = data.profile.username?.replace(/^@+/, '')
    return u || 'Nutzer'
  }

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
            {/* Header */}
            <div className={`${styles.card} ${styles.headerCard}`}>
              <div className={styles.headerTop}>
                <h1 className={styles.headerTitle}>Bewertungen für {renderProfileTitle()}</h1>
                <div className={styles.headerBadge}><Stars n={Math.round(data.profile.ratingAvg ?? 5)} /></div>
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
            </div>

            {/* Liste */}
            {data.items.length === 0 ? (
              <div className={styles.emptyState}>Noch keine Bewertungen.</div>
            ) : (
              <ul className={styles.list}>
                {data.items.map((it) => {
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
                          <span className={styles.stars}><Stars n={it.stars} /></span>
                          <span className={styles.dot}>·</span>
                          <span className={styles.date}>
                            {new Intl.DateTimeFormat('de-AT', { day:'2-digit', month:'2-digit', year:'numeric' })
                              .format(new Date(it.createdAt))}
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

            {/* Pagination */}
            <div className={styles.pagination} aria-label="Seitensteuerung" style={{ marginTop: 16 }}>
              <div className={styles.pageInfo} aria-live="polite">
                {data.total === 0 ? 'Keine Einträge' : <>Seite <strong>{data.page}</strong> / <strong>{Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize || 10)))}</strong> – {data.total} Reviews</>}
              </div>
              <div className={styles.pageButtons}>
                <button className={styles.pageBtn} onClick={() => go(1)} disabled={page <= 1}>«</button>
                <button className={styles.pageBtn} onClick={() => go(page - 1)} disabled={page <= 1}>‹</button>
                <span className={styles.pageNow}>Seite {page}</span>
                <button className={styles.pageBtn} onClick={() => go(page + 1)} disabled={page >= Math.max(1, Math.ceil(total / pageSize))}>›</button>
                <button className={styles.pageBtn} onClick={() => go(Math.max(1, Math.ceil(total / pageSize)))} disabled={page >= Math.max(1, Math.ceil(total / pageSize))}>»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
