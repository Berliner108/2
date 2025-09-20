// /src/app/api/orders/[id]/release/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function siteOrigin(req: Request) {
  // Bevorzugt feste URL, sonst Vercel, sonst Local
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(req.url).origin)
  )
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    // Proxy zur zentralen Release-Route – Cookies weitergeben, damit Auth funktioniert
    const origin = siteOrigin(req)
    const res = await fetch(`${origin}/api/orders/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Cookie-Forward (damit Supabase-Session in der zentralen Route vorhanden ist)
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({ orderId: id }),
    })

    // Antwort 1:1 durchreichen
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
