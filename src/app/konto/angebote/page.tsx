'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './angebote.module.css'
import CheckoutModal from '../../components/checkout/CheckoutModal'


const JOB_OFFERS_LASTSEEN_KEY = 'jobOffers:lastSeen'


type Verfahren = { name: string; felder: Record<string, any> }
type Job = {
  id: number | string
  verfahren: Verfahren[]
  material?: string
  standort?: string
  beschreibung?: string
  bilder?: string[]
  warenausgabeDatum?: Date | string
  lieferDatum?: Date | string
}

type Offer = {
  id: string
  jobId: string | number

  artikel_cents: number
  versand_cents: number
  gesamt_cents: number

  createdAt: string // ISO
  validUntil: string // ISO

  // live (profiles)
  username: string
  rating_avg: number
  rating_count: number

  // snapshot (job_offers)
  snap_city: string
  snap_country: string
  snap_account_type: string // 'private' | 'business' | ''
  job_verfahren_1?: string
  job_verfahren_2?: string
  job_material?: string
  job_standort?: string

    // Auftraggeber (Owner des Jobs) – kommt aus /api/offers/submitted
    // Auftraggeber (owner)
  owner_username?: string
  owner_rating_avg?: number
  owner_rating_count?: number
  owner_city?: string
  owner_zip?: string



}

/* ================= Helpers ================= */

function asDateLike(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return new Date(v.getTime())
  const d = new Date(v as any)
  return isNaN(+d) ? undefined : d
}

// ✅ OHNE RAL / farbton, Standort kommt aus Profil
function computeJobTitle(job: Job): string {
  const procs = (job.verfahren ?? []).map(v => v.name).filter(Boolean).join(' & ')
  const extras = [job.material, job.standort].filter(Boolean).join(' · ')
  const title = [procs, extras].filter(Boolean).join(' — ')
  return title || `Auftrag #${job.id}`
}

const jobPath = (job: Job) => `/auftragsboerse/auftraege/${job.id}`
const jobPathById = (id: string | number) => `/auftragsboerse/auftraege/${id}`

const formatEUR = (c: number) =>
  (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const formatDateTime = (d?: Date) => (d ? d.toLocaleString('de-AT') : '—')

function computeValidUntil(offer: Offer): Date | undefined {
  return asDateLike(offer.validUntil)
}


function formatRemaining(target?: Date) {
  if (!target) return { text: '—', level: 'ok' as const }
  const ms = +target - Date.now()
  if (ms <= 0) return { text: 'abgelaufen', level: 'critical' as const }
  const totalMinutes = Math.floor(ms / 60000)
  const days  = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60)
  const mins  = totalMinutes % 60
  let text: string
  if (days >= 1)       text = `${days} ${days === 1 ? 'Tag' : 'Tage'} ${hours} Std`
  else if (hours >= 1) text = `${hours} Std ${mins} Min`
  else                 text = `${mins} Min`
  const level = totalMinutes <= 60 ? 'critical' : (totalMinutes <= 24 * 60 ? 'soon' : 'ok')
  return { text, level: level as 'critical' | 'soon' | 'ok' }
}

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'
type TopSection = 'received' | 'submitted'

/* ===== Defaults & Allowed PageSizes ===== */
const DEFAULTS = {
  q: '',
  sort: 'date_desc' as SortKey,
  tab: 'received' as TopSection,
  psRec: 10,
  psSub: 10,
  pageRec: 1,
  pageSub: 1,
}
const ALLOWED_PS = [2, 10, 20, 50]

/* ============ Pagination-UI ============ */
const Pagination: FC<{
  page: number
  setPage: (p:number)=>void
  pageSize: number
  setPageSize: (n:number)=>void
  total: number
  from: number
  to: number
  idPrefix: string
}> = ({ page, setPage, pageSize, setPageSize, total, from, to, idPrefix }) => {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className={styles.pagination} aria-label="Seitensteuerung">
      <div className={styles.pageInfo} id={`${idPrefix}-info`} aria-live="polite">
        {total === 0
          ? 'Keine Einträge'
          : <>Zeige <strong>{from}</strong>–<strong>{to}</strong> von <strong>{total}</strong></>}
      </div>
      <div className={styles.pagiControls}>
        <label className={styles.pageSizeLabel} htmlFor={`${idPrefix}-ps`}>Pro Seite:</label>
        <select
          id={`${idPrefix}-ps`}
          className={styles.pageSize}
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
        >
          <option value={2}>2</option>
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

/* ===== Tiny Toast Hook ===== */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const [variant, setVariant] = useState<'ok' | 'err'>('ok')

  const ok = (text: string) => {
    setVariant('ok')
    setMsg(text)
  }

  const err = (text: string) => {
    setVariant('err')
    setMsg(text)
  }

const View = () =>
  msg ? (
    <div
      className={`${styles.toastRoot} ${
        variant === 'err' ? styles.toastError : styles.toastOk
      }`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.toastText}>{msg}</span>

      <button
        type="button"
        className={styles.toastClose}
        onClick={() => setMsg(null)}
        aria-label="Toast schließen"
      >
        ×
      </button>
    </div>
  ) : null


  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 4000)
    return () => clearTimeout(t)
  }, [msg])

  return { ok, err, View }
}

/* ================= Component ================= */

const Angebote: FC = () => {
  const router = useRouter()
  const { ok: toastOk, err: toastErr, View: Toast } = useToast()
  useEffect(() => {
  try {
    localStorage.setItem(JOB_OFFERS_LASTSEEN_KEY, String(Date.now()))
  } catch {
    // ignore
  }
}, [])


  // ✅ Echte Jobs + Standort aus Profil (/api/konto/jobs)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)

  // Offers später → aktuell leer (keine offers Tabelle)
  const [receivedData, setReceivedData] = useState<Offer[]>([])
  const [submittedData, setSubmittedData] = useState<Offer[]>([])
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const [confirmOffer, setConfirmOffer] = useState<null | {
  jobId: string | number
  offerId: string
  amountCents: number
}>(null)

// ✅ Checkout Modal (wie bei Lackanfragen)
const [checkoutOpen, setCheckoutOpen] = useState(false)
const [clientSecret, setClientSecret] = useState<string | null>(null)
const [pendingJobId, setPendingJobId] = useState<string | null>(null)



  // ESC schließt Modal
  useEffect(() => {
    if (!confirmOffer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmOffer(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOffer])

  // ✅ Jobs laden
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoadingJobs(true)
        const res = await fetch('/api/konto/jobs', { credentials: 'include' })
        if (!res.ok) throw new Error('Jobs konnten nicht geladen werden')
        const json = await res.json()

        const loc = String(json?.standort ?? '')
        const rows = Array.isArray(json?.jobs) ? json.jobs : []

        const mapped: Job[] = rows.map((r: any) => {
          const verfahren: Verfahren[] = [
            r.verfahren_1 ? { name: String(r.verfahren_1), felder: {} } : null,
            r.verfahren_2 ? { name: String(r.verfahren_2), felder: {} } : null,
          ].filter(Boolean) as any

          return {
            id: String(r.id),
            verfahren,
            material: String(r.material_guete_custom || r.material_guete || ''),
            standort: loc,
          }
        })

        if (!alive) return
        setJobs(mapped)
      } catch (e) {
        console.error(e)
        if (alive) setJobs([])
      } finally {
        if (alive) setLoadingJobs(false)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
  let alive = true

const mapRow = (o: any): Offer => ({
  id: String(o.id),
  jobId: String(o.job_id ?? o.jobId),

  artikel_cents: Number(o.artikel_cents ?? 0),
  versand_cents: Number(o.versand_cents ?? 0),
  gesamt_cents: Number(o.gesamt_cents ?? 0),

  createdAt: String(o.created_at ?? o.createdAt),
  validUntil: String(o.valid_until ?? o.validUntil),

  // received: Anbieter (kommt als username/rating_*)
  username: String(o.username ?? ''),
  rating_avg: Number(o.rating_avg ?? 0),
  rating_count: Number(o.rating_count ?? 0),

  // snapshot
  snap_city: String(o.snap_city ?? '—') || '—',
  snap_country: String(o.snap_country ?? '—') || '—',
  snap_account_type: String(o.snap_account_type ?? ''),

  // job title daten
  job_verfahren_1: String(o.job_verfahren_1 ?? ''),
  job_verfahren_2: String(o.job_verfahren_2 ?? ''),
  job_material: String(o.job_material ?? ''),
  job_standort: String(o.job_standort ?? ''),

  // submitted: Auftraggeber (kommt als owner_*)
  owner_username: String(o.owner_username ?? ''),
  owner_rating_avg: Number(o.owner_rating_avg ?? 0),
  owner_rating_count: Number(o.owner_rating_count ?? 0),
  owner_city: String(o.owner_city ?? '—'),
  owner_zip: String(o.owner_zip ?? '—'),
})


  const loadOffers = async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/offers/received', { credentials: 'include' }),
        fetch('/api/offers/submitted', { credentials: 'include' }),
      ])

      const j1 = await r1.json().catch(() => ({} as any))
      const j2 = await r2.json().catch(() => ({} as any))

      if (!r1.ok) throw new Error(j1?.error || 'received_failed')
      if (!r2.ok) throw new Error(j2?.error || 'submitted_failed')

      if (!alive) return

      setReceivedData(Array.isArray(j1?.offers) ? j1.offers.map(mapRow) : [])
      setSubmittedData(Array.isArray(j2?.offers) ? j2.offers.map(mapRow) : [])
    } catch (e) {
      console.error(e)
      if (!alive) return
      setReceivedData([])
      setSubmittedData([])
    }
  }

  loadOffers()
  const id = setInterval(loadOffers, 60_000)

  return () => {
    alive = false
    clearInterval(id)
  }
}, [])


  const jobsById = useMemo(() => {
    const map = new Map<string, Job>()
    for (const j of jobs) map.set(String(j.id), j)
    return map
  }, [jobs])

  // ✅ offene Jobs = alle geladenen Jobs
  const OPEN_JOB_IDS = useMemo(() => jobs.map(j => String(j.id)), [jobs])

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('date_desc')
  const [topSection, setTopSection] = useState<TopSection>('received')

  // Tab-Auswahl speichern
  useEffect(() => {
    try { localStorage.setItem('angeboteTop', topSection) } catch {}
  }, [topSection])

const pruneExpiredOffers = () => {
  const now = Date.now()
  setReceivedData(prev =>
    prev.filter(o => {
      const vu = computeValidUntil(o)
      return !!vu && +vu > now
    })
  )
  setSubmittedData(prev =>
    prev.filter(o => {
      const vu = computeValidUntil(o)
      return !!vu && +vu > now
    })
  )
}


  const compareBestPrice = (a: number, b: number, dir: 'asc' | 'desc') => {
    const aInf = !Number.isFinite(a), bInf = !Number.isFinite(b)
    if (aInf && bInf) return 0
    if (aInf) return 1
    if (bInf) return -1
    return dir === 'asc' ? a - b : b - a
  }

  useEffect(() => {
    pruneExpiredOffers()
    const id = setInterval(pruneExpiredOffers, 60_000)
    const onVis = () => { if (!document.hidden) pruneExpiredOffers() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  /* ===== Filter + Sort ===== */
  const receivedGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const groups = OPEN_JOB_IDS.map(id => {
      const job = jobsById.get(String(id))
      const titleLC = job ? computeJobTitle(job).toLowerCase() : `auftrag #${id}`

      const offersForJob = receivedData.filter(o => String(o.jobId) === String(id))
      const offers = offersForJob.filter(o =>
        !q ||
        String(o.jobId).toLowerCase().includes(q) ||
        (o.username || '').toLowerCase().includes(q) ||
        titleLC.includes(q)
      )

      const showNoOffersGroup = offersForJob.length === 0 && (!q || titleLC.includes(q))
      const bestPrice = offers.length ? Math.min(...offers.map(o => o.gesamt_cents)) : Infinity
      const latest = offers.length ? Math.max(...offers.map(o => +new Date(o.createdAt))) : 0

      return { jobId: String(id), job, offers, showNoOffersGroup, bestPrice, latest }
    })

    const visible = groups.filter(g => g.offers.length > 0 || g.showNoOffersGroup)

    visible.sort((a, b) => {
      if (sort === 'date_desc')  return b.latest - a.latest
      if (sort === 'date_asc')   return a.latest - b.latest
      if (sort === 'price_desc') return compareBestPrice(a.bestPrice, b.bestPrice, 'desc')
      if (sort === 'price_asc')  return compareBestPrice(a.bestPrice, b.bestPrice, 'asc')
      return 0
    })

    return visible
  }, [OPEN_JOB_IDS, jobsById, receivedData, query, sort])

  const submitted = useMemo(() => {
    let arr = submittedData
    if (query.trim()) {
      const q = query.toLowerCase()
      arr = arr.filter(o => String(o.jobId).toLowerCase().includes(q))
    }
    arr = [...arr].sort((a, b) => {
      if (sort === 'date_desc')  return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'date_asc')   return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'price_desc') return b.gesamt_cents - a.gesamt_cents
      if (sort === 'price_asc')  return a.gesamt_cents - b.gesamt_cents

      return 0
    })
    return arr
  }, [submittedData, query, sort])

  /* ===== Pagination-States ===== */
  const [pageRec, setPageRec] = useState(1)
  const [psRec, setPsRec] = useState<number>(10)
  const [pageSub, setPageSub] = useState(1)
  const [psSub, setPsSub] = useState<number>(10)

  /* ===== URL → State (mit Fallback LocalStorage) ===== */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)

      const q = params.get('q')
      if (q !== null) setQuery(q)

      const s = params.get('sort') as SortKey | null
      if (s && ['date_desc','date_asc','price_desc','price_asc'].includes(s)) setSort(s)

      const tab = params.get('tab') as TopSection | null
      if (tab && (tab === 'received' || tab === 'submitted')) {
        setTopSection(tab)
      } else {
        const saved = localStorage.getItem('angeboteTop')
        if (saved === 'received' || saved === 'submitted') setTopSection(saved as TopSection)
      }

      const lPsRec = Number(localStorage.getItem('angebote:ps:received')) || DEFAULTS.psRec
      const lPsSub = Number(localStorage.getItem('angebote:ps:submitted')) || DEFAULTS.psSub
      const urlPsRec = Number(params.get('psRec'))
      const urlPsSub = Number(params.get('psSub'))
      const initPsRec = ALLOWED_PS.includes(urlPsRec) ? urlPsRec : (ALLOWED_PS.includes(lPsRec) ? lPsRec : DEFAULTS.psRec)
      const initPsSub = ALLOWED_PS.includes(urlPsSub) ? urlPsSub : (ALLOWED_PS.includes(lPsSub) ? lPsSub : DEFAULTS.psSub)
      setPsRec(initPsRec)
      setPsSub(initPsSub)

      const lPageRec = Number(localStorage.getItem('angebote:page:received')) || DEFAULTS.pageRec
      const lPageSub = Number(localStorage.getItem('angebote:page:submitted')) || DEFAULTS.pageSub
      const urlPageRec = Number(params.get('pageRec')) || undefined
      const urlPageSub = Number(params.get('pageSub')) || undefined
      setPageRec(urlPageRec && urlPageRec > 0 ? urlPageRec : (lPageRec > 0 ? lPageRec : DEFAULTS.pageRec))
      setPageSub(urlPageSub && urlPageSub > 0 ? urlPageSub : (lPageSub > 0 ? lPageSub : DEFAULTS.pageSub))
    } catch {}
  }, [])

  // ✅ Erfolg / Fehler nach Job-Veröffentlichung & Promo-Checkout
  useEffect(() => {
    try {
      const url   = new URL(window.location.href)
      const params = url.searchParams
      let changed = false

      // 1) Job erfolgreich veröffentlicht
      const published = params.get('job_published')
      if (published === '1' || published === 'true') {
        toastOk('Auftrag wurde erfolgreich veröffentlicht.')
        params.delete('job_published')
        changed = true
      }

      // 2) Promo-Status (Bewerbung)
      const promo = params.get('job_promo')
      if (promo) {
  if (promo === 'success') {
    toastOk('Bewerbung für deinen Auftrag ist jetzt aktiv.')
  } else if (promo === 'canceled') {
    toastErr('Bewerbung wurde abgebrochen.')
  } else if (promo === 'failed') {
    toastErr('Bewerbung konnte nicht abgeschlossen werden.')
  } else if (promo === 'pending') {
    toastOk('Auftrag wurde veröffentlicht. Checkout wurde geöffnet – du kannst die Bewerbung hier jederzeit erneut starten.')
  }

  params.delete('job_promo')
  params.delete('session_id')
  params.delete('job_id')
  changed = true
}
      if (changed) {
        const nextSearch = params.toString()
        const next = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}`
        const curr = `${window.location.pathname}${window.location.search}`
        if (next !== curr) {
          router.replace(next, { scroll: false })
        }
      }
    } catch {
      // ignorieren
    }
  }, [router, toastOk, toastErr])

  /* ===== Persistenzen ===== */
  useEffect(() => { try { localStorage.setItem('angebote:ps:received', String(psRec)) } catch {} }, [psRec])
  useEffect(() => { try { localStorage.setItem('angebote:ps:submitted', String(psSub)) } catch {} }, [psSub])
  useEffect(() => { try { localStorage.setItem('angebote:page:received', String(pageRec)) } catch {} }, [pageRec])
  useEffect(() => { try { localStorage.setItem('angebote:page:submitted', String(pageSub)) } catch {} }, [pageSub])
  useEffect(() => { setPageRec(1); setPageSub(1) }, [query, sort])

  /* ===== URL-Synchronisation ===== */
  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (query !== DEFAULTS.q)         p.set('q', query)
      if (sort !== DEFAULTS.sort)       p.set('sort', sort)
      if (topSection !== DEFAULTS.tab)  p.set('tab', topSection)
      if (psRec !== DEFAULTS.psRec)     p.set('psRec', String(psRec))
      if (psSub !== DEFAULTS.psSub)     p.set('psSub', String(psSub))
      if (pageRec !== DEFAULTS.pageRec) p.set('pageRec', String(pageRec))
      if (pageSub !== DEFAULTS.pageSub) p.set('pageSub', String(pageSub))

      const qs   = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`

      if (next !== curr) {
        router.replace(next, { scroll: false })
      }
    } catch {}
  }, [query, sort, topSection, psRec, psSub, pageRec, pageSub, router])

  function sliceByPage<T>(arr: T[], page: number, ps: number) {
    const total = arr.length
    const pages = Math.max(1, Math.ceil(total / ps))
    const safePage = Math.min(Math.max(1, page), pages)
    const start = (safePage - 1) * ps
    const end = Math.min(start + ps, total)
    return {
      pageItems: arr.slice(start, end),
      from: total === 0 ? 0 : start + 1,
      to: end,
      total,
      safePage,
      pages,
    }
  }

  const rec = sliceByPage(receivedGroups, pageRec, psRec)
  useEffect(() => { if (rec.safePage !== pageRec) setPageRec(rec.safePage) }, [rec.safePage, pageRec])

  const sub = sliceByPage(submitted, pageSub, psSub)
  useEffect(() => { if (sub.safePage !== pageSub) setPageSub(sub.safePage) }, [sub.safePage, pageSub])



  function openConfirm(jobId: string | number, offerId: string, amountCents: number) {
  setConfirmOffer({ jobId, offerId, amountCents })
}
async function resetAfterCancel() {
  const jid = pendingJobId
  if (!jid) return

  try {
    await fetch(`/api/jobs/${encodeURIComponent(String(jid))}/offers/unselect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}), // offerId optional – wir lassen leer
    })
  } catch (e) {
    console.error('unselect failed:', e)
  } finally {
    // UI-State immer sauber machen
    setCheckoutOpen(false)
    setClientSecret(null)
    setPendingJobId(null)
  }
}

async function confirmAccept() {
  if (!confirmOffer) return

  const { jobId, offerId } = confirmOffer
  setAcceptingId(offerId)

  try {
    // 1) Offer auswählen (select)
    const sel = await fetch(`/api/jobs/${encodeURIComponent(String(jobId))}/offers`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ offerId }),
    })

    const selJson = await sel.json().catch(() => ({} as any))
    if (!sel.ok || !selJson?.ok) {
      throw new Error(selJson?.error || 'select_failed')
    }

    // 2) PaymentIntent erstellen => clientSecret holen
    const piRes = await fetch('/api/jobs/orders/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        jobId: String(jobId),
        offerId,
      }),
    })

    const piJson = await piRes.json().catch(() => ({} as any))
    if (!piRes.ok) throw new Error(piJson?.error || 'create_pi_failed')
    if (!piJson?.clientSecret) throw new Error('missing_client_secret')

    // 3) CheckoutModal öffnen
    setPendingJobId(String(jobId))
    setClientSecret(String(piJson.clientSecret))
    setCheckoutOpen(true)

    setConfirmOffer(null)
  } catch (e: any) {
    console.error(e)
    toastErr(e?.message || 'Konnte Checkout nicht starten.')
    setConfirmOffer(null)
  } finally {
    setAcceptingId(null)
  }
}


  const cols = '2fr 1fr 1.6fr 1fr'

  const ReceivedSection = () => (
    <>
      <h2 className={styles.heading}>Erhaltene Angebote für deine zu vergebenden Aufträge</h2>
      <div className={styles.kontoContainer}>
        {loadingJobs ? (
          <div className={styles.emptyState}><strong>Lade deine Aufträge…</strong></div>
        ) : rec.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine offenen Aufträge gefunden.</strong></div>
        ) : (
          <>
            <ul className={styles.groupList}>
              {rec.pageItems.map(({ jobId, job, offers, showNoOffersGroup, bestPrice }) => {
                const title = job ? computeJobTitle(job) : `Auftrag #${jobId}`
                const href  = job ? jobPath(job) : jobPathById(jobId)

                return (
                  <li key={jobId} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div className={styles.groupTitle}>
                        <Link href={href} className={styles.titleLink}>{title}</Link>
                        <span className={styles.groupCounter}>
                          {offers.length} {offers.length === 1 ? 'Angebot' : 'Angebote'}
                        </span>
                        {offers.length > 0 && (
                          <span className={styles.bestPrice}>{formatEUR(bestPrice)}</span>
                        )}
                      </div>
                    </div>

                    {offers.length === 0 && showNoOffersGroup ? (
                      <div className={styles.groupFootNote}>Derzeit keine gültigen Angebote.</div>
                    ) : (
                      <div className={styles.offerTable} role="table" aria-label="Angebote zu diesem Auftrag">
                        {offers.length >= 1 && (
                          <div className={styles.offerHeader} role="row" style={{ gridTemplateColumns: cols }}>
                            <div role="columnheader">Anbieter</div>
                            <div role="columnheader">Preis</div>
                            <div role="columnheader">Angebot gültig bis</div>
                            <div role="columnheader" className={styles.colAction}>Aktion</div>
                          </div>
                        )}

                        {offers
                          .slice()
                          .sort((a,b)=>a.gesamt_cents-b.gesamt_cents)

                          .map(o => {
                            const validUntil = computeValidUntil(o)!

                            const remaining = formatRemaining(validUntil)
                            return (
                              <div key={o.id} className={styles.offerRow} role="row" style={{ gridTemplateColumns: cols }}>
                                <div role="cell" data-label="Anbieter">
                                  {o.username ? (
                                      <Link href={`/u/${o.username}/reviews`} className={styles.titleLink}>
                                        <span className={styles.vendor}>{o.username}</span>
                                      </Link>
                                    ) : (
                                      <span className={styles.vendor}>—</span>
                                    )}


                                <span className={styles.vendorSub}>
                                {(o.snap_country || '—')} · {(o.snap_city || '—')} · {
                                  o.snap_account_type
                                    ? (o.snap_account_type === 'business' ? 'Gewerblich' : 'Privat')
                                    : '—'
                                }
                              </span>


                                <span className={styles.vendorRating}>
                                  {o.rating_count > 0
                                    ? `Bewertung: ${o.rating_avg.toFixed(1)}/5 · ${o.rating_count}`
                                    : 'Bewertung: Noch keine Bewertungen'}
                                </span>

                                {o.gesamt_cents === bestPrice && offers.length > 1 && (
                                  <span className={styles.tagBest}>Bester Preis</span>
                                )}

                                </div>
                                <div role="cell" className={styles.priceCell} data-label="Preis">
                                  <div className={styles.priceMain}>{formatEUR(o.gesamt_cents)}</div>
                                  <div className={styles.priceSplit}>
                                    {formatEUR(o.artikel_cents)} (Auftrag) · {formatEUR(o.versand_cents)} (Logistik)
                                  </div>

                                </div>
                                <div role="cell" className={styles.validCell} data-label="Gültig bis">
                                  <span>{formatDateTime(validUntil)}</span>
                                  <span
                                    className={[
                                      styles.expBadge,
                                      remaining.level === 'soon' ? styles.expSoon : '',
                                      remaining.level === 'critical' ? styles.expCritical : '',
                                    ].join(' ')}
                                  >
                                    läuft ab in {remaining.text}
                                  </span>
                                </div>
                                <div role="cell" className={styles.colAction} data-label="Aktion">
                                  <button
                                    type="button"
                                    className={styles.acceptBtn}
                                    disabled={acceptingId === o.id}
                                    onClick={() => openConfirm(o.jobId, o.id, o.gesamt_cents)}


                                    title="Anbieter beauftragen"
                                  >
                                    {acceptingId === o.id ? 'Wird angenommen…' : 'Auftrag vergeben'}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <Pagination
              page={rec.safePage}
              setPage={setPageRec}
              pageSize={psRec}
              setPageSize={setPsRec}
              total={rec.total}
              from={rec.from}
              to={rec.to}
              idPrefix="rec"
            />
          </>
        )}
      </div>
    </>
  )

  const SubmittedSection = () => (
    <>
      <h2 className={styles.heading}>Übersicht zu deinen abgegebenen Angeboten</h2>
      <div className={styles.kontoContainer}>
        {sub.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine gültigen Angebote abgegeben.</strong></div>
        ) : (
          <>
            <ul className={styles.list}>
              {sub.pageItems.map(o => {
                const procs = [o.job_verfahren_1, o.job_verfahren_2].filter(Boolean).join(' & ')
                const material = (o.job_material || '').trim()

                const zip = (o.owner_zip || '').trim()
                const city = (o.owner_city || '').trim()
                const place = [zip, city].filter(v => v && v !== '—').join(' ')

                const extras = [material, place].filter(Boolean).join(' · ')
                const title = [procs, extras].filter(Boolean).join(' — ') || `Auftrag #${o.jobId}`



                const href  = jobPathById(o.jobId)

                const validUntil = computeValidUntil(o)!
                const remaining = formatRemaining(validUntil)
                return (
                  <li key={o.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>
                        <Link href={href} className={styles.titleLink}>{title}</Link>
                      </div>
                       <div className={styles.priceCell}>
                        <div className={styles.priceMain}>{formatEUR(o.gesamt_cents)}</div>
                        <div className={styles.priceSplit}>
                          {formatEUR(o.artikel_cents)} (Auftrag) ·{' '}
                          {formatEUR(o.versand_cents)} (Logistik)
                          {o.versand_cents === 0 ? ' (Selbstanlieferung & Selbstabholung)' : ''}
                        </div>
                      </div>

                    </div>
                    <div className={styles.cardMeta}>
  <span className={styles.metaItem}>
    Auftrags-Nr.: <strong>{o.jobId}</strong>
  </span>

  <span className={styles.metaItem}>
  Auftraggeber:{' '}
  {o.owner_username ? (
    <Link href={`/u/${o.owner_username}/reviews`} className={styles.titleLink}>
      <strong>{o.owner_username}</strong>
    </Link>
  ) : (
    <strong>—</strong>
  )}
  <span className={styles.vendorRating}>
    {' '}· {o.owner_rating_count && o.owner_rating_count > 0
      ? `${Number(o.owner_rating_avg ?? 0).toFixed(1)}/5 · ${o.owner_rating_count}`
      : 'keine Bewertungen'}
  </span>
</span>

  <span className={styles.metaItem}>
    Gültig bis: {formatDateTime(validUntil)}{' '}
    <span
      className={[
        styles.expBadge,
        remaining.level === 'soon' ? styles.expSoon : '',
        remaining.level === 'critical' ? styles.expCritical : '',
      ].join(' ')}
    >
      läuft ab in {remaining.text}
    </span>
  </span>

  <span className={styles.metaItem}>
    Preisaufschlüsselung: Auftrag {formatEUR(o.artikel_cents)} · Logistik{' '}
    {o.versand_cents === 0 ? '0,00 € (Selbstanlieferung & Selbstabholung)' : formatEUR(o.versand_cents)}
  </span>
</div>

                  </li>
                )
              })}
            </ul>

            <Pagination
              page={sub.safePage}
              setPage={setPageSub}
              pageSize={psSub}
              setPageSize={setPsSub}
              total={sub.total}
              from={sub.from}
              to={sub.to}
              idPrefix="sub"
            />
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      <Navbar />
      {/* Toast oben einblenden */}
      <Toast />

      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="search">Suchen</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Auftrags-Nr. oder Titel…"
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
            <option value="price_desc">Bester Preis zuletzt</option>
            <option value="price_asc">Bester Preis zuerst</option>
          </select>

          <div className={styles.segmented} role="tablist" aria-label="Reihenfolge wählen">
            <button
              role="tab"
              aria-selected={topSection === 'received'}
              className={`${styles.segmentedBtn} ${topSection === 'received' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('received')}
              type="button"
            >
              Erhaltene oben
            </button>
            <button
              role="tab"
              aria-selected={topSection === 'submitted'}
              className={`${styles.segmentedBtn} ${topSection === 'submitted' ? styles.segmentedActive : ''}`}
              onClick={() => setTopSection('submitted')}
              type="button"
            >
              Abgegebene oben
            </button>
          </div>
        </div>

        {topSection === 'received' ? (
          <>
            <ReceivedSection />
            <hr className={styles.divider} />
            <SubmittedSection />
          </>
        ) : (
          <>
            <SubmittedSection />
            <hr className={styles.divider} />
            <ReceivedSection />
          </>
        )}
      </div>

      {confirmOffer && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmTitle"
          aria-describedby="confirmText"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmOffer(null) }}
        >
          <div className={styles.modalContent}>
            <h3 id="confirmTitle" className={styles.modalTitle}>Bestätigen?</h3>
            <p id="confirmText" className={styles.modalText}>
              Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className={styles.modalSummary}>
              <div><strong>Auftragnummer:</strong> #{String(confirmOffer.jobId)}</div>
              <div><strong>Angebot-ID:</strong> {confirmOffer.offerId}</div>

              <div><strong>Preis:</strong> {formatEUR(confirmOffer.amountCents)}</div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirmOffer(null)}>
                Abbrechen
              </button>
              <button type="button" className={styles.btnDanger} onClick={confirmAccept}>
                Ja, endgültig vergeben
              </button>
            </div>
          </div>
        </div>
      )}
      <CheckoutModal
        clientSecret={clientSecret}
        open={checkoutOpen}
        onCloseAction={async () => {
          // Modal geschlossen = Abbruch -> DB zurücksetzen
          await resetAfterCancel()
          toastErr('Zahlung abgebrochen – Auswahl zurückgesetzt.')
        }}
        onSuccessAction={async () => {
          toastOk('Zahlung erfolgreich.')
          setCheckoutOpen(false)
          setClientSecret(null)
          setPendingJobId(null)
          // optional: reload offers
          // router.refresh()
        }}
      />


    </>
  )
}

export default Angebote
