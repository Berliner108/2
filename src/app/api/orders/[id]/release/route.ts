// /src/app/api/orders/[id]/release/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function siteOrigin(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(req.url).origin)
  )
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    const origin = siteOrigin(req)

    const upstream = await fetch(`${origin}/api/orders/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Session für Supabase weitergeben:
        cookie: req.headers.get('cookie') || '',
        // optional: für Logging/Rate-Limits
        'user-agent': req.headers.get('user-agent') || '',
        'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
      },
      body: JSON.stringify({ orderId: id }),
      cache: 'no-store',
    })

    const data = await upstream.json().catch(() => ({}))
    const res = NextResponse.json(data, { status: upstream.status })

    // Set-Cookie vom Upstream (falls jemals gebraucht) durchreichen
    const setCookie = upstream.headers.get('set-cookie')
    if (setCookie) res.headers.set('set-cookie', setCookie)

    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}

// Optional: alle anderen Methoden blocken
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
