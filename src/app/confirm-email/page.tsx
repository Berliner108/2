'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

function safeFinalRedirect(nextRaw: string | null): string {
  if (!nextRaw) return '/'

  try {
    const nextUrl = new URL(nextRaw, window.location.origin)

    if (nextUrl.origin !== window.location.origin) return '/'

    // Der bisherige Signup übergibt /auth/callback?redirect=...
    // Nach verifyOtp brauchen wir den Callback nicht mehr erneut aufzurufen.
    if (nextUrl.pathname === '/auth/callback') {
      const redirect = nextUrl.searchParams.get('redirect')
      if (!redirect) return '/'

      const finalUrl = new URL(redirect, window.location.origin)
      if (finalUrl.origin !== window.location.origin) return '/'

      return finalUrl.pathname + finalUrl.search + finalUrl.hash || '/'
    }

    return nextUrl.pathname + nextUrl.search + nextUrl.hash || '/'
  } catch {
    return '/'
  }
}

export default function ConfirmEmailPage() {
  const [tokenHash, setTokenHash] = useState('')
  const [nextRaw, setNextRaw] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token_hash')

      if (!token) {
        setError('Der Bestätigungslink ist unvollständig oder ungültig.')
        return
      }

      setTokenHash(token)
      setNextRaw(params.get('next'))
    } catch {
      setError('Der Bestätigungslink ist ungültig.')
    }
  }, [])

  const handleConfirm = async () => {
    if (!tokenHash || confirming) return

    setConfirming(true)
    setError('')

    try {
      const supabase = supabaseBrowser()

      const {
        data,
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      })

      if (verifyError || !data.session) {
        setError(
          verifyError?.message?.toLowerCase().includes('expired')
            ? 'Der Bestätigungslink ist abgelaufen. Bitte fordere eine neue Bestätigungsmail an.'
            : 'Die E-Mail-Adresse konnte nicht bestätigt werden. Bitte fordere eine neue Bestätigungsmail an.'
        )
        return
      }

      const resp = await fetch('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      })

      if (!resp.ok) {
        setError('Die E-Mail wurde bestätigt, die Anmeldung konnte aber nicht abgeschlossen werden.')
        return
      }

      window.location.href = safeFinalRedirect(nextRaw)
    } catch {
      setError('Die E-Mail-Adresse konnte nicht bestätigt werden. Bitte versuche es erneut.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'Oswald, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2rem',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 1rem', fontSize: '1.7rem', color: '#111827' }}>
          E-Mail-Adresse bestätigen
        </h1>

        {error ? (
          <p style={{ margin: 0, color: 'crimson' }}>{error}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 1.5rem', color: '#4b5563' }}>
              Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren.
            </p>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!tokenHash || confirming}
              style={{
                padding: '0.75rem 1.25rem',
                border: 0,
                borderRadius: '6px',
                background: '#111827',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: !tokenHash || confirming ? 'default' : 'pointer',
                opacity: !tokenHash || confirming ? 0.65 : 1,
              }}
            >
              {confirming ? 'Wird bestätigt…' : 'E-Mail-Adresse bestätigen'}
            </button>
          </>
        )}
      </div>
    </div>
  )
  }
