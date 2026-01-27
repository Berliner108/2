'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  PencilIcon,
  ShoppingCartIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  ClipboardDocumentCheckIcon,
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

// ✅ Shop-Verkäufe (Verkäufer) – aus /api/konto/shop-verkaufen
type ShopSalesResp = {
  orders?: Array<{
    id: string
    created_at: string
    status: string
    paid_at?: string | null
    updated_at?: string
  }>
}

// ✅ Shop-Bestellungen (Käufer) – aus /api/konto/shop-bestellungen
type ShopBuysResp = {
  orders?: Array<{
    id: string
    created_at: string
    status: string
    shipped_at?: string | null
    updated_at?: string
  }>
}

// ✅ Job-Angebote (received) – aus /api/offers/received
type JobOffersReceivedResp = {
  ok?: boolean
  offers?: Array<{ id: string; created_at?: string; createdAt?: string }>
}

const JOB_OFFERS_RECEIVED_API = '/api/offers/received'
const JOB_OFFERS_LASTSEEN_KEY = 'jobOffers:lastSeen'

export default function Page() {
  const [offersNew, setOffersNew] = useState(0) // Badge für Lackanfragen-Angebote
  const [ordersBadge, setOrdersBadge] = useState(0) // Badge für Lackanfragen-Deals

  // ✅ NEU: Shop-Badges für Konto-Kacheln
  const [shopSalesBadge, setShopSalesBadge] = useState(0) // Verkäufer: neue "paid"/Events
  const [shopBuysBadge, setShopBuysBadge] = useState(0) // Käufer: Versand gemeldet (shipped)

  // ✅ NEU: Job-Angebote Badge für /konto/angebote
  const [jobOffersBadge, setJobOffersBadge] = useState(0)

  const tsOf = (iso?: string) => (iso ? +new Date(iso) : 0)
  const lastEventTs = (o: LackOrder) =>
    tsOf(
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
    (o.kind === 'vergeben' && o.status === 'reported')

  // ✅ Shop Event-Zeitpunkte (wie Lacke: "EventTs" + lastSeen + 7-Tage Cap)
  const shopSellerEventTs = (o: any) => {
    return tsOf(o.updated_at || o.paid_at || o.created_at)
  }

  const shopBuyerEventTs = (o: any) => {
    return tsOf(o.shipped_at || o.updated_at || o.created_at)
  }

  // Angebote (wie gehabt)
  useEffect(() => {
    let alive = true
    async function loadOffers() {
      try {
        const res = await fetch('/api/lack/offers/for-account', { cache: 'no-store' })
        if (!res.ok) return
        const j: ForAccountResponseOffers = await res.json()
        const received = Array.isArray(j?.received) ? j.received : []

        const now = Date.now()
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        const sevenDaysAgo = now - SEVEN_DAYS

        const rawLastSeen = Number(localStorage.getItem('offers:lastSeen') || '0')
        const lastSeen = Math.max(rawLastSeen || 0, sevenDaysAgo)

        const count = received.reduce((acc, o) => {
          const ts = +new Date((o as any).createdAt || (o as any).created_at)
          return ts > lastSeen ? acc + 1 : acc
        }, 0)

        if (alive) setOffersNew(count)
      } catch {}
    }
    loadOffers()
    const id = setInterval(loadOffers, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // ✅ NEU: Job-Angebote (received) – Badge für /konto/angebote
  useEffect(() => {
    let alive = true

    async function loadJobOffers() {
      try {
        const res = await fetch(JOB_OFFERS_RECEIVED_API, {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!res.ok) {
          if (alive) setJobOffersBadge(0)
          return
        }

        const j: JobOffersReceivedResp = await res.json()
        const offers = Array.isArray(j?.offers) ? j.offers : []

        const now = Date.now()
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        const sevenDaysAgo = now - SEVEN_DAYS

        const rawLastSeen = Number(localStorage.getItem(JOB_OFFERS_LASTSEEN_KEY) || '0')
        const lastSeen = Math.max(rawLastSeen || 0, sevenDaysAgo)

        const count = offers.reduce((acc, o) => {
          const ts = +new Date((o as any).created_at || (o as any).createdAt)
          return ts > lastSeen ? acc + 1 : acc
        }, 0)

        if (alive) setJobOffersBadge(count)
      } catch {
        if (alive) setJobOffersBadge(0)
      }
    }

    loadJobOffers()
    const id = setInterval(loadJobOffers, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // Orders (Deals): Neu + Handlungsbedarf
  useEffect(() => {
    let alive = true
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders/for-account', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!res.ok) return
        const j: OrdersResp = await res.json()
        const merged = [...(j.vergeben ?? []), ...(j.angenommen ?? [])]

        const now = Date.now()
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        const sevenDaysAgo = now - SEVEN_DAYS

        const rawLastSeen = Number(localStorage.getItem('lackOrders:lastSeen') || '0')
        const lastSeen = Math.max(rawLastSeen || 0, sevenDaysAgo)

        const newEvents = merged.reduce((n, o) => n + (lastEventTs(o) > lastSeen ? 1 : 0), 0)

        // pending nur, wenn das letzte Event jünger als 7 Tage ist (wie Navbar)
        const pending = merged.reduce(
          (n, o) => n + (needsAction(o) && lastEventTs(o) > sevenDaysAgo ? 1 : 0),
          0
        )

        if (alive) setOrdersBadge(newEvents + pending)

        // Optional: auch Navbar live „pingen“
        try {
          const total =
            (offersNew || 0) +
            newEvents +
            pending +
            (shopSalesBadge || 0) +
            (shopBuysBadge || 0) +
            (jobOffersBadge || 0)

          window.dispatchEvent(new CustomEvent('navbar:badge', { detail: { total } }))
        } catch {}
      } catch {}
    }
    loadOrders()
    const id = setInterval(loadOrders, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [offersNew, shopSalesBadge, shopBuysBadge, jobOffersBadge])

  // ✅ NEU: Shop-Verkäufe Badge (Verkäufer) – zählt paid + complaint_open + released + refunded (wie "Events")
  useEffect(() => {
    let alive = true
    async function loadShopSales() {
      try {
        const res = await fetch('/api/konto/shop-verkaufen', { cache: 'no-store' })
        if (!res.ok) {
          if (alive) setShopSalesBadge(0)
          return
        }

        const j: ShopSalesResp = await res.json()
        const orders = Array.isArray(j?.orders) ? j.orders : []

        const now = Date.now()
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        const sevenDaysAgo = now - SEVEN_DAYS

        const rawLastSeen = Number(localStorage.getItem('shopSales:lastSeen') || '0')
        const lastSeen = Math.max(rawLastSeen || 0, sevenDaysAgo)

        const count = orders.reduce((acc, o) => {
          const ts = shopSellerEventTs(o)
          const relevant = ['paid', 'complaint_open', 'released', 'refunded', 'shipped'].includes(o.status)
          return relevant && ts > lastSeen ? acc + 1 : acc
        }, 0)

        if (alive) setShopSalesBadge(count)
      } catch {
        // ignore
      }
    }

    loadShopSales()
    const id = setInterval(loadShopSales, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // ✅ NEU: Shop-Bestellungen Badge (Käufer) – zählt shipped (Versand gemeldet)
  useEffect(() => {
    let alive = true
    async function loadShopBuys() {
      try {
        const res = await fetch('/api/konto/shop-bestellungen', { cache: 'no-store' })
        if (!res.ok) {
          if (alive) setShopBuysBadge(0)
          return
        }

        const j: ShopBuysResp = await res.json()
        const orders = Array.isArray(j?.orders) ? j.orders : []

        const now = Date.now()
        const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
        const sevenDaysAgo = now - SEVEN_DAYS

        const rawLastSeen = Number(localStorage.getItem('shopBuys:lastSeen') || '0')
        const lastSeen = Math.max(rawLastSeen || 0, sevenDaysAgo)

        const count = orders.reduce((acc, o) => {
          const ts = shopBuyerEventTs(o)
          return o.status === 'shipped' && ts > lastSeen ? acc + 1 : acc
        }, 0)

        if (alive) setShopBuysBadge(count)
      } catch {
        // ignore
      }
    }

    loadShopBuys()
    const id = setInterval(loadShopBuys, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const tiles = [
    {
      href: '/konto/angebote',
      text: 'Eingeholte Angebote',
      sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Beschichtungsaufträge',
      icon: <PencilIcon className="w-6 h-6 text-blue-500 fill-current stroke-current" />,
    },
    {
      href: '/konto/auftraege',
      text: 'Aufträge',
      sub: 'Abgeschlossene und Aufträge die noch gefertigt werden findest du hier',
      icon: <ClipboardDocumentCheckIcon className="w-6 h-6 text-red-500" />,
    },
    {
      href: '/konto/bestellungen',
      text: 'Bestellungen',
      sub: 'Hier hast du eine Übersicht zu deinen gekauften Artikeln',
      icon: <ShoppingCartIcon className="w-6 h-6 text-green-500 fill-current stroke-current" />,
    },
    {
      href: '/konto/lackanfragen',
      text: 'Lackanfragen-Angebote',
      sub: 'Übersicht über deine eingeholten und abgegebenen Angebote für Lacke',
      icon: <DocumentTextIcon className="w-6 h-6 text-teal-500" />,
    },
    {
      href: '/konto/lackangebote',
      text: 'Lackanfragen-Deals',
      sub: 'Abgeschlossene und vereinbarte Deals für angefragte Lacke findest du hier',
      icon: <ClipboardDocumentListIcon className="w-6 h-6 text-teal-500" />,
    },
    {
      href: '/konto/verkaufen',
      text: 'Verkaufen',
      sub: 'Verwalte deine eingestellten Artikel und Artikelverkäufe hier',
      icon: <ShoppingBagIcon className="w-6 h-6 text-yellow-500" />,
    },
    {
      href: '/konto/einstellungen',
      text: 'Einstellungen',
      sub: 'Hier kannst du Änderungen zu deinem Profil & Sicherheit vornehmen',
      icon: <CogIcon className="w-6 h-6 text-purple-500 fill-current stroke-current" />,
    },
    {
      href: '/messages?empfaenger=${messageTarget}',
      text: 'Nachrichten',
      sub: 'Übersicht über deine Nachrichten und Chatverläufe mit anderen Usern',
      icon: <EnvelopeIcon className="w-6 h-6 text-blue-600 fill-current stroke-current" />,
    },
  ]

  const displayOffers = offersNew > 9 ? '9+' : String(offersNew)
  const displayOrders = ordersBadge > 9 ? '9+' : String(ordersBadge)
  const displayShopSales = shopSalesBadge > 9 ? '9+' : String(shopSalesBadge)
  const displayShopBuys = shopBuysBadge > 9 ? '9+' : String(shopBuysBadge)
  const displayJobOffers = jobOffersBadge > 9 ? '9+' : String(jobOffersBadge)

  return (
    <>
      <Navbar />
      <div className={styles.wrapper}>
        <h2 className={styles.headline}>Übersicht - Mein Konto</h2>

        <div className={styles.kontoContainer}>
          <div className={styles.kontoList}>
            {tiles.map((item, index) => (
              <Link key={index} href={item.href} className={styles.kontoItem}>
                <div className={styles.kontoBox}>
                  {/* ✅ Kreis-Badge: Job-Angebote */}
                  {item.href === '/konto/angebote' && jobOffersBadge > 0 && (
                    <span
                      className={styles.kontoCardBadge}
                      aria-label={`${jobOffersBadge} neue Job-Angebote`}
                      title={`${jobOffersBadge} neue Job-Angebote`}
                    >
                      {displayJobOffers}
                    </span>
                  )}

                  {/* Kreis-Badge: Angebote */}
                  {item.href === '/konto/lackanfragen' && offersNew > 0 && (
                    <span
                      className={styles.kontoCardBadge}
                      aria-label={`${offersNew} neue Angebote`}
                      title={`${offersNew} neue Angebote`}
                    >
                      {displayOffers}
                    </span>
                  )}

                  {/* Kreis-Badge: Deals (Orders) */}
                  {item.href === '/konto/lackangebote' && ordersBadge > 0 && (
                    <span
                      className={styles.kontoCardBadge}
                      aria-label={`${ordersBadge} neue Ereignisse / Aktionen`}
                      title={`${ordersBadge} neue Ereignisse / Aktionen`}
                    >
                      {displayOrders}
                    </span>
                  )}

                  {/* ✅ Kreis-Badge: Shop-Verkäufe (Verkäufer) */}
                  {item.href === '/konto/verkaufen' && shopSalesBadge > 0 && (
                    <span
                      className={styles.kontoCardBadge}
                      aria-label={`${shopSalesBadge} neue Verkäufe / Events`}
                      title={`${shopSalesBadge} neue Verkäufe / Events`}
                    >
                      {displayShopSales}
                    </span>
                  )}

                  {/* ✅ Kreis-Badge: Shop-Bestellungen (Käufer) */}
                  {item.href === '/konto/bestellungen' && shopBuysBadge > 0 && (
                    <span
                      className={styles.kontoCardBadge}
                      aria-label={`${shopBuysBadge} Versand-Updates`}
                      title={`${shopBuysBadge} Versand-Updates`}
                    >
                      {displayShopBuys}
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
