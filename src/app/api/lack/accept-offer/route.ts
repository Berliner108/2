// /src/app/api/lack/accept-offer/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Body = {
  requestId?: string
  offerId?: string
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { requestId, offerId } = (await req.json()) as Body
    if (!requestId || !offerId) {
      return NextResponse.json({ error: 'requestId and offerId required' }, { status: 400 })
    }

    // 1) Anfrage gehört dem Buyer?
    const { data: reqRow, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, owner_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr)  return NextResponse.json({ error: `request read failed: ${reqErr.message}` }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (reqRow.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not your request' }, { status: 403 })
    }

    // 2) Angebot gehört zur Anfrage, ist aktiv & nicht abgelaufen?
    const { data: offer, error: offErr } = await sb
      .from('lack_offers')
      .select('id, request_id, status, expires_at')
      .eq('id', offerId)
      .maybeSingle()

    if (offErr)  return NextResponse.json({ error: `offer read failed: ${offErr.message}` }, { status: 400 })
    if (!offer)  return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    if (String(offer.request_id) !== String(reqRow.id)) {
      return NextResponse.json({ error: 'Offer does not belong to request' }, { status: 400 })
    }
    if (offer.status !== 'active') {
      return NextResponse.json({ error: 'Offer is not active' }, { status: 400 })
    }
    if (offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Offer expired' }, { status: 400 })
    }

    // 3) An Zahl-Route weiterreichen (hartes Gate + PI-Erstellung findet DORT statt)
    const origin = new URL(req.url).origin
    const res = await fetch(`${origin}/api/orders/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'lack', requestId, offerId }),
      cache: 'no-store',
    })

    const json = await res.json()
    return NextResponse.json(json, { status: res.status })
  } catch (err: any) {
    console.error('[accept-offer] fatal', err)
    return NextResponse.json({ error: err?.message || 'Failed to accept offer' }, { status: 500 })
  }
}
