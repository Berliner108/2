// src/app/api/lack/requests/[id]/offer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  amountCents?: number
  amount?: string | number
  message?: string
  expiresAt?: string | null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }   // <- Promise statt RouteContext
) {
  try {
    const { id } = await params                      // <- zwingend await

    const userClient = await supabaseServer()
    const { data: auth } = await userClient.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = (await req.json().catch(() => null)) as Body | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Preis normalisieren
    let amountCents =
      typeof body.amountCents === 'number' ? Math.round(body.amountCents) : undefined
    if (amountCents == null && body.amount != null) {
      const n = typeof body.amount === 'number'
        ? body.amount
        : Number(String(body.amount).replace(',', '.'))
      if (!isNaN(n)) amountCents = Math.round(n * 100)
    }
    if (typeof amountCents !== 'number' || !isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'amountCents/amount invalid' }, { status: 400 })
    }

    const message = (body.message ?? '').toString().trim().slice(0, 1000) || null
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (expiresAt && isNaN(+expiresAt)) {
      return NextResponse.json({ error: 'expiresAt invalid' }, { status: 400 })
    }

    // Gesuch prüfen (offen & nicht eigenes)
    const { data: reqRow, error: reqErr } = await userClient
      .from('lack_requests')
      .select('id, owner_id, status')
      .eq('id', id)
      .maybeSingle()
    if (reqErr)  return NextResponse.json({ error: `request read failed: ${reqErr.message}` }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if ((reqRow.status as string) !== 'open') {
      return NextResponse.json({ error: 'Request is not open' }, { status: 400 })
    }
    if (reqRow.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot offer on your own request' }, { status: 400 })
    }

    // Angebot anlegen
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('lack_offers')
      .insert({
        request_id: reqRow.id,
        supplier_id: user.id,
        amount_cents: amountCents,
        currency: 'eur',
        message,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      })
      .select('id')
      .single()

    if (error) {
      const code = (error as any)?.code || ''
      const msg  = (error as any)?.message || ''
      if (code === '23505' || /ux_lack_offers_one_per_supplier/i.test(msg)) {
        return NextResponse.json({ error: 'already_offered' }, { status: 409 })
      }
      return NextResponse.json({ error: msg || 'Insert failed' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offerId: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to create offer' }, { status: 500 })
  }
}
