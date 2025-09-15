import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/* -------------------- Utils -------------------- */
function toInt(n: unknown, def = 0): number {
  if (n == null) return def
  const v = typeof n === 'string' ? Number(n) : Number(n)
  return Number.isFinite(v) ? Math.trunc(v) : def
}

/** Parse `lieferdatum` (DATE "YYYY-MM-DD" oder ISO) als Vienna-Kalendertag */
function toViennaYMD(input: unknown): { y: number; m: number; d: number } | null {
  if (!input) return null
  const s = String(input)
  // DATE (YYYY-MM-DD)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return { y: +m[1], m: +m[2], d: +m[3] }

  // ISO/Timestamp
  const ms = +new Date(s)
  if (!Number.isFinite(ms)) return null
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = Object.fromEntries(dtf.formatToParts(new Date(ms)).map(p => [p.type, p.value]))
  return { y: +parts.year, m: +parts.month, d: +parts.day }
}

/** Offset der Ziel-TZ (in ms) an einem UTC-Instant */
function tzOffsetMsAt(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map(p => [p.type, p.value]))
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second
  )
  return asUTC - utcMs // z. B. +7200000 bei UTC+2
}

/** Start des Tages 00:00:00.000 in TZ -> als UTC-Instant (DST-korrekt) */
function zonedStartOfDayUTC(y: number, m: number, d: number, timeZone: string): Date {
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0)
  const off1 = tzOffsetMsAt(utcMidnight, timeZone)
  let inst = utcMidnight - off1 // Kandidat
  const off2 = tzOffsetMsAt(inst, timeZone)
  if (off2 !== off1) inst = utcMidnight - off2 // bei DST-Grenze korrigieren
  return new Date(inst)
}

/* -------------------- Handler -------------------- */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    // 🔧 Wichtig: params awaiten (Next.js 15)
    const { id: requestId } = await params
    if (!requestId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    let body: any = {}
    try {
      body = await _req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // beide Varianten akzeptieren
    const itemCents = toInt(body.item_amount_cents ?? body.itemAmountCents, NaN)
    const shipCents = toInt((body.shipping_cents ?? body.shippingCents) ?? 0, NaN)

    if (!Number.isFinite(itemCents) || itemCents <= 0) {
      return NextResponse.json({ error: 'itemAmountCents invalid', field: 'item_amount_cents' }, { status: 400 })
    }
    if (!Number.isFinite(shipCents) || shipCents < 0) {
      return NextResponse.json({ error: 'shippingCents invalid', field: 'shipping_cents' }, { status: 400 })
    }

    // 50%-Regel: Versand <= 50% vom Artikelpreis
    if (shipCents > Math.floor(itemCents * 0.5)) {
      return NextResponse.json(
        { error: 'SHIPPING_TOO_HIGH', field: 'shipping_cents' },
        { status: 400 }
      )
    }

    const currency = String(body.currency || 'eur').toLowerCase()
    const message = typeof body.message === 'string' ? body.message : null

    const admin = supabaseAdmin()

    // Anfrage prüfen (Lieferdatum mitladen!)
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('id, owner_id, status, published, lieferdatum')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 })
    if (!reqRow) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (reqRow.owner_id === user.id) return NextResponse.json({ error: 'OWN_REQUEST' }, { status: 400 })
    if (reqRow.published === false || (reqRow.status && reqRow.status !== 'open')) {
      return NextResponse.json({ error: 'Request not available' }, { status: 400 })
    }

    // Connect-Gate
    const { data: prof } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', user.id)
      .maybeSingle()

    let connectId = prof?.stripe_connect_id as string | undefined

    const needsOnboard = async () => {
      const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').replace(/\/$/, '')
      const link = await stripe.accountLinks.create({
        account: connectId!,
        type: 'account_onboarding',
        refresh_url: `${base}/konto/einstellungen?connect=1`,
        return_url: `${base}/konto/einstellungen?connect=1`,
      })
      return link.url
    }

    if (!connectId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        metadata: { profile_id: user.id },
      })
      connectId = acct.id
      await admin.from('profiles').update({ stripe_connect_id: connectId }).eq('id', user.id)
      const url = await needsOnboard()
      return NextResponse.json({ error: 'ONBOARDING_REQUIRED', onboardUrl: url }, { status: 409 })
    } else {
      const acct = await stripe.accounts.retrieve(connectId)
      const ready = !!((acct as any)?.payouts_enabled && (acct as any)?.charges_enabled)
      if (!ready) {
        const url = await needsOnboard()
        return NextResponse.json({ error: 'ONBOARDING_REQUIRED', onboardUrl: url }, { status: 409 })
      }
    }

    /* -------- Angebotsexpiry korrekt berechnen --------
       Regel: expires_at = min(now+72h, Ende des Vortags des Lieferdatums in Europe/Vienna)
       Wenn final <= now -> Angebot ablehnen (wäre sofort abgelaufen).
    */
    const nowMs = Date.now()
    const plus72Ms = nowMs + 72 * 3_600_000

    let capMs: number | null = null
    const ymd = toViennaYMD(reqRow.lieferdatum)
    if (ymd) {
      const deliveryStartUTC = zonedStartOfDayUTC(ymd.y, ymd.m, ymd.d, 'Europe/Vienna') // 00:00 Vienna -> UTC
      capMs = deliveryStartUTC.getTime() - 1 // Ende Vortag 23:59:59.999 Vienna -> UTC
    }

    let finalMs = plus72Ms
    if (capMs != null) finalMs = Math.min(finalMs, capMs)

    if (finalMs <= nowMs) {
      return NextResponse.json(
        { error: 'Angebote können nur bis zum Vortag des Lieferdatums abgegeben werden', reason: 'Gültig nur bis zum Vortag des Lieferdatums.' },
        { status: 400 }
      )
    }

    const expiresAt = new Date(finalMs).toISOString()

    // Angebot anlegen – WICHTIG: alle drei Beträge setzen
    const ins = await admin
      .from('lack_offers')
      .insert({
        request_id: requestId,
        supplier_id: user.id,        // Verkäufer (auth.users.id)
        vendor_id: reqRow.owner_id,  // Käufer (profiles.id)
        status: 'active',
        expires_at: expiresAt,       // <-- jetzt korrekt gekappt
        currency,
        message,

        // Beträge
        item_amount_cents: itemCents,
        shipping_cents: shipCents,
        amount_cents: itemCents + shipCents,
      })
      .select('id')
      .single()

    if (ins.error) {
      if (String(ins.error.code) === '23505') {
        return NextResponse.json({ error: 'ALREADY_OFFERED' }, { status: 409 })
      }
      return NextResponse.json({ error: ins.error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offerId: ins.data.id }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
