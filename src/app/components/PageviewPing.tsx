'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function PageviewPing() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const fullPath = pathname + (search?.toString() ? `?${search.toString()}` : '')
    const payload = JSON.stringify({
      path: fullPath,
      referrer: document.referrer || null,
      // OPTIONAL: userId mitgeben, wenn eingeloggt:
      // userId: window.__USER_ID__  // siehe Layout unten
    })
    const blob = new Blob([payload], { type: 'application/json' })
    if (!navigator.sendBeacon('/api/track', blob)) {
      // Fallback
      fetch('/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } })
        .catch(() => {})
    }
  }, [pathname, search])

  return null
}
