// src/app/api/promo/webhook/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const nowISO = () => new Date().toISOString()
const parseSecrets = (...vars: (string | undefined)[]) =>
  Array.from(new Set(vars.flatMap(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []))))

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

async function applyPromoForRequestOnce(admin: any, opts: {
  requestId: string; packageCodes: string[]; fingerprint: string
}) {
  const { requestId, packageCodes, fingerprint } = opts
  if (!requestId || packageCodes.length === 0 || !fingerprint) return

  const { data: reqRow, error: reqErr } = await admin
    .from('lack_requests')
    .select('id,promo_score,data')
    .eq('id', requestId)
    .maybeSingle()
  if (reqErr) throw reqErr
  if (!reqRow) return

  const curData  = (reqRow.data ?? {}) as any
  const applied: string[] = Array.isArray(curData.promo_applied_fingerprints)
    ? curData.promo_applied_fingerprints : []
  if (applied.includes(fingerprint)) return

  const { data: pkgs, error: pkgErr } = await admin
    .from('promo_packages')
    .select('code,label,score_delta')
    .in('code', packageCodes)
  if (pkgErr) throw pkgErr

  const list = pkgs ?? []
  const totalScore = list.reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0)
  const badgeTitles = list.map((p: any) => p.label || p.code).filter(Boolean)

  const curScore = Number(reqRow.promo_score ?? 0)
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
        promo_applied_fingerprints: [...applied, fingerprint],
        promo_last_purchase_at: nowISO(),
      },
      updated_at: nowISO(),
    })
    .eq('id', requestId)
  if (upErr) throw upErr
}

// REPLACE your current upsertOrderFromSession with this version
async function upsertOrderFromSession(
  admin: any,
  sess: Stripe.Checkout.Session,
  status: 'paid' | 'failed',
  requestIdArg?: string | null,
  buyerIdArg?: string | null,
  packageCodesCsvArg?: string | null,
): Promise<{ justPaid: boolean }> {
  // 1) Immer aus der Session lesen (robust gegen fehlende Args)
  const requestId = (requestIdArg || (sess.metadata?.request_id as string) || '').trim();
  const packageCodesCsv = (packageCodesCsvArg || (sess.metadata?.package_ids as string) || '').trim();
  const buyerId = (buyerIdArg || (sess.metadata?.user_id as string) || '').trim();

  const piId =
    typeof sess.payment_intent === 'string'
      ? sess.payment_intent
      : (sess.payment_intent as any)?.id ?? null;

  const amountTotal = typeof sess.amount_total === 'number' ? sess.amount_total : null;
  const currency = (sess.currency || 'eur').toString().toLowerCase();

  // 2) Bereits vorhandene Order aktualisieren (per session_id)
  const { data: existing, error: findErr } = await admin
    .from('promo_orders')
    .select('id,status')
    .eq('stripe_session_id', sess.id)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing?.id) {
    const wasPaid = existing.status === 'paid';
    const patch: any = { updated_at: nowISO(), currency };
    if (piId) patch.stripe_payment_intent = piId;
    if (amountTotal != null) patch.amount_cents = amountTotal;
    if (!wasPaid) patch.status = status;

    const { error: upErr } = await admin.from('promo_orders').update(patch).eq('id', existing.id);
    if (upErr) throw upErr;

    return { justPaid: !wasPaid && status === 'paid' };
  }

  // 3) Oder per PaymentIntent
  if (piId) {
    const { data: byPi, error: findPiErr } = await admin
      .from('promo_orders')
      .select('id,status')
      .eq('stripe_payment_intent', piId)
      .maybeSingle();
    if (findPiErr) throw findPiErr;

    if (byPi?.id) {
      const wasPaid = byPi.status === 'paid';
      const patch: any = { updated_at: nowISO(), currency };
      if (amountTotal != null) patch.amount_cents = amountTotal;
      if (!wasPaid) patch.status = status;

      const { error: upErr } = await admin.from('promo_orders').update(patch).eq('id', byPi.id);
      if (upErr) throw upErr;

      return { justPaid: !wasPaid && status === 'paid' };
    }
  }

  // 4) Neu anlegen – nur wenn wir die Metadaten haben
  if (!requestId || !buyerId || !packageCodesCsv) {
    // <<< WICHTIG: hier NICHT mehr silent returnen, sondern loggen
    console.error('[promo-webhook] missing metadata on session insert', {
      requestId, buyerId, packageCodesCsv, sessId: sess.id
    });
    return { justPaid: false };
  }

  let score = 0;
  let amount = amountTotal ?? 0;

  if (amountTotal == null || status === 'paid') {
    const codes = packageCodesCsv.split(',').map(s => s.trim()).filter(Boolean);
    const { data: pkgs, error: pkgErr } = await admin
      .from('promo_packages')
      .select('amount_cents,score_delta')
      .in('code', codes);
    if (pkgErr) throw pkgErr;

    const list = pkgs ?? [];
    if (amountTotal == null) amount = list.reduce((s: number, p: any) => s + Number(p.amount_cents || 0), 0);
    score = list.reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0);
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
  } as any);
  if (insErr) throw insErr;

  return { justPaid: status === 'paid' };
}


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

  const { data: existing, error: findErr } = await admin
    .from('promo_orders')
    .select('id,status')
    .eq('stripe_payment_intent', pi.id)
    .maybeSingle()
  if (findErr) throw findErr

  if (existing?.id) {
    const wasPaid = existing.status === 'paid'
    const patch: any = { updated_at: nowISO(), currency }
    if (amount != null) patch.amount_cents = amount
    if (!wasPaid) patch.status = status
    const { error: upErr } = await admin.from('promo_orders').update(patch).eq('id', existing.id)
    if (upErr) throw upErr
    return { justPaid: !wasPaid && status === 'paid', requestId: requestId || null, codesCsv: codesCsv || null }
  }

  if (!requestId || !buyerId || !codesCsv) {
    return { justPaid: false, requestId: null, codesCsv: null }
  }

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
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Stripe Secret fehlt' }, { status: 500 })
  const stripe = new Stripe(secretKey)

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(process.env.STRIPE_WEBHOOK_SECRET_PROMO, process.env.STRIPE_WEBHOOK_SECRET_TEST)
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
    console.error('[promo-webhook] invalid signature:', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  let admin: any
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo-webhook] supabase init failed:', (e as any)?.message)
    return NextResponse.json({ error: 'DB nicht verfügbar' }, { status: 500 })
  }

  try {
    if (await wasProcessed(event.id as string, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo-webhook] dedup check failed:', (e as any)?.message)
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const sess = event.data.object as Stripe.Checkout.Session
      const requestId = (sess.metadata?.request_id ?? '') as string
      const codesCsv  = (sess.metadata?.package_ids ?? '') as string
      const buyerId   = (sess.metadata?.user_id ?? '') as string

      const { justPaid } = await upsertOrderFromSession(admin, sess, 'paid', requestId || null, buyerId || null, codesCsv || null)

      if (justPaid && requestId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
        await applyPromoForRequestOnce(admin, { requestId, packageCodes: codes, fingerprint: sess.id })
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
        await applyPromoForRequestOnce(admin, { requestId, packageCodes: codes, fingerprint: pi.id })
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

    await markProcessed(event.id as string, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo-webhook] handler failed:', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
