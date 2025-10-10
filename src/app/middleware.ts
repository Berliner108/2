// middleware.ts (Projekt-Root)
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// Nur diese Pfade sind öffentlich erreichbar (Login & dein Callback)
const PUBLIC_PATHS = ['/login', '/auth/callback']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // --- Tracking: schickt jeden Request an /api/track (wie deine route.ts erwartet) ---
  try {
    await fetch(new URL('/api/track', req.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // deine route.ts erwartet { path, referrer } (ohne Secret)
      body: JSON.stringify({
        path: req.nextUrl.pathname + req.nextUrl.search,
        referrer: req.headers.get('referer') || null,
      }),
      keepalive: true, // damit Redirects das Senden nicht abbrechen
    })
  } catch {
    // Tracking darf nie den Request blockieren
  }

  // --- Zugriffsschutz: alles außer PUBLIC nur für eingeloggte User ---
  const { pathname, search } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))

  // Eingeloggt & auf /login -> zur Startseite (oder wohin du willst)
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Nicht eingeloggt -> Redirect zu /login (mit Rücksprungziel)
  if (!session && !isPublic) {
    const url = new URL('/login', req.url)
    url.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(url)
  }

  return res
}

// Greift auf ALLES außer statischen Assets & Standarddateien.
// (Webhook-Pfade kannst du später explizit ausnehmen.)
export const config = {
  matcher: [
    '/((?!_next/|favicon.ico|robots.txt|sitemap.xml|images/|assets/).*)',
  ],
}
