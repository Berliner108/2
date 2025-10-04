// src/app/api/stripe/promo-webhook/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** utils */
const nowISO = () => new Date().toISOString()
const parseSecrets = (...vars: (string | undefined)[]) =>
  Array.from(new Set(vars.flatMap(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []))))

// Idempotenz – wenn du die Tabelle nicht hast, sind das "best effort" No-Ops
async function wasProcessed(id: string, admin: any) {
  try {
    const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
    return !!data
  } catch { return false }
}
async function markProcessed(id: string, admin: any) {
  try {
    const { error } = await admin.from('processed_events').insert({ id })
    if (error && (error as any).code !== '23505') throw error
  } catch {}
}

function constructEventWithFallback(stripe: Stripe, rawBody: string, sig: string, secrets: string[]) {
  let lastErr: any
  for (const sec of secrets) {
    try { return stripe.webhooks.constructEvent(rawBody, sig, sec) }
    catch (e) { lastErr = e }
  }
  throw lastErr
}

/** Promo-Score erhöhen + Badges mergen */
async function applyPromoForRequest(
  admin: any,
  requestId: string,
  packageCodes: string[],
) {
  if (!requestId || packageCodes.length === 0) return

  // Pakete laden (deine Spaltennamen!)
  const { data: pkgs, error: pkgErr } = await admin
    .from('promo_packages')
    .select('code,label,score_delta')
    .in('code', packageCodes)
  if (pkgErr) throw pkgErr

  const list = pkgs ?? []
  const totalScore = list.reduce((sum: number, p: any) => sum + Number(p.score_delta || 0), 0)
  const badgeTitles = list.map((p: any) => p.label || p.code).filter(Boolean)

  if (totalScore <= 0 && badgeTitles.length === 0) return

  // Anfrage lesen
  const { data: reqRow, error: reqErr } = await admin
    .from('lack_requests')
    .select('id,promo_score,data')
    .eq('id', requestId)
    .maybeSingle()
  if (reqErr) throw reqErr
  if (!reqRow) return

  const curScore = Number(reqRow.promo_score ?? 0)
  const curData  = (reqRow.data ?? {}) as any
  const curBadges: string[] = Array.isArray(curData.promo_badges) ? curData.promo_badges : []
  const mergedBadges = Array.from(new Set([...curBadges, ...badgeTitles]))

  const { error: upErr } = await admin
    .from('lack_requests')
    .update({
      promo_score: curScore + totalScore,
      data: {
        ...curData,
        gesponsert: true,
        promo_badges: mergedBadges,
        promo_last_purchase_at: nowISO(),
      },
      updated_at: nowISO(),
    })
    .eq('id', requestId)
  if (upErr) throw upErr
}

/** promo_orders auf "paid" setzen oder (falls nicht vorhanden) anlegen */
async function upsertOrderPaidFromSession(
  admin: any,
  sess: Stripe.Checkout.Session,
  requestId: string | null,
  buyerId: string | null,
  packageCodesCsv: string | null,
) {
  const piId =
    typeof sess.payment_intent === 'string'
      ? sess.payment_intent
      : (sess.payment_intent as any)?.id ?? null

  const amountTotal = typeof sess.amount_total === 'number' ? sess.amount_total : null
  const currency = (sess.currency || 'eur').toString().toLowerCase()

  // 1) Wenn es bereits eine Zeile mit dieser Session gibt → auf paid updaten
  const { data: existing, error: findErr } = await admin
    .from('promo_orders')
    .select('id')
    .eq('stripe_session_id', sess.id)
    .maybeSingle()
  if (findErr) throw findErr

  if (existing?.id) {
    const { error: upErr } = await admin
      .from('promo_orders')
      .update({
        status: 'paid',
        stripe_payment_intent: piId,
        amount_cents: amountTotal ?? undefined,
        currency,
        updated_at: nowISO(),
      })
      .eq('id', existing.id)
    if (upErr) throw upErr
    return
  }

  // 2) Sonst neue Zeile anlegen (Fallback – wenn beim Checkout keine Row erzeugt wurde)
  if (!requestId || !buyerId || !packageCodesCsv) return

  // Summen zur Sicherheit aus Paketen berechnen (falls amount_total null ist)
  const codes = packageCodesCsv.split(',').map(s => s.trim()).filter(Boolean)
  const { data: pkgs2, error: pkgErr2 } = await admin
    .from('promo_packages')
    .select('code,score_delta,amount_cents')
    .in('code', codes)
  if (pkgErr2) throw pkgErr2

  const totalScore = (pkgs2 ?? []).reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0)
  const totalCents = (pkgs2 ?? []).reduce((s: number, p: any) => s + Number(p.amount_cents || 0), 0)

  const { error: insErr } = await admin.from('promo_orders').insert({
    request_id: requestId,
    buyer_id: buyerId,
    package_code: packageCodesCsv,         // CSV (passt zu deiner Spalte)
    score_delta: totalScore,
    amount_cents: amountTotal ?? totalCents ?? 0,
    currency,
    stripe_session_id: sess.id,
    stripe_payment_intent: piId,
    status: 'paid',
    created_at: nowISO(),
    updated_at: nowISO(),
  } as any)
  if (insErr) throw insErr
}

export async function POST(req: Request) {
  // 1) Stripe + Signatur prüfen
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Stripe Secret fehlt' }, { status: 500 })
  const stripe = new Stripe(secretKey)

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(process.env.STRIPE_WEBHOOK_SECRET_PROMO, process.env.STRIPE_WEBHOOK_SECRET_TEST)
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  // 2) RAW body lesen (wichtig für Signatur)
  const rawBody = await req.text()

  // 3) Event verifizieren
  let event: Stripe.Event
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
    console.error('[promo-webhook] invalid signature:', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  // 4) Supabase Admin
  let admin: any
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo-webhook] supabase init failed:', (e as any)?.message)
    return NextResponse.json({ error: 'DB nicht verfügbar' }, { status: 500 })
  }

  // 5) Idempotenz
  try {
    if (await wasProcessed(event.id as string, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo-webhook] dedup check failed:', (e as any)?.message)
  }

  // 6) Handler
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const sess = event.data.object as Stripe.Checkout.Session

      const requestId = (sess.metadata?.request_id ?? '') as string
      const codesCsv  = (sess.metadata?.package_ids ?? '') as string
      const buyerId   = (sess.metadata?.user_id ?? '') as string

      // promo_score erhöhen
      if (requestId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
        await applyPromoForRequest(admin, requestId, codes)
      }

      // promo_orders auf paid
      await upsertOrderPaidFromSession(admin, sess, requestId || null, buyerId || null, codesCsv || null)

      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    // Optional: falls nur payment_intent-Events ankommen
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const requestId = (pi.metadata?.request_id ?? '') as string
      const codesCsv  = (pi.metadata?.package_ids ?? '') as string
      const buyerId   = (pi.metadata?.user_id ?? '') as string

      if (requestId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
        await applyPromoForRequest(admin, requestId, codes)
      }

      // promo_orders: hier haben wir keine Session-ID, aber die Intent-ID
      // Wir legen – wenn nötig – einen Datensatz mit Intent an.
      if (requestId && buyerId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
        const { data: pkgs } = await admin
          .from('promo_packages')
          .select('code,score_delta,amount_cents')
          .in('code', codes)

        const totalScore = (pkgs ?? []).reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0)
        const totalCents = (pkgs ?? []).reduce((s: number, p: any) => s + Number(p.amount_cents || 0), 0)

        await admin.from('promo_orders').insert({
          request_id: requestId,
          buyer_id: buyerId,
          package_code: codesCsv,
          score_delta: totalScore,
          amount_cents: typeof pi.amount_received === 'number' ? pi.amount_received : totalCents ?? 0,
          currency: (pi.currency || 'eur').toString().toLowerCase(),
          stripe_session_id: null,
          stripe_payment_intent: pi.id,
          status: 'paid',
          created_at: nowISO(),
          updated_at: nowISO(),
        } as any)
      }

      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    // andere Events ignorieren – aber als verarbeitet markieren
    await markProcessed(event.id as string, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo-webhook] handler failed:', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
