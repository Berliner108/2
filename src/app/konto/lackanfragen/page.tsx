'use client'

import { FC, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import Navbar from '../../components/navbar/Navbar'
import styles from './lackanfragen.module.css'
import CheckoutModal from '../../components/checkout/CheckoutModal'

/* ================= Types ================= */
type LackOffer = {
  id: string
  requestId: string | number
  vendorName: string
  vendorRating: number | null
  vendorRatingCount: number | null
  priceCents: number
  itemCents?: number
  shippingCents?: number
  createdAt: string
  expiresAt?: string | null
}

type SortKey = 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'delivery_asc' | 'delivery_desc'
type TopSection = 'received' | 'submitted'

type RequestMeta = {
  id: string
  title?: string | null
  ort?: string | null
  lieferdatum?: string | null
  delivery_at?: string | null
  data?: Record<string, any> | null
  ownerId?: string | null
  ownerHandle?: string | null
  ownerRating?: number | null
  ownerRatingCount?: number | null
}

/* ================= Helpers ================= */
function asDateLike(v: unknown): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return new Date(v.getTime())
  const d = new Date(v as any)
  return isNaN(+d) ? undefined : d
}
function toDateOrUndef(...vals: Array<string | null | undefined>): Date | undefined {
  for (const v of vals) {
    const d = asDateLike(v || undefined)
    if (d) return d
  }
  return undefined
}
function endOfDay(d?: Date): Date | undefined {
  if (!d) return undefined
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

const itemPathBy = (id: string | number) => `/lackanfragen/artikel/${encodeURIComponent(String(id))}`
const formatEUR = (c: number) => (c / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
const formatDate = (d?: Date) => (d ? d.toLocaleDateString('de-AT') : '—')
const formatDateTime = (d?: Date) => (d ? d.toLocaleString('de-AT') : '—')
// Username = 2–32 Zeichen, alphanumerisch, . _ - erlaubt (nicht am Rand)
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,30}[A-Za-z0-9])?$/;
const asHandleOrNull = (v?: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return HANDLE_RE.test(s) ? s : null;
};


/** Gültig bis: min(created+72h, (lieferdatum - 1 Tag, 23:59)) */
function computeValidUntil(offer: LackOffer, lieferdatum?: Date): Date | undefined {
  const now = Date.now()
  const created = asDateLike(offer.createdAt)
  const plus72h = created ? new Date(created.getTime() + 72 * 60 * 60 * 1000) : undefined
  let dayBeforeEnd: Date | undefined
  if (lieferdatum) {
    dayBeforeEnd = new Date(lieferdatum)
    dayBeforeEnd.setDate(dayBeforeEnd.getDate() - 1)
    dayBeforeEnd.setHours(23, 59, 59, 999)
  }
  const candidates = [plus72h, dayBeforeEnd].filter((d): d is Date => !!d && +d > now)
  if (candidates.length === 0) return undefined
  return new Date(Math.min(...candidates.map(d => +d)))
}

function formatRemaining(target?: Date) {
  if (!target) return { text: '—', level: 'ok' as const }
  const ms = +target - Date.now()
  if (ms <= 0) return { text: 'abgelaufen', level: 'over' as const }
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

/* ============ Pagination UI ============ */
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

/* ============ Tiny Toast Hook ============ */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  return {
    msg,
    ok: (m: string) => setMsg(m),
    err: (m: string) => setMsg(m),
    clear: () => setMsg(null),
    View: () => msg ? (
      <div style={{
        position:'fixed', right:16, bottom:16, padding:'10px 12px',
        borderRadius:10, background:'#111827', color:'#fff', zIndex:1000
      }}>
        {msg} <button onClick={()=>setMsg(null)} style={{marginLeft:8, color:'#fff'}}>×</button>
      </div>
    ) : null
  }
}

/* ============ Skeleton Components ============ */
const GroupSkeleton: FC = () => (
  <div style={{display:'grid', gap:12}}>
    <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
    <div className={styles.skelLine} />
    <div className={styles.skelDropSmall} />
  </div>
)

const PageSkeleton: FC = () => (
  <div className={styles.skeletonPage} role="status" aria-busy="true" aria-label="Lade Angebote">
    <div className={styles.skelHeader}>
      <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
      <div className={styles.skelTwoCols}>
        <div className={styles.skelInput} />
        <div className={styles.skelBlockSmall} />
      </div>
      <div className={styles.skelTwoCols}>
        <div className={styles.skelBlock} />
        <div className={styles.skelBlock} />
      </div>
    </div>
    <div className={styles.skelGrid}>
      {Array.from({length: 4}).map((_, i) => <GroupSkeleton key={i} />)}
    </div>
  </div>
)

/* ================= Component ================= */
const DEFAULTS = { q: '', sort: 'date_desc' as SortKey, tab: 'received' as TopSection, psRec: 10, psSub: 10, pageRec: 1, pageSub: 1 }
const ALLOWED_SORTS: SortKey[] = ['date_desc','date_asc','price_desc','price_asc','delivery_asc','delivery_desc']

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include', cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('Laden fehlgeschlagen')
    return r.json()
  })

const LackanfragenAngebote: FC = () => {
  const router = useRouter()
  const { ok: toastOk, err: toastErr, View: Toast } = useToast()

  // Backend laden (SWR)
  const { data, error, isLoading, mutate } = useSWR<{
    received?: any[]
    submitted?: any[]
    requestIds?: (string | number)[]
    requests?: RequestMeta[]
  }>(
    '/api/lack/offers/for-account',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  )

  // Normalisierung (falls Backend item_amount_cents/shipping_cents liefert)
 const normalizeOffer = (o: any): LackOffer => {
  const item = Number.isFinite(o.itemCents) ? o.itemCents
            : Number.isFinite(o.item_amount_cents) ? o.item_amount_cents
            : Number.isFinite(o.priceCents) ? o.priceCents : 0;

  const ship = Number.isFinite(o.shippingCents) ? o.shippingCents
            : Number.isFinite(o.shipping_cents) ? o.shipping_cents
            : 0;

  const total = Number.isFinite(o.priceCents) ? o.priceCents : (item + ship);

  // ⛔️ Niemals Firmenname anzeigen – nur Username (Handle) zulassen
  // falls Backend vendorName fälschlich company_name enthält, wird es hier verworfen
  const handle =
    asHandleOrNull(o.vendorName)        // falls schon korrekt
    || asHandleOrNull(o.vendorUsername) // falls Backend zusätzlich liefert
    || null;

  return {
    ...o,
    vendorName: handle || 'Anbieter', // UI zeigt nur Handle oder "Anbieter"
    itemCents: item,
    shippingCents: ship,
    priceCents: total,
  } as LackOffer;
};


  const requestIds   = useMemo(() => (data?.requestIds ?? []).map(String), [data])
  const requestMeta  = data?.requests ?? []
  const receivedRaw  = useMemo(() => (data?.received ?? []).map(normalizeOffer), [data])
  const submittedRaw = useMemo(() => (data?.submitted ?? []).map(normalizeOffer), [data])

  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [confirmOffer, setConfirmOffer] = useState<null | {
    requestId: string | number
    offerId: string
    amountCents: number
    itemCents?: number
    shippingCents?: number
    vendor: string
  }>(null)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)

  // requestId, die nach ERFOLG lokal ausgeblendet werden sollen
  const [hiddenAfterSuccess, setHiddenAfterSuccess] = useState<Set<string>>(new Set())
  // merken, welche Request gerade bezahlt wird (zum späteren Hide)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  useEffect(() => {
    if (!confirmOffer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmOffer(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmOffer])

  const [query, setQuery] = useState(DEFAULTS.q)
  const [sort, setSort] = useState<SortKey>(DEFAULTS.sort)
  const [topSection, setTopSection] = useState<TopSection>(DEFAULTS.tab)
  useEffect(() => { try { localStorage.setItem('lack-angeboteTop', topSection) } catch {} }, [topSection])

  const metaById = useMemo(() => {
    const m = new Map<string, RequestMeta>()
    requestMeta.forEach(r => m.set(String(r.id), r))
    return m
  }, [requestMeta])

  const OPEN_REQUEST_IDS = useMemo(() => {
    const s = new Set<string>()
    requestIds.forEach(id => s.add(String(id)))
    receivedRaw.forEach(o => s.add(String(o.requestId)))
    return Array.from(s)
  }, [requestIds, receivedRaw])

  function parseMaxMasse(d?: Record<string, any> | null): number | undefined {
    if (!d) return undefined
    const candidates = [d?.max_masse, d?.maxMasse, d?.menge, d?.menge_kg, d?.gewicht, d?.max_gewicht]
    for (const c of candidates) {
      const n = typeof c === 'string' ? parseFloat(c.replace(',', '.')) : (typeof c === 'number' ? c : NaN)
      if (isFinite(n) && n > 0) return n
    }
    return undefined
  }

  function buildGroupTitle(id: string): string {
    const meta = metaById.get(id)
    const verfahrenstitel =
      (meta?.data?.verfahrenstitel ||
       meta?.data?.verfahrenTitel ||
       meta?.data?.verfahren ||
       meta?.title ||
       `Anfrage #${id}`) as string
    const ort = (meta?.data?.ort || meta?.ort || '').toString().trim()
    const mm = parseMaxMasse(meta?.data)
    const extras = [ort, (typeof mm === 'number' ? `${mm} kg` : '')].filter(Boolean).join(' · ')
    return [verfahrenstitel, extras].filter(Boolean).join(' — ')
  }

  function lieferdatumFor(id: string): Date | undefined {
    const meta = metaById.get(id)
    return toDateOrUndef(meta?.lieferdatum, meta?.delivery_at, meta?.data?.lieferdatum, meta?.data?.delivery_at)
  }

  // Abgelaufene Angebote clientseitig herausfiltern
  const receivedData = useMemo(() => {
    const now = Date.now()
    return receivedRaw.filter(o => {
      const vu = computeValidUntil(o, lieferdatumFor(String(o.requestId)))
      return !!vu && +vu > now
    })
  }, [receivedRaw, metaById])

  const submittedData = useMemo(() => {
    const now = Date.now()
    return submittedRaw.filter(o => {
      const vu = computeValidUntil(o, lieferdatumFor(String(o.requestId)))
      return !!vu && +vu > now
    })
  }, [submittedRaw, metaById])

  const compareBestPrice = (a: number, b: number, dir: 'asc' | 'desc') => {
    const aInf = !Number.isFinite(a), bInf = !Number.isFinite(b)
    if (aInf && bInf) return 0
    if (aInf) return 1
    if (bInf) return -1
    return dir === 'asc' ? a - b : b - a
  }

  function compareDelivery(aTs: number | undefined, bTs: number | undefined, dir: 'asc' | 'desc') {
    const aHas = Number.isFinite(aTs)
    const bHas = Number.isFinite(bTs)
    if (!aHas && !bHas) return 0
    if (!aHas) return 1
    if (!bHas) return -1
    return dir === 'asc' ? (aTs! - bTs!) : (bTs! - aTs!)
  }

  const receivedGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const groups = OPEN_REQUEST_IDS.map(id => {
      const title = buildGroupTitle(id)
      const titleLC = title.toLowerCase()
      const offersForItem = receivedData.filter(o => String(o.requestId) === String(id))
      const offers = offersForItem.filter(o =>
  !q ||
  String(o.requestId).toLowerCase().includes(q) ||
  o.vendorName.toLowerCase().includes(q) ||
  titleLC.includes(q)
)

      const showNoOffersGroup = offersForItem.length === 0 && (!q || titleLC.includes(q))
      const bestPrice = offers.length ? Math.min(...offers.map(o => o.priceCents)) : Infinity
      const latest = offers.length ? Math.max(...offers.map(o => +new Date(o.createdAt))) : 0

      const ld = lieferdatumFor(String(id))
      const deliveryTs = ld ? +ld : undefined

      return { requestId: String(id), title, offers, showNoOffersGroup, bestPrice, latest, deliveryTs }
    })
    // Nur NACH Erfolg lokal ausblenden:
    const visible0 = groups.filter(g => g.offers.length > 0 || g.showNoOffersGroup)
    const visible = visible0.filter(g => !hiddenAfterSuccess.has(String(g.requestId)))
    visible.sort((a, b) => {
      if (sort === 'date_desc')      return b.latest - a.latest
      if (sort === 'date_asc')       return a.latest - b.latest
      if (sort === 'price_desc')     return compareBestPrice(a.bestPrice, b.bestPrice, 'desc')
      if (sort === 'price_asc')      return compareBestPrice(a.bestPrice, b.bestPrice, 'asc')
      if (sort === 'delivery_asc')   return compareDelivery(a.deliveryTs, b.deliveryTs, 'asc')
      if (sort === 'delivery_desc')  return compareDelivery(a.deliveryTs, b.deliveryTs, 'desc')
      return 0
    })
    return visible
  }, [OPEN_REQUEST_IDS, receivedData, query, sort, metaById, hiddenAfterSuccess])

  const submitted = useMemo(() => {
    let arr = submittedData
    if (query.trim()) {
      const q = query.toLowerCase()
      arr = arr.filter(o => String(o.requestId).toLowerCase().includes(q))
    }
    arr = [...arr].sort((a, b) => {
      if (sort === 'date_desc')      return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'date_asc')       return +new Date(a.createdAt) - +new Date(b.createdAt)
      if (sort === 'price_desc')     return b.priceCents - a.priceCents
      if (sort === 'price_asc')      return a.priceCents - b.priceCents
      const tsA = lieferdatumFor(String(a.requestId))?.getTime()
      const tsB = lieferdatumFor(String(b.requestId))?.getTime()
      if (sort === 'delivery_asc')   return compareDelivery(tsA, tsB, 'asc')
      if (sort === 'delivery_desc')  return compareDelivery(tsA, tsB, 'desc')
      return 0
    })
    return arr
  }, [submittedData, query, sort])

  const [pageRec, setPageRec] = useState(DEFAULTS.pageRec)
  const [psRec, setPsRec] = useState<number>(DEFAULTS.psRec)
  const [pageSub, setPageSub] = useState(DEFAULTS.pageSub)
  const [psSub, setPsSub] = useState<number>(DEFAULTS.psSub)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q'); if (q !== null) setQuery(q)
      const s = params.get('sort') as SortKey | null
      if (s && ALLOWED_SORTS.includes(s)) setSort(s)
      const tab = params.get('tab') as TopSection | null
      if (tab && (tab === 'received' || tab === 'submitted')) setTopSection(tab)
      else {
        const saved = localStorage.getItem('lack-angeboteTop')
        if (saved === 'received' || saved === 'submitted') setTopSection(saved as TopSection)
      }
      const lPsRec = Number(localStorage.getItem('lack-angebote:ps:received')) || 10
      const lPsSub = Number(localStorage.getItem('lack-angebote:ps:submitted')) || 10
      const urlPsRec = Number(params.get('psRec'))
      const urlPsSub = Number(params.get('psSub'))
      const initPsRec = [2,10,20,50].includes(urlPsRec) ? urlPsRec : ([2,10,20,50].includes(lPsRec) ? lPsRec : 10)
      const initPsSub = [2,10,20,50].includes(urlPsSub) ? urlPsSub : ([2,10,20,50].includes(lPsSub) ? lPsSub : 10)
      setPsRec(initPsRec); setPsSub(initPsSub)

      const lPageRec = Number(localStorage.getItem('lack-angebote:page:received')) || 1
      const lPageSub = Number(localStorage.getItem('lack-angebote:page:submitted')) || 1
      const urlPageRec = Number(params.get('pageRec')) || undefined
      const urlPageSub = Number(params.get('pageSub')) || undefined
      setPageRec(urlPageRec && urlPageRec > 0 ? urlPageRec : (lPageRec > 0 ? lPageRec : 1))
      setPageSub(urlPageSub && urlPageSub > 0 ? urlPageSub : (lPageSub > 0 ? lPageSub : 1))
    } catch {}
  }, [])

  useEffect(() => { try { localStorage.setItem('lack-angebote:ps:received', String(psRec)) } catch {} }, [psRec])
  useEffect(() => { try { localStorage.setItem('lack-angebote:ps:submitted', String(psSub)) } catch {} }, [psSub])
  useEffect(() => { try { localStorage.setItem('lack-angebote:page:received', String(pageRec)) } catch {} }, [pageRec])
  useEffect(() => { try { localStorage.setItem('lack-angebote:page:submitted', String(pageSub)) } catch {} }, [pageSub])
  useEffect(() => { setPageRec(1); setPageSub(1) }, [query, sort])

  useEffect(() => {
    try {
      const p = new URLSearchParams()
      if (query) p.set('q', query)
      if (sort !== 'date_desc') p.set('sort', sort)
      if (topSection !== 'received') p.set('tab', topSection)
      if (psRec !== 10) p.set('psRec', String(psRec))
      if (psSub !== 10) p.set('psSub', String(psSub))
      if (pageRec !== 1) p.set('pageRec', String(pageRec))
      if (pageSub !== 1) p.set('pageSub', String(pageSub))
      const qs   = p.toString()
      const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`
      const curr = `${window.location.pathname}${window.location.search}`
      if (next !== curr) router.replace(next, { scroll: false })
    } catch {}
  }, [query, sort, topSection, psRec, psSub, pageRec, pageSub, router])

  // Badge „neu“
  useEffect(() => { try { localStorage.setItem('offers:lastSeen', String(Date.now())) } catch {} }, [])

  function sliceByPage<T>(arr: T[], page: number, ps: number) {
    const total = arr.length
    const pages = Math.max(1, Math.ceil(total / ps))
    const safePage = Math.min(Math.max(1, page), pages)
    const start = (safePage - 1) * ps
    const end = Math.min(start + ps, total)
    return { pageItems: arr.slice(start, end), from: total === 0 ? 0 : start + 1, to: end, total, safePage, pages }
  }

  const rec = sliceByPage(receivedGroups, pageRec, psRec)
  useEffect(() => { if (rec.safePage !== pageRec) setPageRec(rec.safePage) }, [rec.safePage, pageRec])

  const sub = sliceByPage(submitted, pageSub, psSub)
  useEffect(() => { if (sub.safePage !== pageSub) setPageSub(sub.safePage) }, [sub.safePage, pageSub])

  /* ===== Modal / Accept Flow ===== */
  function openConfirm(requestId: string | number, offerId: string, amountCents: number, vendor: string, itemCents?: number, shippingCents?: number) {
    setConfirmOffer({ requestId, offerId, amountCents, itemCents, shippingCents, vendor })
  }

  async function confirmAccept() {
    if (!confirmOffer) return
    setAcceptingId(confirmOffer.offerId)
    try {
      const res = await fetch('/api/orders/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'lack', requestId: String(confirmOffer.requestId), offerId: confirmOffer.offerId }),
      })
      const json: { orderId: string; clientSecret?: string | null; error?: string } = await res.json()
      if (!res.ok) {
        if (json.error === 'SELLER_NOT_CONNECTED') throw new Error('Dieser Anbieter hat sein Auszahlungskonto noch nicht verbunden.')
        if (json.error === 'SELLER_NOT_READY')     throw new Error('Dieser Anbieter ist noch nicht auszahlungsbereit.')
        if (json.error === 'OFFER_NOT_FOUND')      throw new Error('Das Angebot existiert nicht mehr oder ist abgelaufen.')
        throw new Error(json.error || 'Annahme fehlgeschlagen.')
      }
      setConfirmOffer(null)
      setActiveOrderId(json.orderId || null)
      await mutate()
      if (json.clientSecret) {
        // NICHT ausblenden; erst nach Zahlungs-Erfolg
        // Merke, welche Request wir nach Erfolg verstecken wollen
        setPendingRequestId(String(confirmOffer.requestId))
        setClientSecret(json.clientSecret)
        setCheckoutOpen(true)
      } else {
        // (Fallback ohne PI/ClientSecret – sollte selten sein)
        toastOk('Angebot angenommen.')
        await mutate()
      }
    } catch (e: any) {
      toastErr(e?.message || 'Konnte Angebot nicht annehmen.')
    } finally {
      setAcceptingId(null)
    }
  }

  const cols = '2fr 1fr 1.2fr 1.6fr 1fr' // Anbieter | Preis | Lieferdatum | Gültig bis | Aktion

  const ReceivedSection = () => (
    <>
      <h2 className={styles.heading}>Erhaltene Angebote für deine Lackanfragen</h2>
      <div className={styles.kontoContainer}>
        {rec.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine Lackanfragen/Angebote sichtbar.</strong></div>
        ) : (
          <>
            <ul className={styles.groupList}>
              {rec.pageItems.map(({ requestId, title, offers, showNoOffersGroup, bestPrice }) => {
                const href  = itemPathBy(requestId)
                const liefer = lieferdatumFor(String(requestId))
                const reqExpires = endOfDay(liefer)

                return (
                  <li key={requestId} className={styles.groupCard}>
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
                      <div className={styles.groupActions}>
                        <Link href={href} className={styles.jobLink}>Zur Lackanfrage</Link>
                      </div>
                    </div>

                    <div className={styles.groupMetaLine} aria-label="Anfrage-Metadaten">
                      <span>Lieferdatum: <strong>{formatDate(liefer)}</strong></span>
                      <span className={styles.metaDot} aria-hidden>•</span>
                      <span>Anfrage läuft bis: <strong>{formatDateTime(reqExpires)}</strong></span>
                    </div>

                    {offers.length === 0 && showNoOffersGroup ? (
                      <div className={styles.groupFootNote}>
                        <strong>Derzeit keine gültigen Angebote.</strong>
                      </div>
                    ) : (
                      <div className={styles.offerTable} role="table" aria-label="Angebote zu dieser Lackanfrage">
                        {offers.length >= 1 && (
                          <div className={styles.offerHeader} role="row" style={{ gridTemplateColumns: cols }}>
                            <div role="columnheader">Anbieter</div>
                            <div role="columnheader">Preis</div>
                            <div role="columnheader">Lieferdatum</div>
                            <div role="columnheader">Angebot gültig bis</div>
                            <div role="columnheader" className={styles.colAction}>Aktion</div>
                          </div>
                        )}

                        {offers
                          .slice()
                          .sort((a,b)=>a.priceCents-b.priceCents)
                          .map(o => {
                            const validUntil = computeValidUntil(o, liefer)
                            const remaining = formatRemaining(validUntil)

                            const ratingTxt =
                              (o.vendorRatingCount && o.vendorRatingCount > 0 && typeof o.vendorRating === 'number')
                                ? `${o.vendorRating.toFixed(1)}/5 · ${o.vendorRatingCount}`
                                : 'keine Bewertungen'

                            return (
                              <div key={o.id} className={styles.offerRow} role="row" style={{ gridTemplateColumns: cols }}>
                                <div role="cell" data-label="Anbieter">
                                  <span className={styles.vendor}>{o.vendorName}</span>
                                  
                                  <span className={styles.vendorRatingSmall}> · {ratingTxt}</span>
                                  {o.priceCents === bestPrice && offers.length > 1 && (
                                    <span className={styles.tagBest}>Bester Preis</span>
                                  )}
                                </div>
                                <div role="cell" className={styles.priceCell} data-label="Preis">
                                  <div>{formatEUR(o.priceCents)}</div>
                                  <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                                    Artikel: {formatEUR(o.itemCents ?? o.priceCents)} · Versand: {(o.shippingCents ?? 0) > 0 ? formatEUR(o.shippingCents!) : 'Kostenlos'}
                                  </div>
                                </div>
                                <div role="cell" data-label="Lieferdatum">
                                  {formatDate(liefer)}
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
                                    onClick={() => openConfirm(
                                      o.requestId,
                                      o.id,
                                      o.priceCents,
                                      o.vendorName,
                                      o.itemCents,
                                      o.shippingCents
                                    )}
                                    title="Angebot annehmen"
                                  >
                                    {acceptingId === o.id ? 'Wird angenommen…' : 'Angebot annehmen'}
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
      <h2 className={styles.heading}>Übersicht zu deinen abgegebenen Angeboten (Lackanfragen)</h2>
      <div className={styles.kontoContainer}>
        {sub.total === 0 ? (
          <div className={styles.emptyState}><strong>Keine gültigen Angeboten abgegeben.</strong></div>
        ) : (
          <>
            <ul className={styles.list}>
              {sub.pageItems.map(o => {
                const id = String(o.requestId)
                const meta = metaById.get(id)
                const title = buildGroupTitle(id)
                const href  = itemPathBy(id)
                const liefer = lieferdatumFor(id)
                const validUntil = computeValidUntil(o, liefer)
                const remaining  = formatRemaining(validUntil)
                const reqExpires = endOfDay(liefer)

                const askerName = meta?.ownerHandle ||  'Anfragesteller'
                const ratingTxt =
                  (typeof meta?.ownerRating === 'number' && isFinite(meta.ownerRating) && meta?.ownerRatingCount && meta.ownerRatingCount > 0)
                    ? `${meta.ownerRating.toFixed(1)}/5 · ${meta.ownerRatingCount}`
                    : 'keine Bewertungen'

                return (
                  <li key={o.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>
                        <Link href={href} className={styles.titleLink}>{title}</Link>
                      </div>
                      <div className={styles.price}>{formatEUR(o.priceCents)}</div>
                    </div>

                    <div className={styles.groupMetaLine} aria-label="Anfrage-Metadaten">
                      <span>Lieferdatum: <strong>{formatDate(liefer)}</strong></span>
                      <span className={styles.metaDot} aria-hidden>•</span>
                      <span>Anfrage läuft bis: <strong>{formatDateTime(reqExpires)}</strong></span>
                    </div>

                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>Anfrage-Nr.: <strong>{o.requestId}</strong></span>
                      <span className={styles.metaItem}>
                        Anfragesteller: <strong>{askerName}</strong>
                       
                        <span className={styles.vendorRatingSmall}> · {ratingTxt}</span>
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
                        Preisaufschlüsselung: Artikel {formatEUR(o.itemCents ?? o.priceCents)} · Versand {(o.shippingCents ?? 0) > 0 ? formatEUR(o.shippingCents!) : 'Kostenlos'}
                      </span>
                    </div>

                    <div className={styles.actions}>
                      <Link href={href} className={styles.jobLink}>Zur Lackanfrage</Link>
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

  if (error)     return <div className={styles.wrapper}>Konnte Daten nicht laden.</div>
  if (isLoading) return <PageSkeleton />

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        <div className={styles.toolbar}>
          <label className={styles.visuallyHidden} htmlFor="search">Suchen</label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Anfrage-Nr., Anbieter oder Titel…"
            className={styles.search}
          />
          <label className={styles.visuallyHidden} htmlFor="sort">Sortierung</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={styles.select}
          >
            <option value="delivery_asc">Frühestes Lieferdatum zuerst</option>
            <option value="delivery_desc">Spätestes Lieferdatum zuerst</option>
            <option value="date_desc">Neueste Anfrage zuerst</option>
            <option value="date_asc">Älteste Anfrage zuerst</option>
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

      {/* Modal: Angebot annehmen */}
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
              <div><strong>Lackanfrage:</strong> #{String(confirmOffer.requestId)}</div>
              <div><strong>Anbieter:</strong> {confirmOffer.vendor}</div>
              <div><strong>Gesamt:</strong> {formatEUR(confirmOffer.amountCents)}</div>
              {Number.isFinite(confirmOffer.itemCents) && (
                <div style={{opacity:.9}}>
                  Artikel: {formatEUR(confirmOffer.itemCents!)} · Versand: {(confirmOffer.shippingCents ?? 0) > 0 ? formatEUR(confirmOffer.shippingCents!) : 'Kostenlos'}
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirmOffer(null)}>
                Abbrechen
              </button>
              <button type="button" className={styles.btnDanger} onClick={confirmAccept}>
                Ja, Angebot annehmen
              </button>
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        clientSecret={clientSecret}
        open={checkoutOpen}
        onCloseAction={() => setCheckoutOpen(false)}
        onSuccessAction={async () => {
          // Jetzt ERST (nach Erfolg) lokal ausblenden:
          if (pendingRequestId) {
            setHiddenAfterSuccess(prev => {
              const n = new Set(prev); n.add(pendingRequestId); return n
            })
          }

          toastOk('Zahlung erfolgreich.')
          setCheckoutOpen(false)

          // sanftes Polling, bis Webhook published=false gesetzt hat
          for (let i = 0; i < 10; i++) {
            await mutate()
            const stillThere = OPEN_REQUEST_IDS.includes(String(pendingRequestId || ''))
            if (!stillThere) break
            await new Promise(r => setTimeout(r, 800))
          }
        }}
      />

      <Toast />
    </>
  )
}

export default LackanfragenAngebote
