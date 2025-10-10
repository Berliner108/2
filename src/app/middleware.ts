// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

const PUBLIC_PATHS = ['/login', '/auth/callback'] // bei Bedarf erweitern (z.B. /auth/error)

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // --- Tracking: jeden Request (auch vor Redirect) anonym loggen ---
  try {
    await fetch(new URL('/api/track', req.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-track-secret': process.env.TRACK_SECRET!
      },
      body: JSON.stringify({
        path: req.nextUrl.pathname + req.nextUrl.search,
        ref: req.headers.get('referer') || ''
      }),
      keepalive: true,
    })
  } catch {}

  // --- Zugriffsschutz ---
  const { pathname, search } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))

  // Eingeloggt & /login → zur Startseite (oder wohin du willst)
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Nicht eingeloggt → alles außer PUBLIC blocken
  if (!session && !isPublic) {
    const url = new URL('/login', req.url)
    url.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(url)
  }

  return res
}

// Matcher: Assets & Systempfade ausschließen.
// (Wenn du später einen Webhook hast, füge ihn hier als Ausnahme hinzu.)
export const config = {
  matcher: [
    '/((?!_next/|static/|favicon.ico|robots.txt|sitemap.xml|images/|assets/|_vercel/insights).*)',
  ],
}
