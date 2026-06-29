// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const sp = req.nextUrl.searchParams
  const redirectParam = safeRedirect(sp.get('redirect'), req)
  const flow = sp.get('flow')
  const type = sp.get('type')

  const nextUrl =
    flow === 'reset' || type === 'recovery'
      ? `/auth/new-password?redirect=${encodeURIComponent(redirectParam)}`
      : redirectParam

  if (!url || !anon) {
    const errUrl = new URL('/auth/error', req.url)
    errUrl.searchParams.set('code', 'env_missing')
    errUrl.searchParams.set('redirect', redirectParam)
    return NextResponse.redirect(errUrl)
  }

  const res = NextResponse.redirect(new URL(nextUrl, req.url))
  res.headers.set('Cache-Control', 'no-store')

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options)
        })
      },
    },
  })

  // 1) PKCE / OAuth / MagicLink mit ?code=...
  const code = sp.get('code')

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        return res
      }
    } catch {
      /* später auf Fehlerseite umleiten */
    }
  }

  // 2) Fallback: OTP-Links mit ?token_hash=... & type=...
  try {
    const token_hash = sp.get('token_hash') || sp.get('token')

    const otpType =
      (type as 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite') ||
      (flow === 'reset' ? 'recovery' : 'signup')

    if (token_hash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: otpType,
      })

      if (!error) {
        return res
      }
    }
  } catch {
    /* ignore */
  }

  // 3) Falls Link schon verbraucht ist, aber Session trotzdem existiert:
  // nicht die Fehlerseite zeigen.
  try {
    const { data } = await supabase.auth.getUser()

    if (data.user) {
      return res
    }
  } catch {
    /* ignore */
  }

  // 4) Fehlerfall
  const errUrl = new URL('/auth/error', req.url)
  errUrl.searchParams.set('code', 'callback_fehlgeschlagen')

  if (type) {
    errUrl.searchParams.set('type', type)
  }

  errUrl.searchParams.set('redirect', redirectParam)

  return NextResponse.redirect(errUrl)
}