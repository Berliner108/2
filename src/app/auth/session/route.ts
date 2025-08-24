// app/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const { access_token, refresh_token } = await req.json().catch(() => ({} as any))
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
  }

  // Antwort vorbereiten (hier JSON 200; wichtig ist, dass wir Cookies setzen können)
  const res = NextResponse.json({ ok: true }, { status: 200 })
  res.headers.set('Cache-Control', 'no-store')

  // Universal-Cookie-Adapter (kompatibel mit alten & neuen @supabase/ssr-Typen)
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

  // HttpOnly-Cookies für SSR/Middleware setzen
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) {
    return NextResponse.json({ error: 'setSession failed' }, { status: 401 })
  }

  return res
}
