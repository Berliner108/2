'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import Navbar from '@/app/components/navbar/Navbar'
import styles from '../../../konto/lackangebote/lackangebote.module.css'

type ReviewItem = {
  id: string
  createdAt: string
  comment: string
  stars: number
  rater: { id: string, username: string|null, display: string|null }
  orderId: string
  requestId: string | null
  requestTitle: string | null
}
type ApiResp = {
  profile: { id: string, username: string|null, display: string|null, ratingAvg: number|null, ratingCount: number|null }
  page: number
  pageSize: number
  total: number
  items: ReviewItem[]
}

const fetcher = async (u: string) => {
  const r = await fetch(u, { credentials: 'include' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j?.error || 'Laden fehlgeschlagen')
  return j
}

function Stars({ n }: { n: number }) {
  const full = Math.max(1, Math.min(5, Math.round(n)))
  return <span aria-label={`${full} Sterne`}>{'★'.repeat(full)}{'☆'.repeat(5-full)}</span>
}

export default function UserReviewsPage() {
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  const router = useRouter()

  const page     = Math.max(1, parseInt(search.get('page') || '1', 10))
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

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        {isLoading && <div className={styles.emptyState}>Lade Reviews…</div>}
        {error && <div className={styles.emptyState}><strong>Fehler:</strong> {(error as any)?.message || 'Konnte Reviews nicht laden.'}</div>}
        {data && (
          <>
            {/* Header */}
            <div className={styles.card} style={{ marginBottom: 16 }}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  Bewertungen für {data.profile.display || data.profile.username || 'Nutzer'}
                </div>
              </div>
              <div className={styles.meta} style={{ alignItems: 'center' }}>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Durchschnitt</div>
                  <div className={styles.metaValue}>
                    {typeof data.profile.ratingAvg === 'number'
                      ? `${data.profile.ratingAvg.toFixed(1)} / 5`
                      : '—'}
                  </div>
                </div>
                <div className={styles.metaCol}>
                  <div className={styles.metaLabel}>Anzahl</div>
                  <div className={styles.metaValue}>{data.profile.ratingCount ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Liste */}
            {data.items.length === 0 ? (
              <div className={styles.emptyState}>Noch keine Bewertungen.</div>
            ) : (
              <ul className={styles.list}>
                {data.items.map(it => {
                  const titleEl = it.requestId ? (
                    <Link className={styles.titleLink} href={`/lackanfragen/artikel/${it.requestId}`}>
                      {it.requestTitle ?? `Anfrage #${it.requestId}`}
                    </Link>
                  ) : (
                    <span className={styles.titleLink}>Anfrage nicht mehr verfügbar</span>
                  )

                  return (
                    <li key={it.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>{titleEl}</div>
                        <div>
                          <Stars n={it.stars} /> ·{' '}
                          <span style={{ opacity: .8 }}>
                            {new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              .format(new Date(it.createdAt))}
                          </span>
                        </div>
                      </div>

                      <div className={styles.meta}>
                        <div className={styles.metaCol} style={{ maxWidth: '100%' }}>
                          <div className={styles.metaLabel}>Kommentar</div>
                          <div className={styles.metaValue} style={{ whiteSpace: 'pre-wrap' }}>{it.comment}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        von{' '}
                        {(it.rater.username || it.rater.display) ? (
                          <Link className={styles.titleLink}
                                href={`/u/${encodeURIComponent(it.rater.username || it.rater.id)}/reviews`}>
                            {it.rater.display || it.rater.username}
                          </Link>
                        ) : '—'}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Pagination */}
            <div className={styles.pagination} aria-label="Seitensteuerung" style={{ marginTop: 16 }}>
              <div className={styles.pageInfo} aria-live="polite">
                {total === 0 ? 'Keine Einträge'
                  : <>Seite <strong>{page}</strong> / <strong>{pages}</strong> – {total} Reviews</>}
              </div>
              <div className={styles.pageButtons}>
                <button className={styles.pageBtn} onClick={() => go(1)} disabled={page<=1}>«</button>
                <button className={styles.pageBtn} onClick={() => go(page-1)} disabled={page<=1}>‹</button>
                <span className={styles.pageNow}>Seite {page} / {pages}</span>
                <button className={styles.pageBtn} onClick={() => go(page+1)} disabled={page>=pages}>›</button>
                <button className={styles.pageBtn} onClick={() => go(pages)} disabled={page>=pages}>»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
