// src/app/login/page.tsx
'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './login.module.css'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { logLogin } from '@/lib/log-login'

/** ✨ Sanitize + normalisieren: nur interne Pfade erlauben */
function safeRedirect(input: string | null | undefined): string {
  if (!input) return '/'
  try {
    const url = new URL(input, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (typeof window !== 'undefined' && url.origin !== window.location.origin) return '/'
    return url.pathname + url.search + url.hash
  } catch {
    return input.startsWith('/') ? input : '/'
  }
}

function LoginInner() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Erfolgsbanner für ?changed=1
  const [showChanged, setShowChanged] = useState(false)

  const router = useRouter()
  const params = useSearchParams()

  // ✨ redirect ODER next akzeptieren; sicher normalisieren
  const redirectTo = safeRedirect(params.get('redirect') ?? params.get('next') ?? '/')

  // ?changed=1 anzeigen & danach aus URL entfernen
  useEffect(() => {
    if (params.get('changed') === '1') {
      setShowChanged(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('changed')
      router.replace(
        url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''),
        { scroll: false }
      )
    }
  }, [params, router])

  useEffect(() => {
    if (!showChanged) return
    const t = setTimeout(() => setShowChanged(false), 4000)
    return () => clearTimeout(t)
  }, [showChanged])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    const raw = (e.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value.trim()
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement)?.value || ''
    const supabase = supabaseBrowser()

    try {
      // 1) Email bestimmen (direkt oder via Username -> Email)
      let emailToUse = raw

      if (raw.includes('@')) {
        emailToUse = raw.toLowerCase()
      } else {
        const name = raw.toLowerCase()
        const { data: rows, error: infoErr } = await supabase.rpc('email_for_username_info', { name })
        if (infoErr) {
          setError('Login derzeit nicht möglich. Bitte später erneut versuchen.')
          setLoading(false)
          return
        }
        const rec = Array.isArray(rows) ? rows[0] : null
        if (!rec?.email) {
          setError('E-Mail oder Passwort ist falsch.')
          setLoading(false)
          return
        }
        if (rec.confirmed === false) {
          setError('Bitte bestätige zuerst deine E-Mail.')
          setLoading(false)
          return
        }
        emailToUse = String(rec.email).toLowerCase()
      }

      // 2) Login (clientseitige Session)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailToUse, password })
      if (signInError) {
        const msgRaw = signInError.message?.toLowerCase() || ''
        const msg = msgRaw.includes('email not confirmed')
          ? 'Bitte bestätige zuerst deine E-Mail.'
          : 'E-Mail oder Passwort ist falsch.'
        setError(msg)
        setLoading(false)
        return
      }

      // 3) Client-Session (Tokens) holen
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || !session?.refresh_token) {
        setError('Login fehlgeschlagen. Bitte erneut versuchen.')
        setLoading(false)
        return
      }

      // 4) ✨ Server-Session (HttpOnly-Cookies für Middleware/SSR) setzen
      const resp = await fetch('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })
      if (!resp.ok) {
        setError('Session konnte nicht gesetzt werden. Bitte erneut versuchen.')
        setLoading(false)
        return
      }

      // 5) Login-Event protokollieren (optional)
      try { await logLogin() } catch {}

      // 6) **Harte** Navigation – so sieht die Middleware die Cookies sofort
      window.location.href = redirectTo || '/'
    } catch {
      setError('Unerwarteter Fehler. Bitte später erneut versuchen.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.leftContainer}>
        <Image
          src="/images/signup.webp"
          alt="Login Bild"
          fill
          style={{ objectFit: 'cover', objectPosition: 'top center' }}
          priority
        />
      </div>

      <div className={styles.rightContainer}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h1>Willkommen zurück!</h1>
          <h2>Login</h2>

          {showChanged && (
            <div className={styles.alertSuccess} role="status" aria-live="polite">
              <span>✅ Passwort geändert. Bitte mit dem neuen Passwort einloggen.</span>
              <button
                type="button"
                className={styles.alertClose}
                onClick={() => setShowChanged(false)}
                aria-label="Meldung schließen"
              >
                ×
              </button>
            </div>
          )}

          {error && <p style={{ color: 'red', marginBottom: '10px' }} aria-live="polite">{error}</p>}

          <div className={styles.inputContainer}>
            <label htmlFor="email">E-Mail oder Benutzername</label>
            <input
              type="text"
              id="email"
              name="email"
              placeholder="z. B. max@beispiel.de oder maxmustermann"
              required
              autoComplete="username"
              autoFocus
              disabled={loading}
              inputMode="text"
              autoCapitalize="none"
            />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="password">Passwort</label>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="Passwort eingeben"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Passwort anzeigen/verbergen"
                role="button"
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </span>
            </div>
          </div>

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? <>Einloggen<span className={styles.spinner}></span></> : 'Einloggen'}
          </button>

          {error === 'Bitte bestätige zuerst deine E-Mail.' && (
            <button
              type="button"
              onClick={async () => {
                setLoading(true)
                try {
                  const supabase = supabaseBrowser()
                  const val = (document.getElementById('email') as HTMLInputElement)?.value.trim()
                  if (!val) {
                    setError('Bitte gib deine E-Mail oder deinen Benutzernamen ein.')
                    return
                  }

                  let emailToUse = ''
                  if (val.includes('@')) {
                    emailToUse = val.toLowerCase()
                  } else {
                    const name = val.toLowerCase()
                    const { data, error: infoErr } = await supabase.rpc('email_for_username_info', { name })
                    if (infoErr) {
                      setError('Bitte gib deine E-Mail-Adresse ein, um die Bestätigung erneut zu senden.')
                      return
                    }
                    const rec = Array.isArray(data) ? data[0] : null
                    if (!rec?.email) {
                      setError('Unbekannter Benutzername. Bitte gib deine E-Mail ein.')
                      return
                    }
                    if (rec.confirmed) {
                      setError('Diese E-Mail ist bereits bestätigt.')
                      return
                    }
                    emailToUse = String(rec.email).toLowerCase()
                  }

                  await supabase.auth.resend({
                    type: 'signup',
                    email: emailToUse,
                    options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}` }
                  })
                  setError('Bestätigungsmail wurde erneut gesendet.')
                } finally { setLoading(false) }
              }}
              className={styles.linkButton}
            >
              Bestätigungsmail erneut senden
            </button>
          )}

          <div className={styles.forgotPassword}>
            <Link href={`/reset-password?redirect=${encodeURIComponent(redirectTo)}`}>Passwort vergessen?</Link>
          </div>

          <div className={styles.registerLink}>
            <span>Noch kein Konto?</span>{' '}
            <Link href={`/registrieren?redirect=${encodeURIComponent(redirectTo)}`}>Jetzt registrieren</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
