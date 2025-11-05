'use client'

import React, { useState } from 'react'
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
  orderId: string
  requestId: string | null
  requestTitle: string | null
}

type ApiResp = {
  profile: { id: string, username: string | null, companyName?: string | null, ratingAvg: number | null, ratingCount: number | null }
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

/** Skeletons ------------------------------------------------------------- */
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
function ListSkeleton({ count = 3 }: { count?: number }) {
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

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>

        {/* Loading nicer */}
        {isLoading && (
          <>
            <HeaderSkeleton />
            <ListSkeleton count={4} />
          </>
        )}

        {error && (
          <div className={styles.emptyState}>
            <div className={styles.errorBadge}>⚠︎</div>
            <div>
              <strong>Fehler beim Laden.</strong><br />
              {(error as any)?.message || 'Bitte später erneut versuchen.'}
            </div>
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Header / Overview */}
            <div className={`${styles.card} ${styles.headerCard}`}>
              <div className={styles.headerTop}>
                <h1 className={styles.headerTitle}>Bewertungen für {renderProfileTitle()}</h1>
                <div className={styles.headerBadge}><Stars n={Math.round(data.profile.ratingAvg ?? 5)} /></div>
              </div>

              <div className={styles.headerStats}>
                <div className={styles.statBox}>
                  <div className={styles.statLabel}>Durchschnitt</div>
                  <div className={styles.statValue}>
                    {typeof data.profile.ratingAvg === 'number'
                      ? data.profile.ratingAvg.toFixed(1)
                      : '—'}<span>/5</span>
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

                  const id = it.requestId ? String(it.requestId).trim() : ''
                  const title = it.requestTitle?.trim() || (id ? `Anfrage #${id}` : null)

                  const titleEl = id ? (
                    <Link
                      className={styles.titleLink}
                      href={`/lackanfragen/artikel/${encodeURIComponent(id)}`}
                      prefetch={false}
                    >
                      {title}
                    </Link>
                  ) : (
                    <span className={styles.titleLink}>Anfrage nicht mehr verfügbar</span>
                  )

                  const isOpen = !!expanded[it.id]

                  return (
                    <li key={it.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>{titleEl}</div>
                        <div className={styles.cardMetaRight}>
                          <span className={styles.stars}><Stars n={it.stars} /></span>
                          <span className={styles.dot}>·</span>
                          <span className={styles.date}>
                            {new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
                              new Date(it.createdAt)
                            )}
                          </span>
                        </div>
                      </div>

                      <div className={styles.meta}>
                        <div className={styles.metaCol} style={{ maxWidth: '100%' }}>
                          <div className={styles.metaLabel}>Kommentar</div>
                          <p className={`${styles.comment} ${!isOpen ? styles.clamp : ''}`}>
                            {it.comment}
                          </p>
                          {it.comment?.length > 220 && (
                            <button
                              type="button"
                              className={styles.readMore}
                              onClick={() => setExpanded(s => ({ ...s, [it.id]: !s[it.id] }))}
                              aria-expanded={isOpen}
                            >
                              {!isOpen ? 'Mehr lesen' : 'Weniger'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={styles.byline}>
                        von{' '}
                        {name ? (
                          <Link className={styles.titleLink} href={raterHref} prefetch={false}>
                            {name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Pagination */}
            <div className={styles.pagination} aria-label="Seitensteuerung" style={{ marginTop: 16 }}>
              <div className={styles.pageInfo} aria-live="polite">
                {total === 0 ? (
                  'Keine Einträge'
                ) : (
                  <>
                    Seite <strong>{page}</strong> / <strong>{pages}</strong> – {total} Reviews
                  </>
                )}
              </div>
              <div className={styles.pageButtons}>
                <button className={styles.pageBtn} onClick={() => go(1)} disabled={page <= 1}>«</button>
                <button className={styles.pageBtn} onClick={() => go(page - 1)} disabled={page <= 1}>‹</button>
                <span className={styles.pageNow}>Seite {page} / {pages}</span>
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
