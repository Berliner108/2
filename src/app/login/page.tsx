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
  // Akzeptiere sowohl bereits encodete als auch rohe Pfade
  try {
    // Absolute URLs verhindern Open-Redirects
    const url = new URL(input, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    if (typeof window !== 'undefined' && url.origin !== window.location.origin) return '/'
    return url.pathname + url.search + url.hash
  } catch {
    // Fallback: nur interne Pfade zulassen
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
      // ✨ redirect/next NICHT anfassen – bleiben in der URL!
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

    const emailOrUsername = (e.currentTarget.elements.namedItem('email') as HTMLInputElement)?.value.trim()
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement)?.value || ''

    try {
      const supabase = supabaseBrowser()

      // 1) Email bestimmen (direkt oder via Username -> Email)
      let emailToUse = emailOrUsername
      if (!emailOrUsername.includes('@')) {
        const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('email_for_username', { name: emailOrUsername })
        if (rpcErr || !resolvedEmail) {
          setError(rpcErr ? 'Login derzeit nicht möglich. Bitte später erneut versuchen.' : 'E-Mail oder Passwort ist falsch.')
          setLoading(false)
          return
        }
        emailToUse = String(resolvedEmail)
      }

      // 2) Login
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: emailToUse, password })
      if (signInError) {
        const msgRaw = signInError.message?.toLowerCase() || ''
        const msg = msgRaw.includes('email not confirmed') ? 'Bitte bestätige zuerst deine E-Mail.' : 'E-Mail oder Passwort ist falsch.'
        setError(msg)
        setLoading(false)
        return
      }

      // 3) Session kurz abwarten (Cookie-Set auf Browser)
      for (let i = 0; i < 10; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) break
        await new Promise(r => setTimeout(r, 80))
      }

      // 4) Login-Event protokollieren (idempotent, aber Fehler hier blockieren nicht den Redirect)
      try { await logLogin() } catch {}

      // 5) ✨ Zurück zur Zielseite
      router.replace(redirectTo || '/')
      router.refresh()
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
              inputMode="email"
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
