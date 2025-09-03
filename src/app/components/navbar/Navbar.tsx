'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import styles from './navbar.module.css'
import { NAV_ITEMS } from './nav.config'

type ForAccountResponse = {
  received?: Array<{ id: string; createdAt?: string; created_at?: string }>
}

export default function Navbar() {
  const pathname = usePathname()
  const [kontoNew, setKontoNew] = useState(0)
  const mountedRef = useRef(false)

  // Laden & zählen neuer Angebote (seit letztem "gesehen")
  useEffect(() => {
    mountedRef.current = true

    async function loadCount() {
      try {
        const res = await fetch('/api/lack/offers/for-account', { cache: 'no-store' })
        if (!res.ok) return
        const j: ForAccountResponse = await res.json()

        const received = Array.isArray(j?.received) ? j.received : []
        const lastSeen = Number(localStorage.getItem('offers:lastSeen') || '0')

        const newCount = received.reduce((acc, o) => {
          const ts = +new Date((o as any).createdAt || (o as any).created_at)
          return ts > lastSeen ? acc + 1 : acc
        }, 0)

        if (mountedRef.current) setKontoNew(newCount)
      } catch {
        /* noop */
      }
    }

    loadCount()
    const id = setInterval(loadCount, 60_000) // alle 60s refresh
    return () => {
      mountedRef.current = false
      clearInterval(id)
    }
  }, [])

  // 🔔 Als "gesehen" markieren NUR auf /konto/lackanfragen
  useEffect(() => {
    if (pathname?.startsWith('/konto/lackanfragen')) {
      try {
        localStorage.setItem('offers:lastSeen', String(Date.now()))
      } catch {}
      setKontoNew(0) // sofort ausblenden
    }
  }, [pathname])

  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = pathname?.startsWith(item.href)
            const isKonto = item.title === 'Mein Konto'
            const displayCounter = kontoNew > 9 ? '9+' : String(kontoNew)

            return (
              <li key={i} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navButton} ${isActive ? styles.navButtonActive : ''}`}
                >
                  <span className={styles.navButtonLabel}>{item.title}</span>

                  {isKonto && kontoNew > 0 && (
                    <span
                      className={styles.counter}
                      aria-label={`${kontoNew} neue Angebote`}
                      title={`${kontoNew} neue Angebote`}
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
    </div>
  )
}
