import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = supabaseAdmin()

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    try {
      body = JSON.parse(await req.text())
    } catch {}
  }

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
  const ip =
    ipHdr.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'

  const ua = req.headers.get('user-agent') || ''
  const acceptLanguage = req.headers.get('accept-language') || ''
  const secFetchSite = req.headers.get('sec-fetch-site') || ''
  const secChUa = req.headers.get('sec-ch-ua') || ''

  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-geo-country') ||
    null

  const rawCity = req.headers.get('x-vercel-ip-city') || null
  let city: string | null = rawCity
  try {
    city = rawCity ? decodeURIComponent(rawCity) : null
  } catch {}

  const isBot =
    /bot|crawler|spider|crawl|curl|wget|httpx|node-fetch|axios|python-requests|python|java|go-http-client|headless|phantomjs|selenium|playwright|puppeteer|preview|uptime|monitor|healthcheck|vercel-screenshot|vercel edge functions|meta-externalagent|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|applebot|bingbot|googlebot|yandex|baiduspider|duckduckbot|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|chatgpt-user|claudebot|anthropic-ai|perplexitybot/i.test(ua)

  const looksLikeBrowser =
    /mozilla\/5\.0|chrome\/|chromium\/|firefox\/|safari\/|edg\//i.test(ua) &&
    Boolean(acceptLanguage || secFetchSite || secChUa)

  const isPrefetch =
    req.headers.get('purpose') === 'prefetch' ||
    req.headers.get('sec-purpose')?.includes('prefetch') ||
    req.headers.get('x-moz') === 'prefetch' ||
    req.headers.get('next-router-prefetch') === '1'

  if (isBot || !looksLikeBrowser || isPrefetch) {
    return NextResponse.json({
      ok: true,
      skipped: isBot ? 'bot' : isPrefetch ? 'prefetch' : 'non-browser',
    })
  }

  if (
    !path ||
    path === '/null' ||
    path.includes('/null') ||
    path === '/undefined' ||
    path.includes('/undefined')
  ) {
    return NextResponse.json({ ok: true, skipped: 'invalid-path' })
  }

  const salt =
    process.env.IP_HASH_SALT ||
    process.env.TRACK_SALT ||
    'change-me'

  const ip_hash = crypto.createHmac('sha256', salt).update(ip).digest('hex')
  const ua_hash = crypto.createHash('sha256').update(ua).digest('hex')

  const cookieName = 'sid'
  const existing = req.cookies.get(cookieName)?.value
  const sid = existing || crypto.randomUUID()

  const { data: existingPageView, error: pageViewCheckError } = await admin
    .from('page_views')
    .select('session_id')
    .eq('session_id', sid)
    .eq('path', path)
    .limit(1)
    .maybeSingle()

  if (pageViewCheckError) {
    console.error('page_view dedupe check failed:', pageViewCheckError)
  }

  const writes: any[] = []

  if (!existingPageView) {
    writes.push(
      admin.from('page_views').insert({
        path,
        referrer: ref,
        session_id: sid,
        ip_hash,
        ua_hash,
        country,
        is_bot: false,
      })
    )
  }

  if (!existing) {
    writes.push(
      admin.from('visits').insert({
        path,
        ref: ref,
        ip_hash,
        country,
        city,
        ua: ua.slice(0, 500),
      })
    )
  }

  if (writes.length > 0) {
    const results = await Promise.all(writes)
    for (const result of results) {
      if (result?.error) {
        console.error('tracking insert failed:', result.error)
      }
    }
  }

  const res = NextResponse.json({
    ok: true,
    skipped: writes.length === 0 ? 'duplicate' : undefined,
  })

  if (!existing) {
    res.cookies.set(cookieName, sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  }

  return res
}
