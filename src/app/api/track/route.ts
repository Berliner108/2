// /src/app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Deine Produktions-Hauptdomain (z. B. "example.com") via ENV setzen */
const PROD_HOST = process.env.NEXT_PUBLIC_SITE_HOST?.toLowerCase() || null

/** Vercel-/Preview-Referrer auf Hauptdomain normalisieren (optional, für schönere Auswertung) */
function normalizeRef(urlStr: string | null): string | null {
  if (!urlStr) return null
  try {
    const u = new URL(urlStr)
    const host = u.host.toLowerCase()
    if (PROD_HOST && /vercel\.app$/i.test(host)) {
      u.protocol = 'https:'
      u.host = PROD_HOST
    }
    return u.toString()
  } catch {
    return urlStr
  }
}

export async function POST(req: NextRequest) {
  // ---- Secret prüfen (Schutz vor externen POSTs) ----
  const hdr = req.headers.get('x-track-secret')
  if (!process.env.TRACK_SECRET || hdr !== process.env.TRACK_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin()

  // Body (sendBeacon schickt oft text/plain)
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    try { body = JSON.parse(await req.text()) } catch {}
  }

  // Pfad kürzen
  const rawPath = (body?.path ?? '/').toString()
  const path = rawPath.slice(0, 300)

  // Referrer lesen + normalisieren
  const refRaw = (body?.referrer || req.headers.get('referer') || null) as string | null
  const ref = normalizeRef(refRaw)

  // IP (erste aus XFF) + UA
  const ipHdr = req.headers.get('x-forwarded-for') || ''
  const ip =
    ipHdr.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  const ua = req.headers.get('user-agent') || ''

  // Country aus Vercel/CF/Fallback-Headern
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-geo-country') ||
    null

  // City kann URL-kodiert kommen → sicher dekodieren
  const rawCity = req.headers.get('x-vercel-ip-city') || null
  let city: string | null = rawCity
  try { city = rawCity ? decodeURIComponent(rawCity) : null } catch {}

  // Bot-Heuristik etwas geschärft (nur für page_views.is_bot; visits wird später per SQL gefiltert)
  const isBot = /bot|crawler|spider|crawl|curl|httpx|node-fetch|axios|headless|preview|uptime|playwright|puppeteer|lighthouse|vercel-screenshot|vercel edge functions/i
    .test(ua)

  // Hashes
  const salt = process.env.IP_HASH_SALT || 'change-me'
  const ip_hash = crypto.createHmac('sha256', salt).update(ip).digest('hex')
  const ua_hash = crypto.createHash('sha256').update(ua).digest('hex')

  // anonyme Session (Unique-Zählung)
  const cookieName = 'sid'
  const existing = req.cookies.get(cookieName)?.value
  const sid = existing || crypto.randomUUID()

  // DB-Insert (Service Role)
  await Promise.all([
    admin.from('page_views').insert({
      path,
      referrer: ref,
      session_id: sid,
      ip_hash,
      ua_hash,
      country,
      is_bot: isBot,
      // user_id: optional
    }),
    admin.from('visits').insert({
      path,
      ref,              // Spaltenname in visits: "ref"
      ip_hash,
      country,
      city,
      ua: ua.slice(0, 500),  // etwas limitieren
      // ts kommt per DEFAULT now()
    }),
  ])

  const res = NextResponse.json({ ok: true })
  if (!existing) {
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
