'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
} from 'react'

import styles from './navbar.module.css'
import { NAV_ITEMS } from './nav.config'
import { supabaseBrowser } from '@/lib/supabase-browser'

type ForAccountResponseOffers = {
  received?: Array<{
    id: string
    createdAt?: string
    created_at?: string
  }>
}

type LackOrder = {
  kind: 'vergeben' | 'angenommen'

  status?:
    | 'in_progress'
    | 'reported'
    | 'disputed'
    | 'confirmed'

  acceptedAt: string
  shippedAt?: string
  deliveredReportedAt?: string
  deliveredConfirmedAt?: string
  disputeOpenedAt?: string
  refundedAt?: string
  autoReleaseAt?: string
  lastEventAt?: string
}

type OrdersResp = {
  vergeben: LackOrder[]
  angenommen: LackOrder[]
}

type ShopSalesResp = {
  orders?: Array<{
    id: string
    created_at: string
    status: string
    paid_at?: string | null
    shipped_at?: string | null
    released_at?: string | null
    refunded_at?: string | null
    updated_at?: string | null
  }>
}

type ShopBuysResp = {
  orders?: Array<{
    id: string
    created_at: string
    status: string
    shipped_at?: string | null
    released_at?: string | null
    refunded_at?: string | null
    updated_at?: string | null
  }>
}

type JobOffersReceivedResp = {
  ok?: boolean
  offers?: Array<{
    id: string
    created_at?: string
  }>
}

type JobAccountOrdersResp = {
  orders?: Array<{
    jobId: string | number
    kind:
      | 'vergeben'
      | 'angenommen'

    jobPayStatus?:
      | 'paid'
      | 'released'
      | 'refunded'
      | 'disputed'

    offerPayStatus?:
      | 'paid'
      | 'released'
      | 'refunded'
      | 'disputed'

    acceptedAt?: string
    paidAt?: string
    releasedAt?: string
    refundedAt?: string
    deliveredReportedAt?: string
    deliveredConfirmedAt?: string
    disputeOpenedAt?: string
    lastEventAt?: string
  }>
}

const JOB_OFFERS_RECEIVED_API =
  '/api/offers/received'

const JOB_OFFERS_LASTSEEN_KEY =
  'jobOffers:lastSeen'

const JOB_ORDERS_API =
  '/api/konto/auftraege'

const JOB_ORDERS_LASTSEEN_KEY =
  'jobOrders:lastSeen'

const NAV_SCROLL_KEY =
  'navbar:scrollLeft'

const SHOP_BUYS_API =
  '/api/konto/shop-bestellungen'

export default function Navbar() {
  const pathname =
    usePathname()

  const [
    kontoNew,
    setKontoNew,
  ] =
    useState(0)

  const [
    messageUnread,
    setMessageUnread,
  ] =
    useState(0)

  const navbarRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const kontoLinkRef =
    useRef<HTMLAnchorElement | null>(
      null
    )

  const reloadCountsRef =
    useRef<
      null |
      (() => void)
    >(null)

  const [
    showEdgeBadge,
    setShowEdgeBadge,
  ] =
    useState(false)

  const [
    edgeTop,
    setEdgeTop,
  ] =
    useState<number>(8)

  const tsOf = (
    iso?: string | null
  ) =>
    iso
      ? +new Date(iso)
      : 0

  function lastEventTs(
    o: LackOrder
  ): number {
    const fallback =
      o.deliveredConfirmedAt ??
      o.disputeOpenedAt ??
      o.deliveredReportedAt ??
      o.shippedAt ??
      o.refundedAt ??
      o.acceptedAt

    return tsOf(
      o.lastEventAt ||
      fallback ||
      o.acceptedAt
    )
  }

  function needsAction(
    o: LackOrder
  ): boolean {
    if (
      o.kind ===
      'angenommen'
    ) {
      return (
        o.status ??
        'in_progress'
      ) ===
        'in_progress'
    }

    return (
      o.status ===
      'reported'
    )
  }

  function shopSellerEventTs(
    o: any
  ): number {
    return (
      tsOf(o.refunded_at) ||
      tsOf(o.released_at) ||
      tsOf(o.paid_at) ||
      tsOf(o.updated_at) ||
      tsOf(o.created_at)
    )
  }

  function shopBuyerEventTs(
    o: any
  ): number {
    return (
      tsOf(o.shipped_at) ||
      tsOf(o.refunded_at) ||
      tsOf(o.released_at) ||
      tsOf(o.updated_at) ||
      tsOf(o.created_at)
    )
  }

  // =====================================================
  // BESTEHENDE KONTO-ZÄHLER
  // =====================================================

  useEffect(() => {
    let alive = true

    async function loadAllCounts() {
      try {
        const now =
          Date.now()

        const SEVEN_DAYS =
          7 *
          24 *
          60 *
          60 *
          1000

        const sevenDaysAgo =
          now -
          SEVEN_DAYS

        // =================================================
        // 1) LACK-ANGEBOTE
        // =================================================

        let offersNew = 0

        try {
          const res =
            await fetch(
              '/api/lack/offers/for-account',
              {
                cache:
                  'no-store',
              }
            )

          if (res.ok) {
            const j:
              ForAccountResponseOffers =
              await res.json()

            const received =
              Array.isArray(
                j?.received
              )
                ? j.received
                : []

            const rawLastSeenOffers =
              Number(
                localStorage.getItem(
                  'offers:lastSeen'
                ) || '0'
              )

            const lastSeenOffers =
              Math.max(
                rawLastSeenOffers ||
                  0,
                sevenDaysAgo
              )

            offersNew =
              received.reduce(
                (
                  acc,
                  o
                ) => {
                  const ts =
                    +new Date(
                      (o as any)
                        .createdAt ||
                        (o as any)
                          .created_at
                    )

                  return (
                    ts >
                    lastSeenOffers
                  )
                    ? acc + 1
                    : acc
                },
                0
              )
          }
        } catch {
          // ignore
        }

        // =================================================
        // 2) LACK-ORDERS
        // =================================================

        let ordersBadge = 0

        try {
          const res =
            await fetch(
              '/api/orders/for-account',
              {
                cache:
                  'no-store',
                credentials:
                  'include',
              }
            )

          if (res.ok) {
            const j:
              OrdersResp =
              await res.json()

            const merged = [
              ...(j.vergeben ??
                []),
              ...(j.angenommen ??
                []),
            ]

            const rawLastSeenOrders =
              Number(
                localStorage.getItem(
                  'lackOrders:lastSeen'
                ) || '0'
              )

            const lastSeenOrders =
              Math.max(
                rawLastSeenOrders ||
                  0,
                sevenDaysAgo
              )

            const newEvents =
              merged.reduce(
                (
                  n,
                  o
                ) =>
                  n +
                  (
                    lastEventTs(
                      o
                    ) >
                    lastSeenOrders
                      ? 1
                      : 0
                  ),
                0
              )

            const pending =
              merged.reduce(
                (
                  n,
                  o
                ) =>
                  n +
                  (
                    needsAction(
                      o
                    ) &&
                    lastEventTs(
                      o
                    ) >
                    sevenDaysAgo
                      ? 1
                      : 0
                  ),
                0
              )

            ordersBadge =
              newEvents +
              pending
          }
        } catch {
          // ignore
        }

        // =================================================
        // 3) SHOP VERKÄUFE
        // =================================================

        let shopSalesNew =
          0

        try {
          const res =
            await fetch(
              '/api/konto/shop-verkaufen',
              {
                cache:
                  'no-store',
              }
            )

          if (res.ok) {
            const j:
              ShopSalesResp =
              await res.json()

            const orders =
              Array.isArray(
                j?.orders
              )
                ? j.orders
                : []

            const rawLastSeen =
              Number(
                localStorage.getItem(
                  'shopSales:lastSeen'
                ) || '0'
              )

            const lastSeen =
              Math.max(
                rawLastSeen ||
                  0,
                sevenDaysAgo
              )

            shopSalesNew =
              orders.reduce(
                (
                  acc,
                  o
                ) => {
                  const ts =
                    shopSellerEventTs(
                      o
                    )

                  const relevant =
                    [
                      'paid',
                      'released',
                      'refunded',
                      'complaint_open',
                    ].includes(
                      o.status
                    )

                  return (
                    relevant &&
                    ts >
                    lastSeen
                  )
                    ? acc + 1
                    : acc
                },
                0
              )
          }
        } catch {
          // ignore
        }

        // =================================================
        // 4) SHOP KÄUFE
        // =================================================

        let shopBuysNew =
          0

        try {
          const res =
            await fetch(
              SHOP_BUYS_API,
              {
                cache:
                  'no-store',
              }
            )

          if (res.ok) {
            const j:
              ShopBuysResp =
              await res.json()

            const orders =
              Array.isArray(
                j?.orders
              )
                ? j.orders
                : []

            const rawLastSeen =
              Number(
                localStorage.getItem(
                  'shopBuys:lastSeen'
                ) || '0'
              )

            const lastSeen =
              Math.max(
                rawLastSeen ||
                  0,
                sevenDaysAgo
              )

            shopBuysNew =
              orders.reduce(
                (
                  acc,
                  o
                ) => {
                  const ts =
                    shopBuyerEventTs(
                      o
                    )

                  const relevant =
                    [
                      'shipped',
                      'released',
                      'refunded',
                    ].includes(
                      o.status
                    )

                  return (
                    relevant &&
                    ts >
                    lastSeen
                  )
                    ? acc + 1
                    : acc
                },
                0
              )
          }
        } catch {
          // ignore
        }

        // =================================================
        // 5) JOB-ANGEBOTE
        // =================================================

        let jobOffersNew =
          0

        try {
          const res =
            await fetch(
              JOB_OFFERS_RECEIVED_API,
              {
                cache:
                  'no-store',
                credentials:
                  'include',
              }
            )

          if (res.ok) {
            const j:
              JobOffersReceivedResp =
              await res.json()

            const offers =
              Array.isArray(
                j?.offers
              )
                ? j.offers
                : []

            const rawLastSeen =
              Number(
                localStorage.getItem(
                  JOB_OFFERS_LASTSEEN_KEY
                ) || '0'
              )

            const lastSeen =
              Math.max(
                rawLastSeen ||
                  0,
                sevenDaysAgo
              )

            jobOffersNew =
              offers.reduce(
                (
                  acc,
                  o
                ) => {
                  const ts =
                    +new Date(
                      (o as any)
                        .created_at
                    )

                  return (
                    ts >
                    lastSeen
                  )
                    ? acc + 1
                    : acc
                },
                0
              )
          }
        } catch {
          // ignore
        }

        // =================================================
        // 6) JOB-AUFTRÄGE
        // =================================================

        let jobOrdersNew =
          0

        try {
          const res =
            await fetch(
              JOB_ORDERS_API,
              {
                cache:
                  'no-store',
                credentials:
                  'include',
              }
            )

          if (res.ok) {
            const j:
              JobAccountOrdersResp =
              await res.json()

            const orders =
              Array.isArray(
                j?.orders
              )
                ? j.orders
                : []

            const rawLastSeen =
              Number(
                localStorage.getItem(
                  JOB_ORDERS_LASTSEEN_KEY
                ) || '0'
              )

            const lastSeen =
              Math.max(
                rawLastSeen ||
                  0,
                sevenDaysAgo
              )

            jobOrdersNew =
              orders.reduce(
                (
                  acc,
                  o
                ) => {
                  const payStatus =
                    o.kind ===
                    'vergeben'
                      ? o.jobPayStatus
                      : o.offerPayStatus

                  const relevant =
                    payStatus ===
                      'paid' ||
                    payStatus ===
                      'released' ||
                    payStatus ===
                      'refunded' ||
                    payStatus ===
                      'disputed'

                  if (
                    !relevant
                  ) {
                    return acc
                  }

                  const ts =
                    tsOf(
                      o.lastEventAt
                    ) ||
                    tsOf(
                      o.refundedAt
                    ) ||
                    tsOf(
                      o.releasedAt
                    ) ||
                    tsOf(
                      o.deliveredConfirmedAt
                    ) ||
                    tsOf(
                      o.deliveredReportedAt
                    ) ||
                    tsOf(
                      o.disputeOpenedAt
                    ) ||
                    tsOf(
                      o.paidAt
                    ) ||
                    tsOf(
                      o.acceptedAt
                    )

                  return (
                    ts >
                    lastSeen
                  )
                    ? acc + 1
                    : acc
                },
                0
              )
          }
        } catch {
          // ignore
        }

        if (alive) {
          setKontoNew(
            offersNew +
              ordersBadge +
              shopSalesNew +
              shopBuysNew +
              jobOffersNew +
              jobOrdersNew
          )
        }
      } catch {
        // ignore
      }
    }

    reloadCountsRef.current =
      loadAllCounts

    loadAllCounts()

    const id =
      setInterval(
        loadAllCounts,
        60_000
      )

    const onBadge = (
      e: any
    ) => {
      try {
        const det =
          e?.detail || {}

        if (
          typeof det.total ===
          'number'
        ) {
          setKontoNew(
            det.total
          )
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener(
      'navbar:badge',
      onBadge as any
    )

    return () => {
      alive = false
      clearInterval(id)

      window.removeEventListener(
        'navbar:badge',
        onBadge as any
      )

      reloadCountsRef.current =
        null
    }
  }, [])

  // =====================================================
  // CHAT UNREAD
  // INITIAL + REALTIME, KEIN POLLING
  // =====================================================

  useEffect(() => {
    let alive = true

    const supabase =
      supabaseBrowser()

    let channel:
      ReturnType<
        typeof supabase.channel
      > |
      null =
        null

    async function loadMessageUnread() {
      try {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'chat_my_unread_count'
          )

        if (error) {
          console.error(
            '[navbar] chat unread:',
            error
          )

          return
        }

        if (alive) {
          const count =
            Number(
              data ?? 0
            )

          setMessageUnread(
            Number.isFinite(
              count
            ) &&
            count > 0
              ? count
              : 0
          )
        }
      } catch (
        error
      ) {
        console.error(
          '[navbar] chat unread:',
          error
        )
      }
    }

    async function startRealtime() {
      const {
        data: {
          session,
        },
      } =
        await supabase
          .auth
          .getSession()

      const user =
        session?.user

      if (
        !alive ||
        !user
      ) {
        if (alive) {
          setMessageUnread(
            0
          )
        }

        return
      }

      supabase.realtime.setAuth(
        session.access_token
      )

      await loadMessageUnread()

      channel =
        supabase
          .channel(
            `chat-user:${user.id}`,
            {
              config: {
                private:
                  true,
              },
            }
          )
          .on(
            'broadcast',
            {
              event:
                'message_inserted',
            },
            () => {
              void loadMessageUnread()
            }
          )
          .on(
            'broadcast',
            {
              event:
                'unread_changed',
            },
            () => {
              void loadMessageUnread()
            }
          )
          .subscribe()
    }

    const handleChatRefresh =
      () => {
        void loadMessageUnread()
      }

    window.addEventListener(
      'chat:refresh',
      handleChatRefresh
    )

    void startRealtime()

    return () => {
      alive = false

      window.removeEventListener(
        'chat:refresh',
        handleChatRefresh
      )

      if (channel) {
        void supabase.removeChannel(
          channel
        )
      }
    }
  }, [])

  // =====================================================
  // NAVBAR SCROLLPOSITION SPEICHERN
  // =====================================================

  useEffect(() => {
    const nav =
      navbarRef.current

    if (!nav) {
      return
    }

    const save = () => {
      try {
        sessionStorage.setItem(
          NAV_SCROLL_KEY,
          String(
            nav.scrollLeft
          )
        )
      } catch {
        // ignore
      }
    }

    nav.addEventListener(
      'scroll',
      save,
      {
        passive: true,
      }
    )

    return () =>
      nav.removeEventListener(
        'scroll',
        save
      )
  }, [])

  useLayoutEffect(() => {
    const nav =
      navbarRef.current

    if (!nav) {
      return
    }

    let x = 0

    try {
      x =
        Number(
          sessionStorage.getItem(
            NAV_SCROLL_KEY
          ) || '0'
        )
    } catch {
      // ignore
    }

    requestAnimationFrame(
      () => {
        requestAnimationFrame(
          () => {
            nav.scrollTo({
              left: x,
              behavior:
                'auto',
            })
          }
        )
      }
    )
  }, [pathname])

  // =====================================================
  // FIXIERTER BADGE BEI HORIZONTALER NAVBAR
  // =====================================================

  useEffect(() => {
    const updateOverlay =
      () => {
        const nav =
          navbarRef.current

        const konto =
          kontoLinkRef.current

        if (
          !nav ||
          !konto
        ) {
          setShowEdgeBadge(
            false
          )

          return
        }

        const navRect =
          nav.getBoundingClientRect()

        const kontoRect =
          konto.getBoundingClientRect()

        setEdgeTop(
          Math.max(
            2,
            Math.round(
              navRect.top
            ) + 4
          )
        )

        const isOverflowing =
          nav.scrollWidth >
          nav.clientWidth +
            1

        const offToRight =
          kontoRect.right >
          navRect.right +
            1

        setShowEdgeBadge(
          isOverflowing &&
          (
            kontoNew +
            messageUnread
          ) >
            0 &&
          offToRight
        )
      }

    updateOverlay()

    const rAFUpdate =
      () =>
        requestAnimationFrame(
          updateOverlay
        )

    const nav =
      navbarRef.current

    nav?.addEventListener(
      'scroll',
      rAFUpdate,
      {
        passive: true,
      }
    )

    window.addEventListener(
      'resize',
      rAFUpdate,
      {
        passive: true,
      }
    )

    window.addEventListener(
      'scroll',
      rAFUpdate,
      {
        passive: true,
      }
    )

    return () => {
      nav?.removeEventListener(
        'scroll',
        rAFUpdate
      )

      window.removeEventListener(
        'resize',
        rAFUpdate
      )

      window.removeEventListener(
        'scroll',
        rAFUpdate
      )
    }
  }, [
    kontoNew,
    messageUnread,
    pathname,
  ])

  // =====================================================
  // BESTEHENDE LAST-SEEN LOGIK
  // =====================================================

  useEffect(() => {
    if (!pathname) {
      return
    }

    try {
      if (
        pathname.startsWith(
          '/konto/lackangebote'
        )
      ) {
        localStorage.setItem(
          'lackOrders:lastSeen',
          String(
            Date.now()
          )
        )

        reloadCountsRef
          .current?.()
      }

      if (
        pathname.startsWith(
          '/konto/lackanfragen'
        )
      ) {
        localStorage.setItem(
          'offers:lastSeen',
          String(
            Date.now()
          )
        )

        reloadCountsRef
          .current?.()
      }

      if (
        pathname.startsWith(
          '/konto/verkaufen'
        )
      ) {
        const sp =
          new URLSearchParams(
            window.location.search
          )

        if (
          sp.get('tab') ===
          'verkaeufe'
        ) {
          localStorage.setItem(
            'shopSales:lastSeen',
            String(
              Date.now()
            )
          )

          reloadCountsRef
            .current?.()
        }
      }

      if (
        pathname.startsWith(
          '/konto/bestellungen'
        )
      ) {
        localStorage.setItem(
          'shopBuys:lastSeen',
          String(
            Date.now()
          )
        )

        reloadCountsRef
          .current?.()
      }

      if (
        pathname.startsWith(
          '/konto/angebote'
        )
      ) {
        localStorage.setItem(
          JOB_OFFERS_LASTSEEN_KEY,
          String(
            Date.now()
          )
        )

        reloadCountsRef
          .current?.()
      }

      if (
        pathname.startsWith(
          '/konto/auftraege'
        )
      ) {
        localStorage.setItem(
          JOB_ORDERS_LASTSEEN_KEY,
          String(
            Date.now()
          )
        )

        reloadCountsRef
          .current?.()
      }
    } catch {
      // ignore
    }
  }, [pathname])

  // =====================================================
  // COUNTER
  // =====================================================

  const totalNavbarCount =
    kontoNew +
    messageUnread

  const displayCounter =
    totalNavbarCount >
    9
      ? '9+'
      : String(
          totalNavbarCount
        )

  const displayMessageCounter =
    messageUnread >
    9
      ? '9+'
      : String(
          messageUnread
        )

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className={
        styles.wrapper
      }
    >
      <nav
        className={
          styles.navbar
        }
        ref={
          navbarRef
        }
      >
        <ul
          className={
            styles.navList
          }
        >
          {NAV_ITEMS.map(
            (
              item,
              i
            ) => {
              const isActive =
                pathname
                  ?.startsWith(
                    item.href
                  )

              const isKonto =
                item.title ===
                'Mein Konto'

              return (
                <li
                  key={
                    i
                  }
                  className={
                    styles.navItem
                  }
                >
                  <Link
                    href={
                      item.href
                    }
                    ref={
                      isKonto
                        ? kontoLinkRef
                        : undefined
                    }
                    className={`${styles.navButton} ${
                      isActive
                        ? styles.navButtonActive
                        : ''
                    }`}
                  >
                    <span
                      className={
                        styles.navButtonLabel
                      }
                    >
                      {
                        item.title
                      }
                    </span>

                    {isKonto &&
                      totalNavbarCount >
                        0 && (
                        <span
                          className={
                            styles.counter
                          }
                          aria-label={`${totalNavbarCount} neue Ereignisse / Aktionen`}
                          title={`${totalNavbarCount} neue Ereignisse / Aktionen`}
                        >
                          {
                            displayCounter
                          }
                        </span>
                      )}
                  </Link>

                  <div
                    className={
                      styles.dropdown
                    }
                  >
                    {item.links.map(
                      (
                        link,
                        j
                      ) => {
                        const isMessagesLink =
                          link.href ===
                          '/messages'

                        return (
                          <Link
                            key={
                              j
                            }
                            href={
                              link.href
                            }
                            className={
                              styles.dropdownLink
                            }
                          >
                            <span
                              className={
                                styles.dropdownLinkContent
                              }
                            >
                              <span>
                                {
                                  link.text
                                }
                              </span>

                              {isMessagesLink &&
                                messageUnread >
                                  0 && (
                                  <span
                                    className={
                                      styles.dropdownCounter
                                    }
                                    aria-label={`${messageUnread} ungelesene Nachrichten`}
                                    title={`${messageUnread} ungelesene Nachrichten`}
                                  >
                                    {
                                      displayMessageCounter
                                    }
                                  </span>
                                )}
                            </span>
                          </Link>
                        )
                      }
                    )}
                  </div>
                </li>
              )
            }
          )}
        </ul>
      </nav>

      {showEdgeBadge && (
        <div
          className={
            styles.edgeBadge
          }
          style={{
            top:
              edgeTop,
          }}
          aria-hidden
        >
          {
            displayCounter
          }
        </div>
      )}
    </div>
  )
}