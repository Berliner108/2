import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({} as any))
    const requestId = String(body.requestId || '')
    const currencyIn = String(body.currency || 'EUR').toLowerCase()
    const description = body.description ?? null
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })
    if (currencyIn !== 'eur') return NextResponse.json({ error: 'Only EUR supported' }, { status: 400 })
    if (expiresAt && isNaN(+expiresAt)) return NextResponse.json({ error: 'expiresAt invalid' }, { status: 400 })

    // Beträge (neu + Fallback)
    let itemAmountCents = Number.isInteger(body.itemAmountCents) ? Number(body.itemAmountCents) : undefined
    let shippingCents   = Number.isInteger(body.shippingCents)   ? Number(body.shippingCents)   : 0
    if (itemAmountCents == null) {
      const totalBody = Number.isInteger(body.amountCents) ? Number(body.amountCents) : undefined
      if (totalBody != null) itemAmountCents = totalBody
    }
    if (!(itemAmountCents! > 0) || shippingCents < 0) {
      return NextResponse.json({ error: 'itemAmountCents (>0) and shippingCents (>=0) required' }, { status: 400 })
    }

    // Request prüfen
    const { data: reqRow, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, owner_id, delivery_at, lieferdatum, status')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr)  return NextResponse.json({ error: reqErr.message }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Anfrage nicht gefunden' }, { status: 404 })
    if (reqRow.owner_id === user.id) {
      return NextResponse.json({ error: 'Du kannst zu eigenen Anfragen keine Angebote abgeben' }, { status: 403 })
    }
    if (!['open','awarded'].includes(String(reqRow.status))) {
      return NextResponse.json({ error: `Request status not open/awarded (${reqRow.status})` }, { status: 400 })
    }

    // expires_at: min(now+72h, Tag-vor-Lieferdatum 23:59)
    const plus72h = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const delivery = (reqRow as any).delivery_at || (reqRow as any).lieferdatum
    let cap: Date | null = null
    if (delivery) {
      const d = new Date(delivery)
      d.setDate(d.getDate() - 1)
      d.setHours(23, 59, 59, 999)
      cap = d
    }
    let exp = expiresAt && !isNaN(+expiresAt) ? expiresAt : plus72h
    if (cap && +cap < +exp) exp = cap

    const total = itemAmountCents! + shippingCents

    const { data: ins, error: insErr } = await sb
      .from('lack_offers')
      .insert({
        request_id: reqRow.id,
        supplier_id: user.id,
        item_amount_cents: itemAmountCents!,
        shipping_cents:    shippingCents,
        amount_cents:      total,
        currency: 'eur',
        status: 'active',
        message: description,
        expires_at: exp.toISOString(),
      })
      .select('id, request_id, supplier_id, item_amount_cents, shipping_cents, amount_cents, currency, status, expires_at')
      .maybeSingle()

    if (insErr) {
      const msg = insErr.message || ''
      if (msg.includes('ux_lack_offers_one_per_supplier') || msg.includes('uniq_lof_active_per_supplier')) {
        return NextResponse.json({ error: 'ALREADY_OFFERED' }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offer: ins })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Create offer failed' }, { status: 500 })
  }
}
