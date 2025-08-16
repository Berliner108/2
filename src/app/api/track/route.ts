// /src/app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = supabaseAdmin()

  // Body (sendBeacon schickt oft text/plain)
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    try { body = JSON.parse(await req.text()) } catch {}
  }

  const rawPath = (body?.path ?? '/').toString()
  const path = rawPath.slice(0, 300)
  const ref = (body?.referrer || req.headers.get('referer') || null) as string | null

  const ipHdr = req.headers.get('x-forwarded-for') || ''
  const ip = ipHdr.split(',')[0].trim() || req.headers.get('x-real-ip') || '0.0.0.0'
  const ua = req.headers.get('user-agent') || ''
  const country = req.headers.get('x-vercel-ip-country')
    || req.headers.get('cf-ipcountry')
    || req.headers.get('x-geo-country')
    || null

  const isBot = /bot|crawler|spider|crawl|curl|httpx|node-fetch|axios|headless|preview|uptime/i.test(ua)
  const salt = process.env.IP_HASH_SALT || 'change-me'
  const ip_hash = crypto.createHmac('sha256', salt).update(ip).digest('hex')
  const ua_hash = crypto.createHash('sha256').update(ua).digest('hex')

  // anonyme Session (Unique-Zählung)
  const cookieName = 'sid'
  const existing = req.cookies.get(cookieName)?.value
  const sid = existing || crypto.randomUUID()

  // DB-Insert (Service Role)
  await admin.from('page_views').insert({
    path,
    referrer: ref,
    session_id: sid,
    ip_hash,
    ua_hash,
    country,
    is_bot: isBot,
    // user_id: optional – wenn du die User-ID mitgeben willst, siehe Client unten
  })

  const res = NextResponse.json({ ok: true })
  if (!existing) {
    res.cookies.set(cookieName, sid, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }
  return res
}
