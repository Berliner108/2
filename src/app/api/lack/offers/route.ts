// /src/app/api/lack/offers/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function reply(status: number, code: string, message: string, extra?: any) {
  return NextResponse.json({ ok: false, code, message, ...extra }, { status })
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return reply(401, 'NICHT_ANGEMELDET', 'Bitte melde dich an, um ein Angebot abzugeben.')

    const body = await req.json().catch(() => ({} as any))
    const requestId = String(body.requestId || '')
    const currencyIn = String(body.currency || 'EUR').toLowerCase()
    const description = body.description ?? null
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    if (!requestId) return reply(400, 'REQUEST_ID_FEHLT', 'Die Anfrage-ID fehlt.')
    if (currencyIn !== 'eur') return reply(400, 'WAEHRUNG_NICHT_UNTERSTUETZT', 'Aktuell wird nur EUR unterstützt.')
    if (expiresAt && isNaN(+expiresAt)) return reply(400, 'DATUM_UNGUELTIG', 'Das Ablaufdatum ist ungültig.')

    // Beträge (neu + Fallback)
    let itemAmountCents = Number.isInteger(body.itemAmountCents) ? Number(body.itemAmountCents) : undefined
    let shippingCents   = Number.isInteger(body.shippingCents)   ? Number(body.shippingCents)   : 0
    if (itemAmountCents == null) {
      const totalBody = Number.isInteger(body.amountCents) ? Number(body.amountCents) : undefined
      if (totalBody != null) itemAmountCents = totalBody
    }
    if (!(itemAmountCents! > 0) || shippingCents < 0) {
      return reply(400, 'BETRAG_UNGUELTIG', 'Bitte Artikelpreis (> 0 €) und Versandkosten (≥ 0 €) korrekt angeben.')
    }

    // Request prüfen
    const { data: reqRow, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, owner_id, delivery_at, lieferdatum, status')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr)  return reply(400, 'ANFRAGE_LESEN_FEHLGESCHLAGEN', 'Die Anfrage konnte nicht geladen werden.')
    if (!reqRow) return reply(404, 'ANFRAGE_NICHT_GEFUNDEN', 'Die Lackanfrage wurde nicht gefunden.')
    if (reqRow.owner_id === user.id) {
      return reply(403, 'EIGENE_ANFRAGE', 'Du kannst keine Angebote auf deine eigene Anfrage abgeben.')
    }
    if (!['open','awarded'].includes(String(reqRow.status))) {
      return reply(400, 'ANFRAGE_NICHT_OFFEN', 'Diese Anfrage ist nicht mehr offen.')
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
      const pgMsg = insErr.message || ''
      const pgCode = (insErr as any).code
      if (
        pgMsg.includes('ux_lack_offers_one_per_supplier') ||
        pgMsg.includes('uniq_lof_active_per_supplier') ||
        pgCode === '23505'
      ) {
        return reply(409, 'BEREITS_ANGEBOTEN', 'Du hast zu dieser Anfrage bereits ein aktives Angebot abgegeben.')
      }
      if (pgCode === '23514') {
        return reply(400, 'PRUEFUNG_FEHLGESCHLAGEN', 'Die Angaben wurden vom System abgelehnt. Bitte prüfe den Preis.')
      }
      return reply(400, 'SPEICHERN_FEHLGESCHLAGEN', 'Dein Angebot konnte nicht gespeichert werden.')
    }

    return NextResponse.json({
      ok: true,
      message: 'Dein Angebot wurde gesendet.',
      offer: ins
    })
  } catch (e: any) {
    return reply(500, 'SERVER_FEHLER', 'Unerwarteter Fehler. Bitte versuche es später erneut.')
  }
}
