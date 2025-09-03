'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PencilIcon, ShoppingCartIcon, CogIcon, ClipboardDocumentListIcon, EnvelopeIcon, DocumentTextIcon, ShoppingBagIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import styles from './konto.module.css'
import Navbar from '../components/navbar/Navbar'

type ForAccountResponse = {
  received?: Array<{ id: string; createdAt?: string; created_at?: string }>
}

export default function Page() {
  const [offersNew, setOffersNew] = useState(0)

  // Zähler laden (NICHT als gelesen markieren – das passiert nur in /konto/lackanfragen über die Navbar)
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await fetch('/api/lack/offers/for-account', { cache: 'no-store' })
        if (!res.ok) return
        const j: ForAccountResponse = await res.json()
        const received = Array.isArray(j?.received) ? j.received : []
        const lastSeen = Number(localStorage.getItem('offers:lastSeen') || '0')
        const count = received.reduce((acc, o) => {
          const ts = +new Date((o as any).createdAt || (o as any).created_at)
          return ts > lastSeen ? acc + 1 : acc
        }, 0)
        if (alive) setOffersNew(count)
      } catch { /* noop */ }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const tiles = [
    {
      href: '/konto/angebote',
      text: 'Eingeholte Angebote',
      sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Beschichtungsaufträge',
      icon: <PencilIcon className="w-6 h-6 text-blue-500 fill-current stroke-current" />
    },
    {
      href: '/konto/auftraege',
      text: 'Aufträge',
      sub: 'Abgeschlossene und Aufträge die noch gefertigt werden findest du hier',
      icon: <ClipboardDocumentCheckIcon className="w-6 h-6 text-red-500" />
    },
    {
      href: '/konto/bestellungen',
      text: 'Bestellungen',
      sub: 'Hier hast du eine Übersicht zu deinen gekauften Artikeln',
      icon: <ShoppingCartIcon className="w-6 h-6 text-green-500 fill-current stroke-current" />
    },
    {
      href: '/konto/lackanfragen',
      text: 'Lackanfragen-Angebote',
      sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Lacke',
      icon: <DocumentTextIcon className="w-6 h-6 text-teal-500" />
    },
    {
      href: '/konto/lackangebote',
      text: 'Lackanfragen-Deals',
      sub: 'Abgeschlossene und vereinbarte Deals für angefragte Lacke findest du hier',
      icon: <ClipboardDocumentListIcon className="w-6 h-6 text-teal-500" />
    },
    {
      href: '/konto/verkaufen',
      text: 'Verkaufen',
      sub: 'Verwalte deine eingestellten Artikel und Verkäufe',
      icon: <ShoppingBagIcon className="w-6 h-6 text-yellow-500" />
    },
    {
      href: '/konto/einstellungen',
      text: 'Kontoeinstellungen',
      sub: 'Hier kannst du Änderungen zu deinem Profil & Sicherheit vornehmen',
      icon: <CogIcon className="w-6 h-6 text-purple-500 fill-current stroke-current" />
    },
    {
      href: '/konto/nachrichten',
      text: 'Nachrichten',
      sub: 'Übersicht über deine Nachrichten von anderen Usern',
      icon: <EnvelopeIcon className="w-6 h-6 text-blue-600 fill-current stroke-current" />
    }
  ]

  const displayCounter = offersNew > 9 ? '9+' : String(offersNew)

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        <h2 className={styles.headline}>Mein Konto</h2>

        <div className={styles.kontoContainer}>
          <div className={styles.kontoList}>
            {tiles.map((item, index) => (
              <Link key={index} href={item.href} className={styles.kontoItem}>
                <div className={styles.kontoBox}>
                  {/* Kreis-Badge nur auf der Lackanfragen-Kachel */}
                  {item.href === '/konto/lackanfragen' && offersNew > 0 && (
                    <span className={styles.kontoCardBadge} aria-label={`${offersNew} neue Angebote`} title={`${offersNew} neue Angebote`}>
                      {displayCounter}
                    </span>
                  )}

                  <div className={styles.kontoIcon}>{item.icon}</div>
                  <div>
                    <div className={styles.kontoTitle}>{item.text}</div>
                    <div className={styles.kontoSub}>{item.sub}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
