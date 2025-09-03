import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  itemAmountCents?: number      // > 0
  shippingCents?: number        // >= 0
  currency?: string
  // Backwards-Compat:
  amountCents?: number          // total
  amount?: string | number      // total ("122,00")
  message?: string
  expiresAt?: string | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const userClient = await supabaseServer()
    const { data: auth } = await userClient.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Beträge normalisieren
    let itemCents = typeof body.itemAmountCents === 'number' ? Math.round(body.itemAmountCents) : undefined
    let shipCents = typeof body.shippingCents   === 'number' ? Math.round(body.shippingCents)   : undefined

    if (itemCents == null) {
      let totalFromBody: number | undefined =
        typeof body.amountCents === 'number' ? Math.round(body.amountCents) : undefined
      if (totalFromBody == null && body.amount != null) {
        const n = typeof body.amount === 'number' ? body.amount : Number(String(body.amount).replace(',', '.'))
        if (!isNaN(n)) totalFromBody = Math.round(n * 100)
      }
      if (typeof totalFromBody === 'number' && isFinite(totalFromBody) && totalFromBody > 0) {
        itemCents = totalFromBody
        shipCents = shipCents ?? 0
      }
    }
    shipCents = shipCents ?? 0

    if (!(typeof itemCents === 'number' && isFinite(itemCents) && itemCents > 0)) {
      return NextResponse.json({ error: 'itemAmountCents invalid' }, { status: 400 })
    }
    if (!(typeof shipCents === 'number' && isFinite(shipCents) && shipCents >= 0)) {
      return NextResponse.json({ error: 'shippingCents invalid' }, { status: 400 })
    }

    const totalCents = itemCents + shipCents
    const currency = (body.currency ?? 'eur').toLowerCase()

    const message = (body.message ?? '').toString().trim().slice(0, 1000) || null
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (expiresAt && isNaN(+expiresAt)) {
      return NextResponse.json({ error: 'expiresAt invalid' }, { status: 400 })
    }

    // Gesuch prüfen
    const { data: reqRow, error: reqErr } = await userClient
      .from('lack_requests')
      .select('id, owner_id, status, delivery_at, lieferdatum')
      .eq('id', id)
      .maybeSingle()
    if (reqErr)  return NextResponse.json({ error: `request read failed: ${reqErr.message}` }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Anfrage nicht gefunden' }, { status: 404 })
    if ((reqRow.status as string) !== 'open') {
      return NextResponse.json({ error: 'Anfrage ist nicht verfügbar' }, { status: 400 })
    }
    if (reqRow.owner_id === user.id) {
      return NextResponse.json({ error: 'Du kannst zu eigenen Anfragen keine Angebote abgeben' }, { status: 400 })
    }

    // expires_at: min(now+72h, Tag davor 23:59)
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

    // Insert
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('lack_offers')
      .insert({
        request_id: reqRow.id,
        supplier_id: user.id,
        item_amount_cents: itemCents,
        shipping_cents:    shipCents,
        amount_cents:      totalCents, // Trigger hält das in Sync
        currency,
        message,
        expires_at: exp.toISOString(),
        status: 'active',
      })
      .select('id')
      .single()

    if (error) {
      const code = (error as any)?.code || ''
      const msg  = (error as any)?.message || ''
      if (code === '23505' || /ux_lack_offers_one_per_supplier|uniq_lof_active_per_supplier/i.test(msg)) {
        return NextResponse.json({ error: 'already_offered' }, { status: 409 })
      }
      return NextResponse.json({ error: msg || 'Insert failed' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offerId: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to create offer' }, { status: 500 })
  }
}
