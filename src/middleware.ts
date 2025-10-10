import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/* --- öffentlich: nur Login + Auth --- */
function isAuthPath(path: string) { return path === '/auth' || path.startsWith('/auth/') }
function isPublic(path: string) {
  return path === '/login' || isAuthPath(path)
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  /* --- Tracking (auch vor Redirect) | /admin NICHT tracken --- */
  const p = pathname
  const skipTrack = p.startsWith('/admin') || p.startsWith('/_next') || p.startsWith('/api')
  if (!skipTrack) {
    try {
      await fetch(new URL('/api/track', req.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Secret mitsenden – muss zu route.ts passen
          ...(process.env.TRACK_SECRET ? { 'x-track-secret': process.env.TRACK_SECRET } : {})
        },
        body: JSON.stringify({
          path: p + req.nextUrl.search,
          referrer: req.headers.get('referer') || null,
        }),
        keepalive: true,
      })
    } catch { /* Tracking darf nie blockieren */ }
  }

  // Öffentliche Pfade freigeben
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // ENV prüfen
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const login = req.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(login)
  }

  // Response vorbereiten (für Refresh-Cookies)
  const res = NextResponse.next()

  // Cookie-Adapter wie in deiner funktionierenden Variante
  const cookieAdapter = {
    get:    (name: string) => req.cookies.get(name)?.value,
    getAll: () => req.cookies.getAll(),
    set(name: string, value: string, options: CookieOptions) {
      res.cookies.set({ name, value, ...options })
    },
    remove(name: string, options: CookieOptions) {
      res.cookies.set({ name, value: '', ...options, path: '/', maxAge: 0, expires: new Date(0) })
    },
    delete(name: string, options: CookieOptions) {
      res.cookies.set({ name, value: '', ...options, path: '/', maxAge: 0, expires: new Date(0) })
    },
  } as any

  // Session prüfen (setzt/aktualisiert Cookies bei Bedarf)
  const supabase = createServerClient(url, anon, { cookies: cookieAdapter })
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // Eingeloggt → durchlassen
    return res
  }

  // Nicht eingeloggt → Redirect zu /login (mit Rücksprungziel)
  const login = req.nextUrl.clone()
  login.pathname = '/login'
  login.searchParams.set('redirect', pathname + search)

  const redirectRes = NextResponse.redirect(login)
  // vom Supabase-Client gesetzte/gelöschte Cookies übernehmen
  for (const c of res.cookies.getAll()) {
    redirectRes.cookies.set(c)
  }
  return redirectRes
}

/* --- Matcher: alles außer /api, /_next und Dateien --- */
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
