'use client'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './auftragsboerse.module.css'
import Navbar from '../components/navbar/Navbar'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import ArtikelContainerAuftragsboerse from '../components/ArtikelContainerAuftragsboerse'
import ArtikelKartenSkeleton from '../components/loading/ArtikelKartenSkeleton'
import type { Auftrag } from '@/lib/types/auftrag'
const VERFAHREN = [
  'Nasslackieren',
  'Pulverbeschichten',
  'KTL-Beschichten',
  'Verzinken',
  'Vernickeln',
  'Verchromen',
  'Verkupfern',
  'Verzinnen',
  'Vermessingen',
  'Bronzebeschichten',
  'Vergolden',
  'Versilbern',
  'Aluminieren',
  'Eloxieren',
  'Anodisieren',
  'Aluminium-Passivieren',
  'Edelstahl-Passivieren',
  'Zinkphosphatieren',
  'Eisenphosphatieren',
  'Mn-Phosphatieren',
  'Brünieren',
  'Beizen',
  'Elektropolieren',
  'Strahlen',
  'Schleifen',
  'Polieren',
  'Bürsten',
  'Trowalisieren',
  'Entgraten',
  'Verrunden',
  'Glätten',
  'Mattieren',
  'Chemisches Glänzen',
  'Entlacken',
  'Entzinken',
  'Entnickeln',
  'Entchromen',
  'Entkupfern',
  'Entmessingen',
  'Entbronzieren',
  'Entgolden',
  'Entsilbern',
  'Entzinnen',
  'Entaluminieren',
  'Enteloxieren',
  'Entanodisieren',
  'Folieren',
  'Isolierstegverpressen',
  'Einlagern',
] as const
const DEFAULT_LIMITS = {
  length: 20000,
  width: 6000,
  height: 3000,
  masse: 20000,
}
type Limits = typeof DEFAULT_LIMITS
type ApiAuftrag = Omit<
  Auftrag,
  'warenausgabeDatum' | 'warenannahmeDatum'
> & {
  warenausgabeDatum?: string | null
  warenannahmeDatum?: string | null
}
type ApiResponse = {
  items?: ApiAuftrag[]
  total?: number
  page?: number
  limit?: number
  limits?: Partial<Limits>
  verfahren_counts?: Record<string, number>
  error?: string
}
function toFiniteNumber(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}
function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  const d = new Date(String(value ?? ''))
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}
export default function AuftragsboerseSeite() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const boolFromQuery = (key: string) => sp.get(key) === '1'
  const [jobs, setJobs] = useState<Auftrag[]>([])
  const [empfehlungen, setEmpfehlungen] = useState<Auftrag[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS)
  const [verfahrenCounts, setVerfahrenCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(VERFAHREN.map((v) => [v, 0]))
  )
  const [suchbegriff, setSuchbegriff] = useState(() => sp.get('q') ?? '')
  const [suchEingabe, setSuchEingabe] = useState(() => sp.get('q') ?? '')
  const [verfahren, setVerfahren] = useState(() => sp.get('verfahren') ?? '')
  const [gewerblich, setGewerblich] = useState(() => boolFromQuery('g'))
  const [privat, setPrivat] = useState(() => boolFromQuery('p'))
  const [sortierung, setSortierung] = useState(() => sp.get('sort') ?? '')
  const [waSelbst, setWaSelbst] = useState(() => boolFromQuery('wa_s'))
  const [waAbhol, setWaAbhol] = useState(() => boolFromQuery('wa_a'))
  const [wnZust, setWnZust] = useState(() => boolFromQuery('wn_z'))
  const [wnSelbst, setWnSelbst] = useState(() => boolFromQuery('wn_s'))
  // null = kein gesetzter Filter; der Slider zeigt das API-Maximum an.
  // So löst das Einlesen der Maximalwerte keinen zweiten Request aus.
  const [maxLength, setMaxLength] = useState<number | null>(() =>
    sp.has('l') ? Number(sp.get('l')) : null
  )
  const [maxWidth, setMaxWidth] = useState<number | null>(() =>
    sp.has('w') ? Number(sp.get('w')) : null
  )
  const [maxHeight, setMaxHeight] = useState<number | null>(() =>
    sp.has('h') ? Number(sp.get('h')) : null
  )
  const [maxMasse, setMaxMasse] = useState<number | null>(() =>
    sp.has('m') ? Number(sp.get('m')) : null
  )
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
  const seitenGroesse = 50
  const [anzeigenLimit, setAnzeigenLimit] = useState(50)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  // Wiederherstellung der Scrollposition bei Filtern, Rückkehr und Pagination.
  const scrollZielRef = useRef<{ typ: 'position' | 'liste'; y?: number } | null>(null)
  const scrollInitialisiertRef = useRef(false)

  useLayoutEffect(() => {
    if (scrollInitialisiertRef.current) return
    scrollInitialisiertRef.current = true
    const url = window.location.pathname + window.location.search
    try {
      const seitenwechsel = window.sessionStorage.getItem('auftragsboerse:seitenwechsel')
      if (seitenwechsel === url) {
        window.sessionStorage.removeItem('auftragsboerse:seitenwechsel')
        scrollZielRef.current = { typ: 'liste' }
        return
      }
      const raw = window.sessionStorage.getItem('auftragsboerse:rueckkehr')
      if (raw) {
        const gespeichert = JSON.parse(raw) as { url: string; y: number; hoehe: number }
        if (gespeichert.url === url && Number.isFinite(gespeichert.y)) {
          window.sessionStorage.removeItem('auftragsboerse:rueckkehr')
          scrollZielRef.current = { typ: 'position', y: gespeichert.y }
          if (contentRef.current && gespeichert.hoehe > 0) {
            contentRef.current.style.minHeight = `${Math.ceil(gespeichert.hoehe)}px`
          }
        }
      }
    } catch { /* Session-Storage ist optional. */ }
  }, [])

  useLayoutEffect(() => {
    if (loading) return
    const ziel = scrollZielRef.current
    scrollZielRef.current = null
    const frame = window.requestAnimationFrame(() => {
      if (ziel?.typ === 'liste') {
        const top = contentRef.current?.getBoundingClientRect().top ?? 0
        window.scrollTo({ top: window.scrollY + top, behavior: 'instant' })
      } else if (ziel?.typ === 'position') {
        window.scrollTo({ top: ziel.y ?? 0, behavior: 'instant' })
      }
      // Nur während des Ladens Höhe reservieren. Sobald die neuen Treffer
      // sichtbar sind, muss die Liste wieder auf ihre echte Höhe schrumpfen.
      // Bei weniger Treffern begrenzt der Browser die Scrollposition automatisch.
      if (contentRef.current) contentRef.current.style.minHeight = ''
    })
    return () => window.cancelAnimationFrame(frame)
  }, [loading])

  const seitenwechselMerken = (href: string) => {
    const url = new URL(href, window.location.href)
    scrollZielRef.current = { typ: 'liste' }
    try {
      window.sessionStorage.setItem('auftragsboerse:seitenwechsel', url.pathname + url.search)
      window.sessionStorage.removeItem('auftragsboerse:rueckkehr')
    } catch { /* Session-Storage ist optional. */ }
  }

  const sidebarRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const keepViewportStable = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (!sidebarRef.current || !sidebarRef.current.contains(target)) return
    const beforeTop = target.getBoundingClientRect().top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterTop = target.getBoundingClientRect().top
        const delta = afterTop - beforeTop
        if (delta !== 0) {
          window.scrollBy({ top: delta, left: 0, behavior: 'auto' })
        }
      })
    })
  }
  const fromUrlRef = useRef(false)
  const spKey = sp.toString()
  // URL -> State
  useEffect(() => {
    fromUrlRef.current = true
    const qFromUrl = sp.get('q') ?? ''
    setSuchbegriff(qFromUrl)
    setSuchEingabe(qFromUrl)
    setVerfahren(sp.get('verfahren') ?? '')
    setGewerblich(sp.get('g') === '1')
    setPrivat(sp.get('p') === '1')
    setSortierung(sp.get('sort') ?? '')
    setWaSelbst(sp.get('wa_s') === '1')
    setWaAbhol(sp.get('wa_a') === '1')
    setWnZust(sp.get('wn_z') === '1')
    setWnSelbst(sp.get('wn_s') === '1')
    setMaxLength(sp.has('l') ? Number(sp.get('l')) : null)
    setMaxWidth(sp.has('w') ? Number(sp.get('w')) : null)
    setMaxHeight(sp.has('h') ? Number(sp.get('h')) : null)
    setMaxMasse(sp.has('m') ? Number(sp.get('m')) : null)
    setAnzeigenLimit(50)
  }, [spKey])
  // State -> URL. Wie bisher wird bei Filteränderungen Seite 1 verwendet.
  useEffect(() => {
    if (fromUrlRef.current) {
      fromUrlRef.current = false
      return
    }
    const params = new URLSearchParams()
    if (suchbegriff) params.set('q', suchbegriff)
    if (verfahren) params.set('verfahren', verfahren)
    if (gewerblich) params.set('g', '1')
    if (privat) params.set('p', '1')
    if (sortierung) params.set('sort', sortierung)
    if (waSelbst) params.set('wa_s', '1')
    if (waAbhol) params.set('wa_a', '1')
    if (wnZust) params.set('wn_z', '1')
    if (wnSelbst) params.set('wn_s', '1')
    if (maxLength !== null) params.set('l', String(maxLength))
    if (maxWidth !== null) params.set('w', String(maxWidth))
    if (maxHeight !== null) params.set('h', String(maxHeight))
    if (maxMasse !== null) params.set('m', String(maxMasse))
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setAnzeigenLimit(50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    suchbegriff,
    verfahren,
    gewerblich,
    privat,
    sortierung,
    waSelbst,
    waAbhol,
    wnZust,
    wnSelbst,
    maxLength,
    maxWidth,
    maxHeight,
    maxMasse,
  ])
  // Backend-Abfrage: Filter, Suche, Sortierung, Count und Pagination laufen in der API.
  useEffect(() => {
    let cancelled = false
    async function loadJobs() {
      try {
        // Der Skeleton ist kürzer als eine volle Auftragsliste. Platz reservieren,
        // damit der Browser beim Filtern nicht zum Seitenanfang springt.
        if (contentRef.current) {
          const bisher = contentRef.current.getBoundingClientRect().height
          const reserviert = Number.parseFloat(contentRef.current.style.minHeight) || 0
          contentRef.current.style.minHeight = `${Math.ceil(Math.max(bisher, reserviert))}px`
        }
        if (!scrollZielRef.current) {
          scrollZielRef.current = { typ: 'position', y: window.scrollY }
        }
        setLoading(true)
        setLoadError(null)
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('limit', String(seitenGroesse))
        if (suchbegriff.trim()) params.set('q', suchbegriff.trim())
        if (verfahren) params.set('verfahren', verfahren)
        if (gewerblich) params.set('g', '1')
        if (privat) params.set('p', '1')
        if (sortierung) params.set('sort', sortierung)
        if (waSelbst) params.set('wa_s', '1')
        if (waAbhol) params.set('wa_a', '1')
        if (wnZust) params.set('wn_z', '1')
        if (wnSelbst) params.set('wn_s', '1')
        if (maxLength !== null) params.set('l', String(maxLength))
        if (maxWidth !== null) params.set('w', String(maxWidth))
        if (maxHeight !== null) params.set('h', String(maxHeight))
        if (maxMasse !== null) params.set('m', String(maxMasse))
        const res = await fetch(`/api/auftraege?${params.toString()}`, {
          cache: 'no-store',
        })
        const json = (await res.json()) as ApiResponse
        if (!res.ok) {
          throw new Error(json?.error ?? 'Aufträge konnten nicht geladen werden.')
        }
        const mapped = (json.items ?? []).map((job): Auftrag => ({
          ...(job as unknown as Auftrag),
          warenausgabeDatum: toDate(job.warenausgabeDatum),
          warenannahmeDatum: toDate(job.warenannahmeDatum),
          dateien: (job as any).dateien ?? [],
        }))
        if (cancelled) return
        const trefferzahl = toFiniteNumber(json.total, 0)
        const hatAktiveFilter = Boolean(
          suchbegriff.trim() || verfahren || gewerblich || privat ||
          waSelbst || waAbhol || wnZust || wnSelbst ||
          maxLength !== null || maxWidth !== null ||
          maxHeight !== null || maxMasse !== null
        )
        let weitereAuftraege: Auftrag[] = []
        // Die Treffer und ihre Zahl bleiben immer unverändert.
        // Empfehlungen bei 0 bis 3 Treffern, nur auf Seite 1 mit aktiven Filtern.
        if (page === 1 && hatAktiveFilter && trefferzahl <= 3) {
          try {
            const empfehlungsParams = new URLSearchParams({
              recommendations: '1', page: '1', limit: String(seitenGroesse + 3),
            })
            const empfehlungsRes = await fetch(`/api/auftraege?${empfehlungsParams}`, {
              cache: 'no-store',
            })
            if (!empfehlungsRes.ok) throw new Error('Empfehlungen konnten nicht geladen werden.')
            const empfehlungsJson = (await empfehlungsRes.json()) as ApiResponse
            const vorhandeneIds = new Set(mapped.map((a) => String(a.id)))
            weitereAuftraege = (empfehlungsJson.items ?? [])
              .filter((a) => !vorhandeneIds.has(String(a.id)))
              .slice(0, seitenGroesse)
              .map((a): Auftrag => ({
                ...(a as unknown as Auftrag),
                warenausgabeDatum: toDate(a.warenausgabeDatum),
                warenannahmeDatum: toDate(a.warenannahmeDatum),
                dateien: (a as any).dateien ?? [],
              }))
          } catch (empfehlungsFehler) {
            // Fehler bei Empfehlungen dürfen die eigentlichen Suchtreffer nicht verdecken.
            console.warn('[auftragsboerse] Empfehlungen fehlgeschlagen:', empfehlungsFehler)
          }
        }
        if (cancelled) return
        setEmpfehlungen(weitereAuftraege)
        setJobs(mapped)
        setTotalCount(trefferzahl)
        const nextLimits: Limits = {
          length: Math.max(
            DEFAULT_LIMITS.length,
            toFiniteNumber(json.limits?.length, DEFAULT_LIMITS.length)
          ),
          width: Math.max(
            DEFAULT_LIMITS.width,
            toFiniteNumber(json.limits?.width, DEFAULT_LIMITS.width)
          ),
          height: Math.max(
            DEFAULT_LIMITS.height,
            toFiniteNumber(json.limits?.height, DEFAULT_LIMITS.height)
          ),
          masse: Math.max(
            DEFAULT_LIMITS.masse,
            toFiniteNumber(json.limits?.masse, DEFAULT_LIMITS.masse)
          ),
        }
        setLimits(nextLimits)
        setVerfahrenCounts({
          ...Object.fromEntries(VERFAHREN.map((v) => [v, 0])),
          ...(json.verfahren_counts ?? {}),
        })
        setAnzeigenLimit(50)
      } catch (error: any) {
        if (cancelled) return
        setLoadError(error?.message ?? 'Aufträge konnten nicht geladen werden.')
        setJobs([])
        setEmpfehlungen([])
        setTotalCount(0)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadJobs()
    return () => {
      cancelled = true
    }
  }, [
    page,
    suchbegriff,
    verfahren,
    gewerblich,
    privat,
    sortierung,
    waSelbst,
    waAbhol,
    wnZust,
    wnSelbst,
    maxLength,
    maxWidth,
    maxHeight,
    maxMasse,
  ])
  useEffect(() => {
    if (page !== 1) return
    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnzeigenLimit((prev) => Math.min(prev + 10, jobs.length))
        }
      },
      { rootMargin: '100px' }
    )
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }
    return () => observerRef.current?.disconnect()
  }, [jobs, page])
  const pageHref = (n: number) => {
    const params = new URLSearchParams(sp.toString())
    if (n <= 1) params.delete('page')
    else params.set('page', String(n))
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / seitenGroesse))
  const anzeigen = page === 1 ? jobs.slice(0, anzeigenLimit) : jobs
  const auftragNavigationMerken = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!(e.target instanceof Element)) return
    const link = e.target.closest('a[href]')
    if (!link || !link.getAttribute('href')?.includes('/auftragsboerse/auftraege/')) return
    try {
      window.sessionStorage.setItem('auftragsboerse:rueckkehr', JSON.stringify({
        url: window.location.pathname + window.location.search,
        y: window.scrollY,
        hoehe: contentRef.current?.getBoundingClientRect().height ?? 0,
      }))
    } catch { /* Session-Storage ist optional. */ }
  }
  return (
    <>
      <Navbar />
      {loading && (
        <div className={styles.topLoader} aria-hidden="true">
          <div className={styles.topLoaderInner} />
        </div>
      )}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Sidebar öffnen"
      >
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar1open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar2open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar3open : ''}`} />
      </button>
      {sidebarOpen && (
        <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
      )}
      <div className={styles.wrapper}>
        <div
          ref={sidebarRef}
          className={`${styles.sidebar} ${
            sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed
          }`}
          onInput={keepViewportStable}
          onChange={keepViewportStable}
        >
          <select
            className={styles.sortSelect}
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
          >
            <option value="">Nach Datum sortieren</option>
            <option value="warenausgabe-auf">Warenausgabe aufsteigend</option>
            <option value="warenausgabe-ab">Warenausgabe absteigend</option>
            <option value="warenannahme-auf">Warenrückgabe aufsteigend</option>
            <option value="warenannahme-ab">Warenrückgabe absteigend</option>
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSuchbegriff(suchEingabe.trim())
            }}
            className={styles.searchRow}
          >
            <input
              className={styles.input}
              type="text"
              placeholder="Aufträge durchsuchen…"
              value={suchEingabe}
              onChange={(e) => setSuchEingabe(e.target.value)}
            />
            <button type="submit" className={styles.searchButton}>
              Suchen
            </button>
          </form>
          <label className={styles.sliderLabel}>
            Max. Länge: {maxLength ?? limits.length} mm
          </label>
          <input
            type="range"
            min={0}
            max={limits.length}
            step={10}
            value={Math.min(maxLength ?? limits.length, limits.length)}
            onChange={(e) => setMaxLength(+e.target.value)}
            className={styles.range}
          />
          <label className={styles.sliderLabel}>
            Max. Breite: {maxWidth ?? limits.width} mm
          </label>
          <input
            type="range"
            min={0}
            max={limits.width}
            step={10}
            value={Math.min(maxWidth ?? limits.width, limits.width)}
            onChange={(e) => setMaxWidth(+e.target.value)}
            className={styles.range}
          />
          <label className={styles.sliderLabel}>
            Max. Höhe: {maxHeight ?? limits.height} mm
          </label>
          <input
            type="range"
            min={0}
            max={limits.height}
            step={10}
            value={Math.min(maxHeight ?? limits.height, limits.height)}
            onChange={(e) => setMaxHeight(+e.target.value)}
            className={styles.range}
          />
          <label className={styles.sliderLabel}>
            Max. Masse: {maxMasse ?? limits.masse} kg
          </label>
          <input
            type="range"
            min={0}
            max={limits.masse}
            step={10}
            value={Math.min(maxMasse ?? limits.masse, limits.masse)}
            onChange={(e) => setMaxMasse(+e.target.value)}
            className={styles.range}
          />
          <div className={styles.checkboxGroup}>
            <strong>Warenausgabe</strong>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={waAbhol}
                onChange={() => setWaAbhol(!waAbhol)}
              />
              Abholung
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={waSelbst}
                onChange={() => setWaSelbst(!waSelbst)}
              />
              Selbstanlieferung
            </label>
          </div>
          <div className={styles.checkboxGroup}>
            <strong>Warenrückgabe</strong>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={wnZust}
                onChange={() => setWnZust(!wnZust)}
              />
              Anlieferung
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={wnSelbst}
                onChange={() => setWnSelbst(!wnSelbst)}
              />
              Selbstabholung
            </label>
          </div>
          <div className={styles.checkboxGroup}>
            <strong>Verfahren</strong>
            {VERFAHREN.map((v) => (
              <label key={v} className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="verfahren"
                  checked={verfahren === v}
                  onChange={() => setVerfahren(v)}
                />
                {v} ({verfahrenCounts[v] ?? 0})
              </label>
            ))}
            <label className={styles.checkboxLabel}>
              <input
                type="radio"
                name="verfahren"
                checked={!verfahren}
                onChange={() => setVerfahren('')}
              />
              Alle
            </label>
          </div>
          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={gewerblich}
                onChange={() => setGewerblich(!gewerblich)}
              />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={privat}
                onChange={() => setPrivat(!privat)}
              />
              Privat
            </label>
          </div>
        </div>
        <div ref={contentRef} className={styles.content} onClickCapture={auftragNavigationMerken}>
          <h3 className={styles.anfrageUeberschrift} style={loading ? { visibility: 'hidden' } : undefined}>
            {`${totalCount} ${totalCount === 1 ? 'offener Auftrag' : 'offene Aufträge'}`}
          </h3>
          {!loading && loadError && (
            <div style={{ padding: '10px 0' }}>
              <strong>Fehler:</strong> {loadError}
            </div>
          )}
          {!loading && !loadError && totalCount === 0 && (
            <div style={{ padding: '10px 0', opacity: 0.9 }}>
              <strong>Keine passenden Aufträge gefunden.</strong>
            </div>
          )}
          {loading ? (
            <div className={styles.auftragSkeletonAbstand}>
              <ArtikelKartenSkeleton anzahl={6} />
            </div>
          ) : (
            <div className={styles.grid}>
              {anzeigen.map((a) => (
                <ArtikelContainerAuftragsboerse key={a.id} artikel={a} />
              ))}
              {page === 1 && <div ref={loadMoreRef} />}
            </div>
          )}
          {!loading && !loadError && empfehlungen.length > 0 && (
            <section aria-label="Weitere Aufträge entdecken" style={{ marginTop: 32 }}>
              <h3 className={styles.anfrageUeberschrift}>Weitere Aufträge entdecken</h3>
              <div className={styles.grid}>
                {empfehlungen.map((auftrag) => (
                  <ArtikelContainerAuftragsboerse key={`empfehlung-${auftrag.id}`} artikel={auftrag} />
                ))}
              </div>
            </section>
          )}
          {!loading && (
            <div className={styles.pagination}>
              {page > 1 && (
                <Link href={pageHref(page - 1)} scroll={false} onClick={() => seitenwechselMerken(pageHref(page - 1))} className={styles.pageArrow}>
                  ←
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => (
                <Link
                  key={i + 1}
                  href={pageHref(i + 1)}
                  scroll={false}
                  onClick={() => seitenwechselMerken(pageHref(i + 1))}
                  className={`${styles.pageLink} ${
                    page === i + 1 ? styles.activePage : ''
                  }`}
                >
                  {i + 1}
                </Link>
              ))}
              {page < totalPages && (
                <Link href={pageHref(page + 1)} scroll={false} onClick={() => seitenwechselMerken(pageHref(page + 1))} className={styles.pageArrow}>
                  →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
