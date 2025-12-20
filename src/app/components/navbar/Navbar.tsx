'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './navbar.module.css'
import { NAV_ITEMS } from './nav.config'


type ForAccountResponseOffers = {
  received?: Array<{ id: string; createdAt?: string; created_at?: string }>
}

type LackOrder = {
  kind: 'vergeben' | 'angenommen'
  status?: 'in_progress' | 'reported' | 'disputed' | 'confirmed'
  acceptedAt: string
  shippedAt?: string
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  disputeOpenedAt?: string
  refundedAt?: string
  autoReleaseAt?: string
  lastEventAt?: string
}

type OrdersResp = { vergeben: LackOrder[]; angenommen: LackOrder[] }

export default function Navbar() {
  const pathname = usePathname()
  const [kontoNew, setKontoNew] = useState(0)

  // Refs für Overlay/Erkennung
  const navbarRef = useRef<HTMLDivElement | null>(null)       // scrollbarer Container
  const NAV_SCROLL_KEY = 'nav_scroll_left'
  const kontoLinkRef = useRef<HTMLAnchorElement | null>(null) // "Mein Konto"-Link
  const [showEdgeBadge, setShowEdgeBadge] = useState(false)
  const [edgeTop, setEdgeTop] = useState<number>(8)

  const tsOf = (iso?: string) => (iso ? +new Date(iso) : 0)

  function lastEventTs(o: LackOrder): number {
    const fallback =
      o.deliveredConfirmedAt ??
      o.disputeOpenedAt ??
      o.deliveredReportedAt ??
      o.shippedAt ??
      o.refundedAt ??
      o.acceptedAt
    return tsOf(o.lastEventAt || fallback || o.acceptedAt)
  }

  function needsAction(o: LackOrder): boolean {
    if (o.kind === 'angenommen') return (o.status ?? 'in_progress') === 'in_progress'
    return o.status === 'reported'
  }
  useLayoutEffect(() => {
  const nav = navbarRef.current
  if (!nav) return

  // nur bis 1024px (mobil/tablet)
  if (window.innerWidth > 1024) return

  const saved = sessionStorage.getItem(NAV_SCROLL_KEY)
  if (!saved) return

  const x = Number(saved)
  if (!Number.isFinite(x)) return

  nav.scrollLeft = x
}, [])


  useEffect(() => {
    let alive = true

    async function loadAllCounts() {
      try {
        const now = Date.now()
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        const sevenDaysAgo = now - SEVEN_DAYS

        // 1) neue Lack-Angebote
        let offersNew = 0
        try {
          const res = await fetch('/api/lack/offers/for-account', { cache: 'no-store' })
          if (res.ok) {
            const j: ForAccountResponseOffers = await res.json()
            const received = Array.isArray(j?.received) ? j.received : []

            const rawLastSeenOffers = Number(localStorage.getItem('offers:lastSeen') || '0')
            const lastSeenOffers = Math.max(rawLastSeenOffers || 0, sevenDaysAgo)

            offersNew = received.reduce((acc, o) => {
              const ts = +new Date((o as any).createdAt || (o as any).created_at)
              // „neu“ nur, wenn nach lastSeen UND jünger als 7 Tage
              return ts > lastSeenOffers ? acc + 1 : acc
            }, 0)
          }
        } catch {
          // ignore
        }

        // 2) Orders + Handlungsbedarf
        let ordersBadge = 0
        try {
          const res = await fetch('/api/orders/for-account', {
            cache: 'no-store',
            credentials: 'include',
          })
          if (res.ok) {
            const j: OrdersResp = await res.json()
            const merged = [...(j.vergeben ?? []), ...(j.angenommen ?? [])]

            const rawLastSeenOrders = Number(localStorage.getItem('lackOrders:lastSeen') || '0')
            const lastSeenOrders = Math.max(rawLastSeenOrders || 0, sevenDaysAgo)

            // neue Events nur, wenn nach lastSeenOrders (der selbst max. 7 Tage alt ist)
            const newEvents = merged.reduce(
              (n, o) => n + (lastEventTs(o) > lastSeenOrders ? 1 : 0),
              0
            )

            // Handlungsbedarf zählt nur, wenn Event jünger als 7 Tage
            const pending = merged.reduce(
              (n, o) => n + (needsAction(o) && lastEventTs(o) > sevenDaysAgo ? 1 : 0),
              0
            )

            ordersBadge = newEvents + pending
          }
        } catch {
          // ignore
        }

        if (alive) setKontoNew(offersNew + ordersBadge)
      } catch {
        // ignore
      }
    }

    loadAllCounts()
    const id = setInterval(loadAllCounts, 60_000)

    const onBadge = (e: any) => {
      try {
        const det = e?.detail || {}
        if (typeof det.total === 'number') setKontoNew(det.total)
      } catch {
        // ignore
      }
    }
    window.addEventListener('navbar:badge', onBadge as any)

    return () => {
      alive = false
      clearInterval(id)
      window.removeEventListener('navbar:badge', onBadge as any)
    }
  }, [])

  // --- Sichtbarkeitsprüfung per BoundingClientRect ---
  useEffect(() => {
    const updateOverlay = () => {
      const nav = navbarRef.current
      const konto = kontoLinkRef.current
      if (!nav || !konto) {
        setShowEdgeBadge(false)
        return
      }

      const navRect = nav.getBoundingClientRect()
      const kontoRect = konto.getBoundingClientRect()

      // Position des Overlays an die Navbar kleben (oberer Rand)
      setEdgeTop(Math.max(2, Math.round(navRect.top) + 4))

      // Nur wenn die Navbar überhaupt horizontal overflowt
      const isOverflowing = nav.scrollWidth > nav.clientWidth + 1

      // Ist "Mein Konto" rechts außerhalb des sichtbaren Bereichs der Navbar?
      const offToRight = kontoRect.right > navRect.right + 1

      setShowEdgeBadge(isOverflowing && kontoNew > 0 && offToRight)
    }

    // initial + bei Änderungen
    updateOverlay()
    const rAFUpdate = () => requestAnimationFrame(updateOverlay)

    // Scroll- & Resize-Listener
    const nav = navbarRef.current
    nav?.addEventListener('scroll', rAFUpdate, { passive: true })
    window.addEventListener('resize', rAFUpdate, { passive: true })
    window.addEventListener('scroll', rAFUpdate, { passive: true })

    return () => {
      nav?.removeEventListener('scroll', rAFUpdate)
      window.removeEventListener('resize', rAFUpdate)
      window.removeEventListener('scroll', rAFUpdate)
    }
  }, [kontoNew, pathname])

  // Beim Besuch relevanter Konto-Seiten alles Gesehene stempeln
  useEffect(() => {
    if (!pathname) return
    try {
      if (pathname.startsWith('/konto/lackangebote')) {
        localStorage.setItem('lackOrders:lastSeen', String(Date.now()))
      }
      if (pathname.startsWith('/konto/lackanfragen')) {
        localStorage.setItem('offers:lastSeen', String(Date.now()))
      }
    } catch {
      // ignore
    }
  }, [pathname])
  useEffect(() => {
  const nav = navbarRef.current
  if (!nav) return
  if (window.innerWidth > 1024) return

  const onScroll = () => {
    sessionStorage.setItem(NAV_SCROLL_KEY, String(nav.scrollLeft))
  }

  nav.addEventListener('scroll', onScroll, { passive: true })
  return () => nav.removeEventListener('scroll', onScroll)
}, [])


  const displayCounter = kontoNew > 9 ? '9+' : String(kontoNew)

  return (
    <div className={styles.wrapper}>
      {/* scrollbarer Container => ref hier */}
      <nav className={styles.navbar} ref={navbarRef}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = pathname?.startsWith(item.href)
            const isKonto = item.title === 'Mein Konto'
            return (
              <li key={i} className={styles.navItem}>
                <Link
                  href={item.href}
                  ref={isKonto ? kontoLinkRef : undefined}
                  className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''}`}
                >
                  <span className={styles.navButtonLabel}>{item.title}</span>
                  {isKonto && kontoNew > 0 && (
                    <span
                      className={styles.counter}
                      aria-label={`${kontoNew} neue Ereignisse / Aktionen`}
                      title={`${kontoNew} neue Ereignisse / Aktionen`}
                    >
                      {displayCounter}
                    </span>
                  )}
                </Link>

                <div className={styles.dropdown}>
                  {item.links.map((link, j) => (
                    <Link key={j} href={link.href} className={styles.dropdownLink}>
                      {link.text}
                    </Link>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Fixierter Badge am rechten Bildschirmrand */}
      {showEdgeBadge && (
        <div className={styles.edgeBadge} style={{ top: edgeTop }} aria-hidden>
          {displayCounter}
        </div>
      )}
    </div>
  )
}
