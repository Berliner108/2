import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = supabaseAdmin()

  // Body lesen (sendBeacon => oft text/plain)
  let body: any = {}
  try { body = await req.json() } catch {
    try { body = JSON.parse(await req.text()) } catch {}
  }

  // ---- Secret prüfen: Header ODER Body ----
  const serverSecret = process.env.TRACK_SECRET || ''
  const headerSecret = req.headers.get('x-track-secret') || ''
  const bodySecret = (body?.secret || '').toString()
  if (!serverSecret || (headerSecret !== serverSecret && bodySecret !== serverSecret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
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

  const rawCity = req.headers.get('x-vercel-ip-city') || null
  let city: string | null = rawCity
  try { city = rawCity ? decodeURIComponent(rawCity) : null } catch {}

  const isBot = /bot|crawler|spider|crawl|curl|httpx|node-fetch|axios|headless|preview|uptime/i.test(ua)

  // ➜ dein Salt-Name bleibt gültig
  const salt = process.env.IP_HASH_SALT || process.env.TRACK_SALT || 'change-me'
  const ip_hash = crypto.createHmac('sha256', salt).update(ip).digest('hex')
  const ua_hash = crypto.createHash('sha256').update(ua).digest('hex')

  // anonyme Session-ID
  const cookieName = 'sid'
  const existing = req.cookies.get(cookieName)?.value
  const sid = existing || crypto.randomUUID()

  await Promise.all([
    admin.from('page_views').insert({
      path, referrer: ref, session_id: sid,
      ip_hash, ua_hash, country, is_bot: isBot
    }),
    admin.from('visits').insert({
      path, ref: ref, ip_hash, country, city, ua: ua.slice(0, 500)
    })
  ])

  const res = NextResponse.json({ ok: true })
  if (!existing) {
    res.cookies.set(cookieName, sid, {
      httpOnly: true, sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, path: '/',
    })
  }
  return res
}
