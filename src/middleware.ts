// src/middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Einzelne öffentliche Seiten
const PUBLIC_SINGLE_PAGES = new Set<string>([
  '/',
  '/login',
  '/registrieren',
  '/reset-password',      // ✅ Passwort-Reset Seite offen
  '/impressum',
  '/nutzungsbedingungen',
  '/agb',
  '/datenschutz',
  '/cookies',
  '/karriere',
  '/kontakt',
])

// Ganze Bereiche MIT Unterseiten öffentlich
const PUBLIC_SECTIONS_WITH_CHILDREN = [
  '/auftragsboerse',
  '/auftragsbörse',        // Umlaute
  '/auftragsb%C3%B6rse',   // URL-encoded Fallback
  '/lackanfragen',
  '/wissenswertes',        // Liste + Artikel offen
]

// Shop: nur die Liste ist öffentlich, Details gesperrt
function isShopList(path: string) {
  return path === '/kaufen' || path === '/kaufen/'
}

// Auth/Callback-Routen immer offen (inkl. Passwort-Update unter /auth)
function isAuthPath(path: string) {
  return path === '/auth' || path.startsWith('/auth/')
}

function isPublic(path: string) {
  if (PUBLIC_SINGLE_PAGES.has(path)) return true
  if (isAuthPath(path)) return true
  if (PUBLIC_SECTIONS_WITH_CHILDREN.some(p => path === p || path.startsWith(p + '/'))) return true
  if (isShopList(path)) return true // nur Übersicht von /kaufen ist offen
  return false
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Öffentliche Pfade: durchlassen
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // ENV-Variablen defensiv prüfen (verhindert @supabase/ssr-Throw)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const login = req.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(login)
  }

  // Supabase-Client für Middleware (setzt/refresh’t Cookies automatisch)
  const res = NextResponse.next()
  const supabase = createServerClient(url, anon, {
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
  })

  // Session prüfen
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    // WICHTIG: `res` zurückgeben, damit evtl. aktualisierte Cookies an den Browser gehen
    return res
  }

  // Keine Session → zum Login mit "back to" Redirect
  const login = req.nextUrl.clone()
  login.pathname = '/login'
  login.searchParams.set('redirect', pathname + search)
  return NextResponse.redirect(login)
}

// Alle Pfade abfangen außer /api, /_next und Dateien mit Punkt (Assets)
export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
}
