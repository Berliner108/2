// src/middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Einzelne öffentliche Seiten
const PUBLIC_SINGLE_PAGES = new Set<string>([
  '/',
  '/login',
  '/registrieren',
  '/reset-password',
  '/impressum',
  '/nutzungsbedingungen',
  '/agb',
  '/datenschutz',
  '/cookies',
  // '/karriere', // wird unten inkl. Unterseiten freigegeben
  '/kontakt',
])

// Komplett offen (inkl. Unterseiten)
const PUBLIC_SECTIONS_WITH_CHILDREN = ['/wissenswertes', '/karriere']

// Shop: nur Übersicht offen
function isShopList(path: string) {
  return path === '/kaufen' || path === '/kaufen/'
}

// Auftragsbörse: nur Übersicht offen
const AUFTRAGS_ROOTS = new Set<string>([
  '/auftragsboerse', '/auftragsboerse/',
  '/auftragsbörse',  '/auftragsbörse/',
  '/auftragsb%C3%B6rse', '/auftragsb%C3%B6rse/',
  '/auftragsb%CC%88rse', '/auftragsb%CC%88rse/',
])
function isAuftragsList(path: string) {
  return AUFTRAGS_ROOTS.has(path)
}

// Lackanfragen: nur Übersicht offen
const LACK_ROOTS = new Set<string>(['/lackanfragen', '/lackanfragen/'])
function isLackList(path: string) {
  return LACK_ROOTS.has(path)
}

// Auth/Callback-Routen immer offen (inkl. Passwortrouten unter /auth)
function isAuthPath(path: string) {
  return path === '/auth' || path.startsWith('/auth/')
}

function isPublic(path: string) {
  if (PUBLIC_SINGLE_PAGES.has(path)) return true
  if (isAuthPath(path)) return true

  // komplette Bereiche
  if (PUBLIC_SECTIONS_WITH_CHILDREN.some(p => path === p || path.startsWith(p + '/'))) return true

  // nur Listen (Details NICHT öffentlich)
  if (isShopList(path)) return true
  if (isAuftragsList(path)) return true
  if (isLackList(path)) return true

  return false
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Öffentliche Pfade: durchlassen
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // ENV defensiv prüfen (verhindert Throw von @supabase/ssr)
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const login = req.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(login)
  }

  // Supabase-Client (kümmert sich um Cookie-Refresh)
  const res = NextResponse.next()
  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    // evtl. aktualisierte Cookies weitergeben
    return res
  }

  // keine Session → Login mit Rücksprung
  const login = req.nextUrl.clone()
  login.pathname = '/login'
  login.searchParams.set('redirect', pathname + search)
  return NextResponse.redirect(login)
}

// Alles außer /api, /_next und statische Dateien
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
