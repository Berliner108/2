'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
  const kontoLinkRef = useRef<HTMLAnchorElement | null>(null) // "Mein Konto"-Link
  const [showEdgeBadge, setShowEdgeBadge] = useState(false)
  const [edgeTop, setEdgeTop] = useState<number>(8)

  // --- Badge-Zählung (dein bestehender Code, unverändert außer Form) ---
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

  useEffect(() => {
    let alive = true

    async function loadAllCounts() {
      try {
        // 1) neue Lack-Angebote
        let offersNew = 0
        try {
          const res = await fetch('/api/lack/offers/for-account', { cache: 'no-store' })
          if (res.ok) {
            const j: ForAccountResponseOffers = await res.json()
            const received = Array.isArray(j?.received) ? j.received : []
            const lastSeenOffers = Number(localStorage.getItem('offers:lastSeen') || '0')
            offersNew = received.reduce((acc, o) => {
              const ts = +new Date((o as any).createdAt || (o as any).created_at)
              return ts > lastSeenOffers ? acc + 1 : acc
            }, 0)
          }
        } catch {}

        // 2) Orders + Handlungsbedarf
        let ordersBadge = 0
        try {
          const res = await fetch('/api/orders/for-account', { cache: 'no-store', credentials: 'include' })
          if (res.ok) {
            const j: OrdersResp = await res.json()
            const merged = [...(j.vergeben ?? []), ...(j.angenommen ?? [])]
            const lastSeenOrders = Number(localStorage.getItem('lackOrders:lastSeen') || '0')
            const newEvents = merged.reduce((n, o) => n + (lastEventTs(o) > lastSeenOrders ? 1 : 0), 0)
            const pending   = merged.reduce((n, o) => n + (needsAction(o) ? 1 : 0), 0)
            ordersBadge = newEvents + pending
          }
        } catch {}

        if (alive) setKontoNew(offersNew + ordersBadge)
      } catch {}
    }

    loadAllCounts()
    const id = setInterval(loadAllCounts, 60_000)

    const onBadge = (e: any) => {
      try { const det = e?.detail || {}; if (typeof det.total === 'number') setKontoNew(det.total) } catch {}
    }
    window.addEventListener('navbar:badge', onBadge as any)

    return () => {
      alive = false
      clearInterval(id)
      window.removeEventListener('navbar:badge', onBadge as any)
    }
  }, [])

  // --- KORRIGIERTE Sichtbarkeitsprüfung per BoundingClientRect ---
  useEffect(() => {
    const updateOverlay = () => {
      const nav = navbarRef.current
      const konto = kontoLinkRef.current
      if (!nav || !konto) { setShowEdgeBadge(false); return }

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
    window.addEventListener('scroll', rAFUpdate, { passive: true }) // falls die Navbar nicht ganz oben ist

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
  } catch {}
}, [pathname])


  const displayCounter = kontoNew > 9 ? '9+' : String(kontoNew)

  return (
    <div className={styles.wrapper}>
      {/* scrollbarer Container => ref hier */}
      <nav className={styles.navbar} ref={navbarRef}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = pathname?.startsWith(item.href)
            const isKonto  = item.title === 'Mein Konto'
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
