'use client'

import { useEffect } from 'react'

export function AcceptInvitationOnMount() {
  useEffect(() => {
    // Best-Effort – falls der User eine Einladung hatte, markieren wir sie als akzeptiert
    fetch('/api/invitations/accepted', { method: 'POST' }).catch(() => {
      // Fehler hier bewusst ignorieren
    })
  }, [])

  return null
}
