// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

function safeRedirect(input: string | null, req: NextRequest): string {
  const fallback = '/'
  if (!input) return fallback
  try {
    const url = new URL(input, req.nextUrl.origin)
    if (url.origin !== req.nextUrl.origin) return fallback
    return url.pathname + url.search + url.hash || fallback
  } catch {
    return input.startsWith('/') ? input : fallback
  }
}

export async function GET(req: NextRequest) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const sp = req.nextUrl.searchParams
  const redirectParam = safeRedirect(sp.get('redirect'), req)
  const flow  = sp.get('flow') // z. B. "reset"
  const type  = sp.get('type') // "signup" | "recovery" | "magiclink" | "email_change" | "invite"

  // Ziel bestimmen (Recovery führt zur New-Password-Seite)
  const nextUrl =
    flow === 'reset' || type === 'recovery'
      ? `/auth/new-password?redirect=${encodeURIComponent(redirectParam)}`
      : redirectParam

  // Falls ENV fehlt → Fehlerseite
  if (!url || !anon) {
    const errUrl = new URL('/auth/error', req.url)
    errUrl.searchParams.set('code', 'env_missing')
    errUrl.searchParams.set('redirect', redirectParam)
    return NextResponse.redirect(errUrl)
  }

  // Standard-Redirect (bei Erfolg)
  const res = NextResponse.redirect(new URL(nextUrl, req.url))
  res.headers.set('Cache-Control', 'no-store')

  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        res.cookies.set({ name, value, ...options })
      },
      remove: (name: string, options: CookieOptions) => {
        res.cookies.set({ name, value: '', ...options, path: '/', maxAge: 0, expires: new Date(0) })
      },
    },
  })

  // 1) PKCE / OAuth / MagicLink mit ?code=...
  const code = sp.get('code')
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code) // <<< hier: code übergeben!
      if (!error) return res
    } catch {
      /* später auf Fehlerseite umleiten */
    }
  }

  // 2) Fallback: OTP-Links (?token_hash=... & type=...)
  try {
    const token_hash = sp.get('token_hash') || sp.get('token')
    const otpType =
      (type as 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite') ||
      (flow === 'reset' ? 'recovery' : 'signup')
    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({ token_hash, type: otpType })
      if (!error) return res
    }
  } catch {
    /* ignore */
  }

  // 3) Fehlerfall → Fehlerseite mit Kontext
  const errUrl = new URL('/auth/error', req.url)
  errUrl.searchParams.set('code', 'callback_failed')
  if (type) errUrl.searchParams.set('type', type)
  errUrl.searchParams.set('redirect', redirectParam)
  return NextResponse.redirect(errUrl)
}
