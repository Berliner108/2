'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type OtpType = 'email' | 'invite' | 'recovery'

function safeInternal(input: string | null): string {
  if (!input) return '/'

  try {
    const url = new URL(input, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    return url.pathname + url.search + url.hash || '/'
  } catch {
    return input.startsWith('/') ? input : '/'
  }
}

function finalRedirect(nextRaw: string | null, otpType: OtpType): string {
  if (otpType === 'recovery') {
    try {
      const nextUrl = new URL(nextRaw || '/', window.location.origin)

      if (nextUrl.origin !== window.location.origin) {
        return '/auth/new-password?redirect=%2F'
      }

      // resetPasswordForEmail übergibt:
      // /auth/callback?flow=reset&redirect=...
      if (nextUrl.pathname === '/auth/callback') {
        const redirect = safeInternal(nextUrl.searchParams.get('redirect'))
        return `/auth/new-password?redirect=${encodeURIComponent(redirect)}`
      }

      return `/auth/new-password?redirect=${encodeURIComponent(safeInternal(nextRaw))}`
    } catch {
      return '/auth/new-password?redirect=%2F'
    }
  }

  if (!nextRaw) return '/'

  try {
    const nextUrl = new URL(nextRaw, window.location.origin)
    if (nextUrl.origin !== window.location.origin) return '/'

    // Sign-up/Invite können weiterhin einen bisherigen Callback als RedirectTo enthalten.
    // Nach verifyOtp muss dieser Callback nicht noch einmal den Token verifizieren.
    if (nextUrl.pathname === '/auth/callback') {
      return safeInternal(nextUrl.searchParams.get('redirect'))
    }

    return nextUrl.pathname + nextUrl.search + nextUrl.hash || '/'
  } catch {
    return '/'
  }
}

export default function ConfirmEmailPage() {
  const [tokenHash, setTokenHash] = useState('')
  const [nextRaw, setNextRaw] = useState<string | null>(null)
  const [otpType, setOtpType] = useState<OtpType>('email')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token_hash')
      const type = params.get('type')

      if (!token) {
        setError('Der Link ist unvollständig oder ungültig.')
        return
      }

      if (type && type !== 'email' && type !== 'invite' && type !== 'recovery') {
        setError('Der Link ist ungültig.')
        return
      }

      setTokenHash(token)
      setOtpType(
        type === 'invite'
          ? 'invite'
          : type === 'recovery'
            ? 'recovery'
            : 'email'
      )
      setNextRaw(params.get('next'))
    } catch {
      setError('Der Link ist ungültig.')
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
        type: otpType,
      })

      if (verifyError || !data.session) {
        const expired = verifyError?.message?.toLowerCase().includes('expired')

        if (otpType === 'invite') {
          setError(
            expired
              ? 'Der Einladungslink ist abgelaufen. Bitte fordere eine neue Einladung an.'
              : 'Die Einladung konnte nicht angenommen werden. Bitte fordere eine neue Einladung an.'
          )
        } else if (otpType === 'recovery') {
          setError(
            expired
              ? 'Der Link zum Zurücksetzen des Passworts ist abgelaufen. Bitte fordere einen neuen Link an.'
              : 'Der Link zum Zurücksetzen des Passworts ist ungültig. Bitte fordere einen neuen Link an.'
          )
        } else {
          setError(
            expired
              ? 'Der Bestätigungslink ist abgelaufen. Bitte fordere eine neue Bestätigungsmail an.'
              : 'Die E-Mail-Adresse konnte nicht bestätigt werden. Bitte fordere eine neue Bestätigungsmail an.'
          )
        }

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
        setError(
          otpType === 'recovery'
            ? 'Der Link wurde bestätigt, die Passwortänderung konnte aber nicht gestartet werden.'
            : 'Die Bestätigung war erfolgreich, die Anmeldung konnte aber nicht abgeschlossen werden.'
        )
        return
      }

      window.location.href = finalRedirect(nextRaw, otpType)
    } catch {
      setError(
        otpType === 'invite'
          ? 'Die Einladung konnte nicht angenommen werden. Bitte versuche es erneut.'
          : otpType === 'recovery'
            ? 'Der Passwort-Reset konnte nicht gestartet werden. Bitte versuche es erneut.'
            : 'Die E-Mail-Adresse konnte nicht bestätigt werden. Bitte versuche es erneut.'
      )
    } finally {
      setConfirming(false)
    }
  }

  const title =
    otpType === 'invite'
      ? 'Einladung annehmen'
      : otpType === 'recovery'
        ? 'Passwort zurücksetzen'
        : 'E-Mail-Adresse bestätigen'

  const description =
    otpType === 'invite'
      ? 'Klicke auf den Button, um deine Einladung anzunehmen und deinen Account zu aktivieren.'
      : otpType === 'recovery'
        ? 'Klicke auf den Button, um mit dem Zurücksetzen deines Passworts fortzufahren.'
        : 'Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren.'

  const buttonText =
    confirming
      ? otpType === 'invite'
        ? 'Einladung wird angenommen…'
        : otpType === 'recovery'
          ? 'Wird geprüft…'
          : 'Wird bestätigt…'
      : otpType === 'invite'
        ? 'Einladung annehmen'
        : otpType === 'recovery'
          ? 'Passwort zurücksetzen'
          : 'E-Mail-Adresse bestätigen'

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
          {title}
        </h1>

        {error ? (
          <p style={{ margin: 0, color: 'crimson' }}>{error}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 1.5rem', color: '#4b5563' }}>
              {description}
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
              {buttonText}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
