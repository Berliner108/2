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

// Idempotenz – best-effort, falls Tabelle fehlt
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

/** Promo-Score erhöhen + Badges mergen (nur einmal pro Zahlung) */
async function applyPromoForRequest(
  admin: any,
  requestId: string,
  packageCodes: string[],
) {
  if (!requestId || packageCodes.length === 0) return

  const { data: pkgs, error: pkgErr } = await admin
    .from('promo_packages')
    .select('code,label,score_delta')
    .in('code', packageCodes)
  if (pkgErr) throw pkgErr

  const list = pkgs ?? []
  const totalScore = list.reduce((sum: number, p: any) => sum + Number(p.score_delta || 0), 0)
  const badgeTitles = list.map((p: any) => p.label || p.code).filter(Boolean)

  if (totalScore <= 0 && badgeTitles.length === 0) return

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
      data: { ...curData, gesponsert: true, promo_badges: mergedBadges, promo_last_purchase_at: nowISO() },
      updated_at: nowISO(),
    })
    .eq('id', requestId)
  if (upErr) throw upErr
}

/** Upsert über Checkout-Session. Liefert true zurück, wenn der Status neu auf "paid" gewechselt hat. */
async function upsertOrderFromSession(
  admin: any,
  sess: Stripe.Checkout.Session,
  status: 'paid' | 'failed',
  requestId?: string | null,
  buyerId?: string | null,
  packageCodesCsv?: string | null,
): Promise<{ justPaid: boolean }> {
  const piId =
    typeof sess.payment_intent === 'string'
      ? sess.payment_intent
      : (sess.payment_intent as any)?.id ?? null

  const amountTotal = typeof sess.amount_total === 'number' ? sess.amount_total : null
  const currency = (sess.currency || 'eur').toString().toLowerCase()

  // 1) versuchen per Session zu finden
  const { data: existingBySession, error: findSessErr } = await admin
    .from('promo_orders')
    .select('id,status')
    .eq('stripe_session_id', sess.id)
    .maybeSingle()
  if (findSessErr) throw findSessErr

  if (existingBySession?.id) {
    const wasPaid = existingBySession.status === 'paid'
    const next: any = {
      stripe_payment_intent: piId,
      updated_at: nowISO(),
      currency,
    }
    if (amountTotal != null) next.amount_cents = amountTotal
    if (!wasPaid) next.status = status  // nur upgraden, paid bleibt paid

    const { error: upErr } = await admin
      .from('promo_orders')
      .update(next)
      .eq('id', existingBySession.id)
    if (upErr) throw upErr

    return { justPaid: !wasPaid && status === 'paid' }
  }

  // 2) sonst per PaymentIntent versuchen (duplikate vermeiden)
  if (piId) {
    const { data: existingByPi, error: findPiErr } = await admin
      .from('promo_orders')
      .select('id,status')
      .eq('stripe_payment_intent', piId)
      .maybeSingle()
    if (findPiErr) throw findPiErr

    if (existingByPi?.id) {
      const wasPaid = existingByPi.status === 'paid'
      const next: any = {
        updated_at: nowISO(),
        currency,
      }
      if (amountTotal != null) next.amount_cents = amountTotal
      if (!wasPaid) next.status = status

      const { error: upErr } = await admin
        .from('promo_orders')
        .update(next)
        .eq('id', existingByPi.id)
      if (upErr) throw upErr

      return { justPaid: !wasPaid && status === 'paid' }
    }
  }

  // 3) Einfügen, wenn wir genug Metadaten haben
  if (!requestId || !buyerId || !packageCodesCsv) return { justPaid: false }

  // Fallback-Beträge aus Paketen, falls amount_total fehlt
  let amount = amountTotal ?? 0
  let score = 0
  if (amountTotal == null || status === 'paid') {
    const codes = packageCodesCsv.split(',').map(s => s.trim()).filter(Boolean)
    const { data: pkgs, error: pkgErr } = await admin
      .from('promo_packages')
      .select('amount_cents,score_delta')
      .in('code', codes)
    if (pkgErr) throw pkgErr
    const list = pkgs ?? []
    if (amountTotal == null) amount = list.reduce((s: number, p: any) => s + Number(p.amount_cents || 0), 0)
    score = list.reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0)
  }

  const { error: insErr } = await admin.from('promo_orders').insert({
    request_id: requestId,
    buyer_id: buyerId,
    package_code: packageCodesCsv,
    score_delta: score,
    amount_cents: amount,
    currency,
    stripe_session_id: sess.id,
    stripe_payment_intent: piId,
    status,
    created_at: nowISO(),
    updated_at: nowISO(),
  } as any)
  if (insErr) throw insErr

  return { justPaid: status === 'paid' }
}

/** Upsert nur über PaymentIntent. Liefert true zurück, wenn neu auf "paid" gewechselt. */
async function upsertOrderFromPaymentIntent(
  admin: any,
  pi: Stripe.PaymentIntent,
  status: 'paid' | 'failed',
): Promise<{ justPaid: boolean, requestId: string | null, codesCsv: string | null }> {
  const requestId = (pi.metadata?.request_id ?? '') as string
  const codesCsv  = (pi.metadata?.package_ids ?? '') as string
  const buyerId   = (pi.metadata?.user_id ?? '') as string
  const currency  = (pi.currency || 'eur').toString().toLowerCase()
  const amount    = typeof pi.amount_received === 'number' ? pi.amount_received : null

  // vorhandene Order per PI?
  const { data: existing, error: findErr } = await admin
    .from('promo_orders')
    .select('id,status')
    .eq('stripe_payment_intent', pi.id)
    .maybeSingle()
  if (findErr) throw findErr

  if (existing?.id) {
    const wasPaid = existing.status === 'paid'
    const next: any = { updated_at: nowISO(), currency }
    if (amount != null) next.amount_cents = amount
    if (!wasPaid) next.status = status

    const { error: upErr } = await admin
      .from('promo_orders')
      .update(next)
      .eq('id', existing.id)
    if (upErr) throw upErr

    return { justPaid: !wasPaid && status === 'paid', requestId: requestId || null, codesCsv: codesCsv || null }
  }

  // Neu anlegen (falls genug Metadaten)
  if (!requestId || !buyerId || !codesCsv) {
    return { justPaid: false, requestId: null, codesCsv: null }
  }

  // Fallbacks aus Paketen
  const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
  const { data: pkgs } = await admin
    .from('promo_packages')
    .select('amount_cents,score_delta')
    .in('code', codes)
  const list = pkgs ?? []
  const fallbackAmount = list.reduce((s: number, p: any) => s + Number(p.amount_cents || 0), 0)
  const totalScore     = list.reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0)

  await admin.from('promo_orders').insert({
    request_id: requestId,
    buyer_id: buyerId,
    package_code: codesCsv,
    score_delta: totalScore,
    amount_cents: amount ?? fallbackAmount ?? 0,
    currency,
    stripe_session_id: null,
    stripe_payment_intent: pi.id,
    status,
    created_at: nowISO(),
    updated_at: nowISO(),
  } as any)

  return { justPaid: status === 'paid', requestId, codesCsv }
}

export async function POST(req: Request) {
  // 1) Stripe + Signatur
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Stripe Secret fehlt' }, { status: 500 })
  const stripe = new Stripe(secretKey)

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(process.env.STRIPE_WEBHOOK_SECRET_PROMO, process.env.STRIPE_WEBHOOK_SECRET_TEST)
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  const rawBody = await req.text()

  // 2) Event verifizieren
  let event: Stripe.Event
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
    console.error('[promo-webhook] invalid signature:', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  // 3) Supabase
  let admin: any
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo-webhook] supabase init failed:', (e as any)?.message)
    return NextResponse.json({ error: 'DB nicht verfügbar' }, { status: 500 })
  }

  // 4) Idempotenz per Event-ID
  try {
    if (await wasProcessed(event.id as string, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo-webhook] dedup check failed:', (e as any)?.message)
  }

  // 5) Handler – Score nur beim Übergang auf "paid"
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const sess = event.data.object as Stripe.Checkout.Session
      const requestId = (sess.metadata?.request_id ?? '') as string
      const codesCsv  = (sess.metadata?.package_ids ?? '') as string
      const buyerId   = (sess.metadata?.user_id ?? '') as string

      const { justPaid } = await upsertOrderFromSession(admin, sess, 'paid', requestId || null, buyerId || null, codesCsv || null)

      if (justPaid && requestId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
        await applyPromoForRequest(admin, requestId, codes)
      }

      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
      const sess = event.data.object as Stripe.Checkout.Session
      await upsertOrderFromSession(admin, sess, 'failed')
      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const { justPaid, requestId, codesCsv } = await upsertOrderFromPaymentIntent(admin, pi, 'paid')

      if (justPaid && requestId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
        await applyPromoForRequest(admin, requestId, codes)
      }

      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      await upsertOrderFromPaymentIntent(admin, pi, 'failed')
      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    // alles andere ignorieren
    await markProcessed(event.id as string, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo-webhook] handler failed:', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
