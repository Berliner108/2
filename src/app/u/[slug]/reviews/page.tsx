'use client'

import React from 'react'
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

/* ---------- Sterne mit Half-Fill ---------- */
function Stars({ value, max = 5, className, size = 18 }: { value: number; max?: number; className?: string; size?: number }) {
  const stars = []
  for (let i = 1; i <= max; i++) {
    const fill = Math.max(0, Math.min(1, value - (i - 1))) // 0..1
    const pct = Math.round(fill * 100)
    stars.push(
      <span key={i} className={styles.star} style={{ ['--starSize' as any]: `${size}px` }}>
        <span className={styles.starBase}>★</span>
        <span className={`${styles.starFill} ${styles.starsYellow}`} style={{ width: `${pct}%` }}>★</span>
      </span>
    )
  }
  return <span className={`${styles.starsWrap} ${className || ''}`}>{stars}</span>
}

/* ---------- Skeletons ---------- */
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

/* ---------- Kontext ---------- */
type Ctx =
  | { kind:'lackanfrage'; label:string; title:string; href:string }
  | { kind:'auftrag';     label:string; title:string; href:string }
  | { kind:'shop';        label:string; title:string; href?:string }
  | { kind:'sonstiges';   label:string; title:string; href?:string }

function getContext(it: ReviewItem): Ctx {
  if (it.requestId) {
    const id = String(it.requestId).trim()
    return { kind:'lackanfrage', label:'Lackanfrage', title: it.requestTitle?.trim() || `Anfrage #${id}`, href: `/lackanfragen/artikel/${encodeURIComponent(id)}` }
  }
  if (it.orderId) {
    const id = String(it.orderId).trim()
    return { kind:'auftrag', label:'Auftrag', title:`Auftrag #${id}`, href:`/auftraege/${encodeURIComponent(id)}` }
  }
  if (it.productId || it.shopOrderId) {
  const pid = String(it.productId || '').trim() // ✅ article_id
  const title = it.productTitle?.trim() || (pid ? `Shop-Artikel #${pid.slice(0, 8)}` : 'Shop-Bewertung')

  return {
    kind: 'shop',
    label: 'Shop',
    title,
    href: pid ? `/kaufen/artikel/${encodeURIComponent(pid)}` : undefined, // ✅ genau wie gewünscht
  }
}

  return { kind:'sonstiges', label:'Bewertung', title:'Bewertung' }
}

/* ---------- CollapsibleText (mobil robust) ---------- */
function CollapsibleText({ text, lines = 5 }: { text: string; lines?: number }) {
  const ref = React.useRef<HTMLParagraphElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [canToggle, setCanToggle] = React.useState(false)

  const afterPaint = (cb: () => void) =>
    requestAnimationFrame(() => requestAnimationFrame(cb))

  const measure = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    const diff = el.scrollHeight - el.clientHeight
    setCanToggle(diff > 0.5)
  }, [])

  React.useEffect(() => {
    setOpen(false)
    afterPaint(() => {
      measure()
      ;(document as any).fonts?.ready?.then?.(() => afterPaint(measure))
    })
  }, [text, lines, measure])

  React.useEffect(() => {
    const onResize = () => afterPaint(measure)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [measure])

  const cls = !open ? `${styles.comment} ${styles.clamp}` : styles.comment
  const clampStyle = { ['--clampLines' as any]: String(lines) }

  return (
    <>
      <p ref={ref} className={cls} style={clampStyle}>{text}</p>

      {canToggle && (
        <button
          type="button"
          className={`${styles.readMore} ${styles.hit}`}
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {open ? 'Weniger' : 'Mehr lesen'}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className={`${styles.readMoreIcon} ${open ? styles.iconUp : styles.iconDown}`}
            aria-hidden
          >
            <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </>
  )
}

/* ---------- Fancy Sort Dropdown ---------- */
function SortDropdown({
  value,
  onChange,
  options = [
    { value: 'neueste',      label: 'Neueste zuerst' },
    { value: 'älteste',      label: 'Älteste zuerst' },
    { value: 'beste',        label: 'Beste zuerst' },
    { value: 'schlechteste', label: 'Schlechteste zuerst' },
  ],
}: {
  value:'neueste'|'älteste'|'beste'|'schlechteste'
  onChange:(v:'neueste'|'älteste'|'beste'|'schlechteste')=>void
  options?:{value:any; label:string}[]
}) {
  const [open, setOpen] = React.useState(false)
  const boxRef = React.useRef<HTMLDivElement|null>(null)

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const current = options.find(o => o.value === value)?.label || ''

  return (
    <div className={styles.sortWrap} ref={boxRef}>
      <span className={styles.sortLabelFancy}>Sortieren:</span>
      <button
        type="button"
        className={`${styles.sortBtn} ${styles.hit}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o=>!o)}
      >
        <span>{current}</span>
        <svg className={styles.sortCaret} width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <ul className={styles.sortMenu} role="listbox">
          {options.map(o => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value===value}
                className={`${styles.sortItem} ${o.value===value ? styles.isActive : ''}`}
                onClick={() => { onChange(o.value as any); setOpen(false) }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ---------- Rating Breakdown (farbige Balken) ---------- */
function RatingBreakdown({ items }: { items: ReviewItem[] }) {
  const counts = [0,0,0,0,0]
  items.forEach(r => { const i = Math.max(1, Math.min(5, Math.round(r.stars))) - 1; counts[i]++ })
  const total = counts.reduce((a,b)=>a+b,0) || 1
  return (
    <div className={styles.breakdown}>
      {[5,4,3,2,1].map((s) => {
        const c = counts[s-1]; const pct = Math.round(c/total*100)
        return (
          <div key={s} className={styles.brRow}>
            <span className={styles.brLabel}>{s}★</span>
            <div className={styles.brBarWrap}>
              <div className={`${styles.brBar} ${styles['brS'+s]}`} style={{width:`${pct}%`}} />
            </div>
            <span className={styles.brPct}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Minimal Empty State (ohne CTAs) ---------- */
function EmptyRatingsLite({ username }: { username: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden>⭐</div>
      <h3 className={styles.emptyTitle}>Noch keine Bewertungen – das kommt noch!</h3>
      <p className={styles.emptyText}>
        Sobald erste Aufträge abgeschlossen sind, erscheinen die Bewertungen hier.
      </p>
    </div>
  )
}
function ReportButton({ reviewId }: { reviewId: string }) {
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [alreadyReported, setAlreadyReported] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [reasonText, setReasonText] = React.useState('');

  // 👉 getrennt: Fehler UNTER der Karte vs. IM Modal
  const [inlineErr, setInlineErr] = React.useState<string | null>(null);
  const [modalErr, setModalErr] = React.useState<string | null>(null);

  // Login-Status über /api/profile prüfen
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/profile', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;
        setIsLoggedIn(res.ok);
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Schon gemeldet? -> aus localStorage lesen
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('reportedReviews');
      if (!raw) return;
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr) && arr.includes(reviewId)) {
        setAlreadyReported(true);
        setDone(true);
      }
    } catch {
      // ignore
    }
  }, [reviewId]);

  function openModal() {
    // alte Fehler zurücksetzen
    setInlineErr(null);
    setModalErr(null);

    if (isLoggedIn === false) {
      // 👉 Login-Fehler weiter UNTER der Karte anzeigen
      setInlineErr('Bitte melde dich an, um eine Bewertung zu melden.');
      return;
    }
    if (alreadyReported) return;

    setReasonText('');
    setModalOpen(true);
  }

  function closeModal() {
    if (sending) return;
    setModalOpen(false);
  }

  async function submitReport() {
    if (isLoggedIn === false) {
      setInlineErr('Bitte melde dich an, um eine Bewertung zu melden.');
      setModalOpen(false);
      return;
    }

    const reason = reasonText.trim();
    if (!reason || reason.length < 5) {
      // 👉 diese Meldung nur IM POPUP anzeigen
      setModalErr('Bitte gib kurz an, warum du diese Bewertung meldest (mind. 5 Zeichen).');
      return;
    }

    setSending(true);
    setModalErr(null);
    setDone(false);

    try {
      const res = await fetch('/api/review-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reviewId,
          reason,
        }),
      });

      if (res.status === 401) {
        setInlineErr('Bitte melde dich an, um eine Bewertung zu melden.');
        setModalOpen(false);
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Fehler beim Senden der Meldung');
      }

      // Erfolg → im localStorage merken
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem('reportedReviews');
          const arr = raw ? (JSON.parse(raw) as string[]) : [];
          if (!arr.includes(reviewId)) arr.push(reviewId);
          window.localStorage.setItem('reportedReviews', JSON.stringify(arr));
        } catch {
          // ignore
        }
      }

      setAlreadyReported(true);
      setDone(true);
      setModalOpen(false);
    } catch (e: any) {
      // 👉 Server-/Netzwerkfehler ebenfalls IM Popup
      setModalErr(e?.message || 'Unbekannter Fehler');
    } finally {
      setSending(false);
    }
  }

  // Nicht eingeloggt → solange unklar, gar nichts rendern
  if (isLoggedIn === false) {
    return null;
  }

  // Bereits gemeldet: nur Hinweis-Text
  if (alreadyReported) {
    return (
      <div className={styles.reportWrap}>
        <span className={styles.reportOk}>Bereits gemeldet</span>
      </div>
    );
  }

  return (
    <>
      <div className={styles.reportWrap}>
        <button
          type="button"
          className={styles.reportBtn}
          onClick={openModal}
          disabled={sending || isLoggedIn === null}
        >
          {sending ? 'Wird gesendet …' : 'Bewertung melden'}
        </button>
        {done && !sending && (
          <span className={styles.reportOk}>Danke, Meldung gesendet.</span>
        )}
        {/* 👉 nur noch Login- / generelle Inline-Fehler hier */}
        {inlineErr && !done && <span className={styles.reportErr}>{inlineErr}</span>}
      </div>

      {modalOpen && (
        <div className={styles.reportModalOverlay} role="dialog" aria-modal="true">
          <div className={styles.reportModal}>
            <h3 className={styles.reportTitle}>Bewertung melden</h3>
            <p className={styles.reportText}>
              Bitte beschreibe kurz, warum diese Bewertung auffällig oder problematisch ist.
            </p>
            <textarea
              className={styles.reportTextarea}
              rows={5}
              maxLength={600}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="z. B. Beleidigung, falsche Fakten, Spam …"
            />
            <div className={styles.reportCounter}>{reasonText.length} / 600 Zeichen</div>

            {/* 👉 Popup-Fehler (mind. 5 Zeichen / Serverfehler) direkt HIER */}
            {modalErr && (
              <p className={styles.reportErr}>{modalErr}</p>
            )}

            <div className={styles.reportActions}>
              <button
                type="button"
                className={styles.reportSecondary}
                onClick={closeModal}
                disabled={sending}
              >
                Abbrechen
              </button>
              <button
                type="button"
                className={styles.reportPrimary}
                onClick={submitReport}
                disabled={sending}
              >
                {sending ? 'Wird gesendet …' : 'Meldung abschicken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default function UserReviewsPage() {
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  const router = useRouter()

  React.useEffect(() => {
    if ('scrollRestoration' in history) {
      const prev = (history as any).scrollRestoration
      ;(history as any).scrollRestoration = 'manual'
      return () => { (history as any).scrollRestoration = prev }
    }
  }, [])

  const page = Math.max(1, parseInt(search.get('page') || '1', 10))
  const pageSize = Math.max(1, Math.min(50, parseInt(search.get('pageSize') || '10', 10)))
  const sortDefault = (search.get('sort') as 'neueste'|'älteste'|'beste'|'schlechteste') || 'neueste'
  const [sortBy, setSortBy] = React.useState<'neueste'|'älteste'|'beste'|'schlechteste'>(sortDefault)

  const { data, error, isLoading } = useSWR<ApiResp>(
    `/api/reviews/by-user/${encodeURIComponent(params.slug)}?page=${page}&pageSize=${pageSize}`,
    fetcher
  )

  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / pageSize))

  function go(to:number) {
    const target = Math.min(Math.max(1, to), pages) // clamp
    const sp = new URLSearchParams(search.toString())
    if (target <= 1) sp.delete('page'); else sp.set('page', String(target))
    sp.set('sort', sortBy)
    if (pageSize !== 10) sp.set('pageSize', String(pageSize))
    router.replace(sp.size ? `?${sp.toString()}` : '?', { scroll: false })
  }

  const sortedItems = React.useMemo(() => {
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

  React.useEffect(() => {
    const sp = new URLSearchParams(search.toString())
    if (sortBy === 'neueste') sp.delete('sort'); else sp.set('sort', sortBy)
    router.replace(sp.size ? `?${sp.toString()}` : '?', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy])

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

              {/* Verteilung + Sortierung bleiben IMMER sichtbar */}
              <RatingBreakdown items={sortedItems} />

              <div className={styles.controls}>
                <SortDropdown value={sortBy} onChange={setSortBy} />
              </div>
            </div>

            {/* LISTE oder Empty */}
            {sortedItems.length === 0 ? (
              <div className={styles.card}>
                <EmptyRatingsLite username={renderProfileTitle()} />
              </div>
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
                    <li key={it.id} className={`${styles.card} ${styles['is-' + ctx.kind]}`}>
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
                        <div className={styles.metaCol} style={{ maxWidth:'100%' }}>
                          <div className={styles.metaLabel}>
                            {ctx.kind === 'lackanfrage' ? 'Kommentar zu Lackanfrage'
                              : ctx.kind === 'auftrag' ? 'Kommentar zu Auftrag'
                              : ctx.kind === 'shop' ? 'Kommentar zum Shop-Artikel'
                              : 'Kommentar'}
                          </div>

                          <CollapsibleText text={it.comment} lines={5} />
                        </div>
                      </div>

                      <div className={styles.bylineRow}>
                <div className={styles.byline}>
                  von {name ? (
                    <Link className={styles.titleLink} href={raterHref} prefetch={false}>
                      {name}
                    </Link>
                  ) : '—'}
                </div>
                <ReportButton reviewId={it.id} />
              </div>

                    </li>
                  )
                })}
              </ul>
            )}

            {/* PAGINATION */}
            <div className={styles.pagination} aria-label="Seitensteuerung" style={{ marginTop: 16 }}>
              <div className={styles.pageInfo} aria-live="polite">
                Seite <strong>{Math.min(Math.max(1, data?.page || 1), pages)}</strong> / <strong>{pages}</strong> – {total} Reviews
              </div>

              <div className={styles.pageButtons}>
                <button className={`${styles.pageBtn} ${styles.hit}`} onClick={() => go(1)} disabled={page <= 1}>«</button>
                <button className={`${styles.pageBtn} ${styles.hit}`} onClick={() => go(page - 1)} disabled={page <= 1}>‹</button>
                <span className={styles.pageNow}>Seite {Math.min(Math.max(1, page), pages)}</span>
                <button className={`${styles.pageBtn} ${styles.hit}`} onClick={() => go(page + 1)} disabled={page >= pages}>›</button>
                <button className={`${styles.pageBtn} ${styles.hit}`} onClick={() => go(pages)} disabled={page >= pages}>»</button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
