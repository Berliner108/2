// src/middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Einzelne öffentliche Seiten
const PUBLIC_SINGLE_PAGES = [
  '/', '/login', '/registrieren',
  '/impressum', '/nutzungsbedingungen', '/agb',
  '/datenschutz', '/cookies', '/karriere', '/kontakt',
]

// Ganze Bereiche MIT Unterseiten öffentlich
const PUBLIC_SECTIONS_WITH_CHILDREN = [
  '/auftragsboerse', '/auftragsbörse', // Schreibweisen
  '/lackanfragen',
  '/wissenswertes',                    // komplett öffentlich (Liste + Artikel)
]

// Shop: nur die Liste ist öffentlich, Details gesperrt
function isShopList(path: string) {
  return path === '/kaufen' || path === '/kaufen/'
}

// Auth/Callback-Routen immer offen
function isAuthPath(path: string) {
  return path === '/auth' || path.startsWith('/auth/')
}

function isPublic(path: string) {
  if (PUBLIC_SINGLE_PAGES.includes(path)) return true
  if (isAuthPath(path)) return true
  if (PUBLIC_SECTIONS_WITH_CHILDREN.some(p => path === p || path.startsWith(p + '/'))) return true
  if (isShopList(path)) return true                 // nur Übersicht von /kaufen ist offen
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Öffentliche Pfade: einfach durchlassen
  if (isPublic(pathname)) return NextResponse.next()

  // Supabase-Client für Middleware (setzt/refresh’t Cookies automatisch)
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Session abfragen (bei Bedarf werden Cookies im `res` aktualisiert)
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // Wichtig: `res` zurückgeben, damit evtl. aktualisierte Cookies zum Browser gehen
    return res
  }

  // Keine Session → zum Login mit "back to" Redirect
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', pathname + search)
  return NextResponse.redirect(url)
}

// Greife auf alles außer /api, /_next und statische Dateien
export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
    '/',
  ],
}
