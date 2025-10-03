import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** utils */
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

  const rawBody = await req.text()

  // 2) Event verifizieren
  let event: Stripe.Event
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
    console.error('[promo-webhook] invalid signature:', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  // 3) Supabase Admin
  let admin: any
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo-webhook] supabase init failed:', (e as any)?.message)
    return NextResponse.json({ error: 'DB nicht verfügbar' }, { status: 500 })
  }

  // 4) Idempotenz
  try {
    if (await wasProcessed(event.id as string, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo-webhook] dedup check failed:', (e as any)?.message)
  }

  // 5) Handler
  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session
      const requestId = (sess.metadata?.request_id ?? '') as string
      const codesCsv  = (sess.metadata?.package_ids ?? '') as string
      const buyerId   = (sess.metadata?.user_id ?? '') as string

      // a) promo_score auf Anfrage erhöhen
      if (requestId && codesCsv) {
        const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)

        // Pakete lesen → score sum
        const { data: pkgs, error: pkgErr } = await admin
          .from('promo_packages')
          .select('code,title,score_delta')
          .in('code', codes)
        if (pkgErr) throw pkgErr

        const totalScore = (pkgs ?? []).reduce((sum: number, p: any) => sum + Number(p.score_delta || 0), 0)

        if (totalScore > 0) {
          const { data: reqRow, error: reqErr } = await admin
            .from('lack_requests')
            .select('id,promo_score,data')
            .eq('id', requestId)
            .maybeSingle()
          if (reqErr) throw reqErr
          if (reqRow) {
            const curScore = Number(reqRow.promo_score ?? 0)
            const curData  = (reqRow.data ?? {}) as any
            const existingBadges: string[] = Array.isArray(curData.promo_badges) ? curData.promo_badges : []
            const newBadges = Array.from(new Set([
              ...existingBadges,
              ...((pkgs ?? []).map((p: any) => p.title || p.code))
            ]))

            const { error: upErr } = await admin
              .from('lack_requests')
              .update({
                promo_score: curScore + totalScore,
                data: { ...curData, gesponsert: true, promo_badges: newBadges, promo_last_purchase_at: nowISO() },
                updated_at: nowISO(),
              })
              .eq('id', requestId)
            if (upErr) throw upErr
          }
        }
      }

      // b) promo_orders: vorhandene Order (created) auf paid updaten
      const piId =
        typeof sess.payment_intent === 'string'
          ? sess.payment_intent
          : (sess.payment_intent as any)?.id ?? null

      const amount_total = typeof sess.amount_total === 'number' ? sess.amount_total : null
      const currency = (sess.currency || 'eur').toString().toLowerCase()

      // Erst versuchen zu updaten (normaler Pfad)
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
            amount_cents: amount_total ?? undefined,
            currency,
            updated_at: nowISO(),
          })
          .eq('id', existing.id)
        if (upErr) throw upErr
      } else {
        // Fallback (ältere Sessions, bei denen keine Row angelegt wurde)
        if (requestId && buyerId && codesCsv) {
          // Summe aus Paketen berechnen
          const codes = codesCsv.split(',').map(s => s.trim()).filter(Boolean)
          const { data: pkgs2 } = await admin
            .from('promo_packages')
            .select('code,score_delta,price_cents')
            .in('code', codes)

          const totalScore = (pkgs2 ?? []).reduce((s: number, p: any) => s + Number(p.score_delta || 0), 0)
          const totalCents = (pkgs2 ?? []).reduce((s: number, p: any) => s + Number(p.price_cents || 0), 0)

          const { error: insErr } = await admin.from('promo_orders').insert({
            request_id: requestId,
            buyer_id: buyerId,
            package_code: codesCsv,
            score_delta: totalScore,
            amount_cents: amount_total ?? totalCents ?? 0,
            currency,
            stripe_session_id: sess.id,
            stripe_payment_intent: piId,
            status: 'paid',
          } as any)
          if (insErr) throw insErr
        }
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
