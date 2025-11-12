'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  PencilIcon, ShoppingCartIcon, CogIcon, ClipboardDocumentListIcon,
  EnvelopeIcon, DocumentTextIcon, ShoppingBagIcon, ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import styles from './konto.module.css'
import Navbar from '../components/navbar/Navbar'

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

export default function Page() {
  const [offersNew, setOffersNew] = useState(0)  // Badge für Lackanfragen-Angebote (wie bei dir)
  const [ordersBadge, setOrdersBadge] = useState(0) // Badge für Lackanfragen-Deals

  const tsOf = (iso?: string) => (iso ? +new Date(iso) : 0)
  const lastEventTs = (o: LackOrder) => tsOf(
    o.lastEventAt ||
    o.deliveredConfirmedAt ||
    o.disputeOpenedAt ||
    o.deliveredReportedAt ||
    o.shippedAt ||
    o.refundedAt ||
    o.acceptedAt
  )
  const needsAction = (o: LackOrder) =>
    (o.kind === 'angenommen' && (o.status ?? 'in_progress') === 'in_progress') ||
    (o.kind === 'vergeben'   && o.status === 'reported')

  // Angebote (wie gehabt)
  useEffect(() => {
    let alive = true
    async function loadOffers() {
      try {
        const res = await fetch('/api/lack/offers/for-account', { cache: 'no-store' })
        if (!res.ok) return
        const j: ForAccountResponseOffers = await res.json()
        const received = Array.isArray(j?.received) ? j.received : []
        const lastSeen = Number(localStorage.getItem('offers:lastSeen') || '0')
        const count = received.reduce((acc, o) => {
          const ts = +new Date((o as any).createdAt || (o as any).created_at)
          return ts > lastSeen ? acc + 1 : acc
        }, 0)
        if (alive) setOffersNew(count)
      } catch {}
    }
    loadOffers()
    const id = setInterval(loadOffers, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Orders (Deals): Neu + Handlungsbedarf
  useEffect(() => {
    let alive = true
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders/for-account', { cache: 'no-store', credentials: 'include' })
        if (!res.ok) return
        const j: OrdersResp = await res.json()
        const merged = [...(j.vergeben ?? []), ...(j.angenommen ?? [])]
        const lastSeen = Number(localStorage.getItem('lackOrders:lastSeen') || '0')

        const newEvents = merged.reduce((n, o) => n + (lastEventTs(o) > lastSeen ? 1 : 0), 0)
        const pending   = merged.reduce((n, o) => n + (needsAction(o) ? 1 : 0), 0)

        if (alive) setOrdersBadge(newEvents + pending)

        // Optional: auch Navbar live „pingen“
        try {
          const total = (offersNew || 0) + newEvents + pending
          window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { total } }))
        } catch {}
      } catch {}
    }
    loadOrders()
    const id = setInterval(loadOrders, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [offersNew])

  const tiles = [
    { href: '/konto/angebote',     text: 'Eingeholte Angebote',             sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Beschichtungsaufträge', icon: <PencilIcon className="w-6 h-6 text-blue-500 fill-current stroke-current" /> },
    { href: '/konto/auftraege',    text: 'Aufträge',                         sub: 'Abgeschlossene und Aufträge die noch gefertigt werden findest du hier',               icon: <ClipboardDocumentCheckIcon className="w-6 h-6 text-red-500" /> },
    { href: '/konto/bestellungen', text: 'Bestellungen',                     sub: 'Hier hast du eine Übersicht zu deinen gekauften Artikeln',                            icon: <ShoppingCartIcon className="w-6 h-6 text-green-500 fill-current stroke-current" /> },
    { href: '/konto/lackanfragen', text: 'Lackanfragen-Angebote',            sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Lacke',                icon: <DocumentTextIcon className="w-6 h-6 text-teal-500" /> },
    { href: '/konto/lackangebote', text: 'Lackanfragen-Deals',               sub: 'Abgeschlossene und vereinbarte Deals für angefragte Lacke findest du hier',          icon: <ClipboardDocumentListIcon className="w-6 h-6 text-teal-500" /> },
    { href: '/konto/verkaufen',    text: 'Verkaufen',                        sub: 'Verwalte deine eingestellten Artikel und Verkäufe hier',                                   icon: <ShoppingBagIcon className="w-6 h-6 text-yellow-500" /> },
    { href: '/konto/einstellungen',text: 'Einstellungen',                     sub: 'Hier kannst du Änderungen zu deinem Profil & Sicherheit vornehmen',                   icon: <CogIcon className="w-6 h-6 text-purple-500 fill-current stroke-current" /> },
    { href: '/konto/nachrichten',  text: 'Nachrichten',                      sub: 'Übersicht über deine Nachrichten von anderen Usern',                                  icon: <EnvelopeIcon className="w-6 h-6 text-blue-600 fill-current stroke-current" /> }
  ]

  const displayOffers = offersNew > 9 ? '9+' : String(offersNew)
  const displayOrders = ordersBadge > 9 ? '9+' : String(ordersBadge)

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
                  {/* Kreis-Badge: Angebote */}
                  {item.href === '/konto/lackanfragen' && offersNew > 0 && (
                    <span className={styles.kontoCardBadge} aria-label={`${offersNew} neue Angebote`} title={`${offersNew} neue Angebote`}>
                      {displayOffers}
                    </span>
                  )}

                  {/* Kreis-Badge: Deals (Orders) */}
                  {item.href === '/konto/lackangebote' && ordersBadge > 0 && (
                    <span className={styles.kontoCardBadge} aria-label={`${ordersBadge} neue Ereignisse / Aktionen`} title={`${ordersBadge} neue Ereignisse / Aktionen`}>
                      {displayOrders}
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
