'use client'

import { useEffect, useState } from 'react'
import styles from './PremiumRequiredModal.module.css'

type PremiumRequiredModalProps = {
  open: boolean
  onClose: () => void
  actionText?: string
}

export default function PremiumRequiredModal({
  open,
  onClose,
  actionText,
}: PremiumRequiredModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, loading, onClose])

  useEffect(() => {
    if (open) {
      setError(null)
    }
  }, [open])

  if (!open) return null

  const handleActivate = async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/premium-checkout', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data?.url) {
        setError(
          data?.error ||
            'Premium Mitgliedschaft konnte nicht gestartet werden.',
        )
        return
      }

      window.location.href = data.url
    } catch {
      setError('Premium Mitgliedschaft konnte nicht gestartet werden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-required-title"
      aria-describedby="premium-required-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose()
        }
      }}
    >
      <div className={styles.modal}>
        <div className={styles.badge}>Premium</div>

        <h2 id="premium-required-title" className={styles.title}>
          Premium Mitgliedschaft erforderlich
        </h2>

        <p id="premium-required-description" className={styles.text}>
          {actionText
            ? `Um ${actionText}, benötigst du eine aktive Premium Mitgliedschaft.`
            : 'Diese Funktion gehört zu den Premium-Anbieterfunktionen.'}
        </p>

        <div className={styles.benefits}>
          <strong>Mit Premium kannst du:</strong>
          <ul>
            <li>auf Aufträge und Lackanfragen bieten</li>
            <li>Artikel kostenlos einstellen</li>
            <li>neue geschäftliche Kontakte starten</li>
          </ul>
        </div>

        <div className={styles.priceRow}>
          <div>
            <span className={styles.price}>249 €</span>
            <span className={styles.period}> / Jahr</span>
          </div>
          <span className={styles.trial}>14 Tage Premium kostenlos testen</span>
        </div>

        <p className={styles.freeHint}>
          Aufträge und Lackanfragen einstellen, Artikel kaufen und die Plattform durchsuchen bleibt kostenlos.
        </p>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Abbrechen
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleActivate}
            disabled={loading}
          >
            {loading ? 'Wird geöffnet …' : 'Premium aktivieren'}
          </button>
        </div>
      </div>
    </div>
  )
}
