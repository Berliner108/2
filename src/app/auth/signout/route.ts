import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

async function doLogout(req: NextRequest) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const next = req.nextUrl.searchParams.get('next') || '/login'
  const res = NextResponse.redirect(new URL(next, req.nextUrl.origin))
  res.headers.set('Cache-Control', 'no-store')

  const cookieAdapter = {
    get: (name: string) => req.cookies.get(name)?.value,
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

  await supabase.auth.signOut({ scope: 'global' })

  // Sicherheitsnetz: sb-* Cookies hart leeren
  const common = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  }
  res.cookies.set({ name: 'sb-access-token',  value: '', ...common })
  res.cookies.set({ name: 'sb-refresh-token', value: '', ...common })

  return res
}

export async function POST(req: NextRequest) { return doLogout(req) }
export async function GET (req: NextRequest) { return doLogout(req) }
