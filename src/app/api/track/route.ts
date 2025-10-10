// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** IPv4 -> letztes Oktett auf 0; IPv6 -> nur Präfix, Rest genullt (grob) */
function anonymizeIp(ip: string) {
  if (!ip) return '0.0.0.0'
  if (ip.includes('.')) {
    const p = ip.split('.')
    if (p.length >= 4) { p[3] = '0'; return p.slice(0, 4).join('.') }
    return ip
  }
  if (ip.includes(':')) {
    const seg = ip.split(':')
    // behalte die ersten 4 Segmente, Rest genullt
    const keep = seg.slice(0, 4).join(':')
    return `${keep}:0000:0000:0000:0000`
  }
  return ip
}

export async function POST(req: NextRequest) {
  // 1) interner Schutz: nur mit Secret-Header zulassen
  const secret = req.headers.get('x-track-secret')
  if (!process.env.TRACK_SECRET || secret !== process.env.TRACK_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin()

  // 2) Body robust parsen (sendBeacon schickt oft text/plain)
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    try { body = JSON.parse(await req.text()) } catch { body = {} }
  }

  // 3) Felder säubern/limitieren
  const rawPath = (body?.path ?? '/').toString()
  const path = rawPath.slice(0, 300)
  const ref = (body?.referrer || body?.ref || req.headers.get('referer') || null) as string | null

  // 4) IP/Geo/UA
  const ipHdr = req.headers.get('x-forwarded-for') || ''
  const ipClient = (ipHdr.split(',')[0] || '').trim() || req.headers.get('x-real-ip') || '0.0.0.0'
  const ipAnon = anonymizeIp(ipClient)

  const ua = req.headers.get('user-agent') || ''
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-geo-country') ||
    null

  // einfache Bot-Erkennung (nur Heuristik)
  const isBot = /bot|crawler|spider|crawl|curl|httpx|node-fetch|axios|headless|preview|uptime|monitor/i.test(ua)

  // 5) IP/UA hashen (mit Salt) – DSGVO-freundlich
  const salt =
    process.env.TRACK_SALT || // bevorzugt
    process.env.IP_HASH_SALT || // fallback auf alten Namen, wenn vorhanden
    'change-me'
  const ip_hash = crypto.createHmac('sha256', salt).update(ipAnon).digest('hex')
  const ua_hash = crypto.createHash('sha256').update(ua).digest('hex')

  // 6) anonyme Session-ID (nur setzen, wenn nicht Bot)
  const cookieName = 'sid'
  const existing = req.cookies.get(cookieName)?.value
  const sid = existing || crypto.randomUUID()

  // 7) DB-Insert (Service Role; RLS kann ON bleiben)
  await admin.from('page_views').insert({
    path,
    referrer: ref,
    session_id: sid,
    ip_hash,
    ua_hash,
    country,
    is_bot: isBot,
    // user_id: optional – wenn du die User-ID mitschicken willst, kannst du sie im Middleware-Fetch body ergänzen
  })

  const res = NextResponse.json({ ok: true })

  // Session-Cookie nur für echte Nutzer setzen (keine Bots)
  if (!existing && !isBot) {
    res.cookies.set(cookieName, sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365, // 1 Jahr
      path: '/',
    })
  }

  return res
}
