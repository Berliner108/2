// /src/app/api/lack/offers/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const requestId   = String(body.requestId || '')
    const amountCents = Number(body.amountCents)
    const description = body.description ?? null
    const expiresAt   = body.expiresAt ? new Date(body.expiresAt) : null
    const currencyIn  = String(body.currency || 'EUR').toLowerCase()

    if (!requestId || !Number.isInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'requestId and positive amountCents required' }, { status: 400 })
    }
    if (currencyIn !== 'eur') {
      return NextResponse.json({ error: 'Only EUR supported' }, { status: 400 })
    }

    // Anfrage laden & prüfen
    const { data: reqRow, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, owner_id, delivery_at, lieferdatum, status')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr)  return NextResponse.json({ error: reqErr.message }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (reqRow.owner_id === user.id) {
      return NextResponse.json({ error: 'You cannot offer on your own request' }, { status: 403 })
    }
    if (!['open','awarded'].includes(String(reqRow.status))) {
      return NextResponse.json({ error: `Request status not open/awarded (${reqRow.status})` }, { status: 400 })
    }

    // expires_at: min(now+72h, Tag davor 23:59) – override via body.expiresAt erlaubt
    const now = Date.now()
    const plus72h = new Date(now + 72 * 60 * 60 * 1000)
    const delivery = reqRow.delivery_at || reqRow.lieferdatum
    let cap: Date | null = null
    if (delivery) {
      const d = new Date(delivery)
      d.setDate(d.getDate() - 1)
      d.setHours(23, 59, 59, 999)
      cap = d
    }
    let exp = expiresAt && !isNaN(+expiresAt) ? expiresAt : plus72h
    if (cap && +cap < +exp) exp = cap

    const { data: ins, error: insErr } = await sb
      .from('lack_offers')
      .insert({
        request_id: reqRow.id,
        supplier_id: user.id,           // RLS with_check
        amount_cents: amountCents,
        currency: 'eur',
        status: 'active',
        message: description,           // Spalte heißt message
        expires_at: exp.toISOString(),
      })
      .select('id, request_id, supplier_id, amount_cents, currency, status, expires_at')
      .maybeSingle()

    if (insErr) {
      const msg = insErr.message || ''
      if (
        msg.includes('ux_lack_offers_one_per_supplier') ||
        msg.includes('uniq_lof_active_per_supplier')
      ) {
        return NextResponse.json({ error: 'ALREADY_OFFERED' }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offer: ins })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Create offer failed' }, { status: 500 })
  }
}
