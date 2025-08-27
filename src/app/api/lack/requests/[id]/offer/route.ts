// /src/app/api/lack/requests/[id]/offer/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  amountCents?: number              // bevorzugt: Preis in Cent
  amount?: string | number          // alternativ: "149.99"
  message?: string                  // kurze Nachricht an den Suchenden
  expiresAt?: string | null         // ISO (optional)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const requestId = params.id
    if (!requestId) return NextResponse.json({ error: 'Missing request id' }, { status: 400 })

    const input = (await req.json()) as Body

    // Preis normalisieren
    let amountCents =
      typeof input.amountCents === 'number' ? Math.round(input.amountCents) : undefined

    if (amountCents == null && input.amount != null) {
      const n = typeof input.amount === 'number'
        ? input.amount
        : Number(String(input.amount).replace(',', '.'))
      if (!isNaN(n)) amountCents = Math.round(n * 100)
    }
    if (typeof amountCents !== 'number' || !isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'amountCents/amount invalid' }, { status: 400 })
    }

    const message = (input.message ?? '').toString().trim().slice(0, 1000) || null
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
    if (expiresAt && isNaN(+expiresAt)) {
      return NextResponse.json({ error: 'expiresAt invalid' }, { status: 400 })
    }

    // Gesuch prüfen (offen & nicht eigenes)
    const { data: reqRow, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, owner_id, status')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr)  return NextResponse.json({ error: `request read failed: ${reqErr.message}` }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if ((reqRow.status as string) !== 'open') {
      return NextResponse.json({ error: 'Request is not open' }, { status: 400 })
    }
    if (reqRow.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot offer on your own request' }, { status: 400 })
    }

    // Finale Erstellung (KEIN Update). Unique-Index (request_id, supplier_id) erzwingt 1 Angebot je Anbieter.
    const { data, error } = await sb
      .from('lack_offers')
      .insert({
        request_id: reqRow.id,
        supplier_id: user.id,
        amount_cents: amountCents,
        currency: 'eur',
        message,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        // status bleibt 'active' (DB-Default), keine spätere Bearbeitung vorgesehen
      })
      .select('id, request_id, supplier_id, amount_cents, currency, status, expires_at, message, created_at')
      .single()

    if (error) {
      // Duplicate-Offer sauber signalisieren (Unique-Index ux_lack_offers_one_per_supplier)
      const code = (error as any)?.code || ''
      const msg  = (error as any)?.message || ''
      if (code === '23505' || /ux_lack_offers_one_per_supplier/i.test(msg)) {
        return NextResponse.json({ error: 'already_offered' }, { status: 409 })
      }
      return NextResponse.json({ error: msg || 'Insert failed' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offer: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create offer' }, { status: 500 })
  }
}
