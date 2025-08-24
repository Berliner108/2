// src/middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/* ---------- Public allowlists ---------- */
const PUBLIC_SINGLE_PAGES = new Set<string>([
  '/', '/login', '/registrieren', '/reset-password',
  '/impressum', '/nutzungsbedingungen', '/agb',
  '/datenschutz', '/cookies', '/kontakt',
])
const PUBLIC_SECTIONS_WITH_CHILDREN = ['/wissenswertes', '/karriere']
const AUFTRAGS_ROOTS = new Set<string>([
  '/auftragsboerse','/auftragsboerse/','/auftragsbörse','/auftragsbörse/',
  '/auftragsb%C3%B6rse','/auftragsb%C3%B6rse/','/auftragsb%CC%88rse','/auftragsb%CC%88rse/',
])

function isShopList(path: string)    { return path === '/kaufen' || path === '/kaufen/' }
function isAuftragsList(path: string){ return AUFTRAGS_ROOTS.has(path) }
function isLackList(path: string)    { return path === '/lackanfragen' || path === '/lackanfragen/' }
function isAuthPath(path: string)    { return path === '/auth' || path.startsWith('/auth/') }
function isPublic(path: string) {
  if (PUBLIC_SINGLE_PAGES.has(path)) return true
  if (isAuthPath(path)) return true
  if (PUBLIC_SECTIONS_WITH_CHILDREN.some(p => path === p || path.startsWith(p + '/'))) return true
  if (isShopList(path)) return true
  if (isAuftragsList(path)) return true
  if (isLackList(path)) return true
  return false
}

/* ---------- Middleware ---------- */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Öffentliche Routen durchlassen
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // ENV defensiv prüfen
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    const login = req.nextUrl.clone()
    login.pathname = '/login'
    login.searchParams.set('redirect', pathname + search)
    return NextResponse.redirect(login)
  }

  // Response vorab, damit Supabase Cookies (Refresh) setzen kann
  const res = NextResponse.next()

  // Universal-Cookie-Adapter (kompatibel mit alten & neuen @supabase/ssr Typen)
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

  const supabase = createServerClient(url, anon, { cookies: cookieAdapter })

  // Session prüfen (Refresh läuft automatisch; evtl. neue Cookies liegen in `res`)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    return res
  }

  // keine Session → Login mit Rücksprung
  const login = req.nextUrl.clone()
  login.pathname = '/login'
  login.searchParams.set('redirect', pathname + search)

  const redirectRes = NextResponse.redirect(login)
  // evtl. von Supabase gesetzte/gelöschte Cookies in die Redirect-Response übernehmen
  for (const c of res.cookies.getAll()) {
    redirectRes.cookies.set(c)
  }
  return redirectRes
}

/* ---------- Matcher ---------- */
// Alles außer /api, /_next und statische Dateien
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
