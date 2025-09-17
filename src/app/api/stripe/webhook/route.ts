// /src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function nowISO() { return new Date().toISOString() }
function addDaysISO(days: number) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString() }

function getChargeIdFromPI(pi: any): string | null {
  if (!pi) return null
  const lc = (pi as any).latest_charge
  if (typeof lc === 'string') return lc
  if (lc && typeof lc.id === 'string') return lc.id
  return null
}

// mehrere Secrets erlauben (Plattform, Connect, Test) – Komma-getrennte Werte möglich
function parseSecrets(...vars: (string | undefined)[]): string[] {
  const out: string[] = []
  for (const v of vars) {
    if (!v) continue
    for (const s of v.split(',').map(x => x.trim()).filter(Boolean)) out.push(s)
  }
  return Array.from(new Set(out))
}

// Versucht Secrets der Reihe nach (z.B. LIVE-Plattform → LIVE-Connect → TEST)
function constructEventWithFallback(stripe: any, rawBody: string, sig: string, secrets: string[]) {
  let lastErr: any
  for (const sec of secrets) {
    try { return stripe.webhooks.constructEvent(rawBody, sig, sec) }
    catch (e) { lastErr = e }
  }
  throw lastErr
}

// --- Idempotenz-Helper (nutzt Tabelle processed_events) ---
async function wasProcessed(id: string, admin: any) {
  const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
  return !!data
}
async function markProcessed(id: string, admin: any) {
  const { error } = await admin.from('processed_events').insert({ id })
  if (error && (error as any).code !== '23505') throw error // Duplicate ignorieren
}

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe ist nicht konfiguriert' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(
    process.env.STRIPE_WEBHOOK_SECRET,          // Plattform (LIVE)
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT,  // Connect (LIVE)
    process.env.STRIPE_WEBHOOK_SECRET_TEST      // optional: TEST
  )

  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  // Roh-Body für Signaturprüfung (App Router: text() ist korrekt)
  const rawBody = await req.text()

  let event: any
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
    console.error('[stripe webhook] ungültige Signatur', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  if (process.env.LOG_STRIPE_EVENTS === '1') {
    console.log('[stripe webhook]', event.type, event.id, event.account ?? '(platform)')
  }

  let admin
  try {
    admin = supabaseAdmin()
  } catch (e) {
    console.error('[stripe webhook] Supabase-Admin-Init fehlgeschlagen', e)
    return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 })
  }

  // Idempotenz – ggf. direkt beenden
  try {
    if (await wasProcessed(event.id, admin)) {
      if (process.env.LOG_STRIPE_EVENTS === '1') console.log('[stripe webhook] dedup', event.id)
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[stripe webhook] Idempotenz-Check fehlgeschlagen', (e as any)?.message)
  }

  try {
    switch (event.type) {
      /** ==================== CONNECT: ACCOUNT-STATUS ==================== */
      case 'account.updated': {
        const acct = event.data.object as {
          id: string
          details_submitted?: boolean
          charges_enabled?: boolean
          payouts_enabled?: boolean
        }
        const detailsSubmitted = !!acct.details_submitted
        const payoutsEnabled  = !!acct.payouts_enabled
        const ready = detailsSubmitted && payoutsEnabled

        await admin
          .from('profiles')
          .update({
            connect_ready: ready,
            payouts_enabled: payoutsEnabled,
            connect_checked_at: nowISO(),
            updated_at: nowISO(),
          })
          .or(`stripe_account_id.eq.${acct.id},stripe_connect_id.eq.${acct.id}`)
        break
      }

      case 'account.application.deauthorized': {
        const acctId: string | undefined =
          event.account || (event.data?.object?.id as string | undefined)
        if (acctId) {
          await admin
            .from('profiles')
            .update({
              connect_ready: false,
              payouts_enabled: false,
              connect_checked_at: nowISO(),
              updated_at: nowISO(),
            })
            .or(`stripe_account_id.eq.${acctId},stripe_connect_id.eq.${acctId}`)
        }
        break
      }

      /** ==================== ZAHLUNGEN / ORDERS (Plattform-PI) ==================== */
      case 'payment_intent.processing': {
        const pi = event.data.object as { id: string; metadata?: Record<string, string> }
        const orderId = pi.metadata?.order_id
        if (!orderId) break
        const { error } = await admin
          .from('orders')
          .update({ status: 'processing', payment_intent_id: pi.id, updated_at: nowISO() })
          .eq('id', orderId)
        if (error) throw error
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as {
          id: string
          metadata?: Record<string, string>
          latest_charge?: string | { id: string }
        }
        const orderId   = pi.metadata?.order_id
        const offerId   = pi.metadata?.offer_id
        const requestId = pi.metadata?.lack_request_id || pi.metadata?.request_id
        if (!orderId) break

        if (offerId && requestId) {
          await admin.from('lack_offers')
            .update({ status: 'accepted', updated_at: nowISO() })
            .eq('id', offerId)
            .in('status', ['active'])

          await admin.from('lack_offers')
            .update({ status: 'declined', updated_at: nowISO() })
            .eq('request_id', requestId)
            .neq('id', offerId)
            .eq('status', 'active')

          await admin.from('lack_requests')
            .update({ published: false, updated_at: nowISO() })
            .eq('id', requestId)

          await admin.from('lack_requests')
            .update({ status: 'accepted', updated_at: nowISO() })
            .eq('id', requestId)
        }

        const chargeId = getChargeIdFromPI(pi)
        const { error } = await admin.from('orders').update({
          status: 'funds_held',
          payment_intent_id: pi.id,
          charge_id: chargeId,
          auto_release_at: addDaysISO(28),
          updated_at: nowISO(),
        }).eq('id', orderId)
        if (error) throw error
        break
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object as { id: string; metadata?: Record<string, string> }
        const orderId = pi.metadata?.order_id
        if (!orderId) break
        const { error } = await admin
          .from('orders')
          .update({ status: 'canceled', updated_at: nowISO() })
          .eq('id', orderId)
        if (error) throw error
        break
      }

      case 'charge.refunded': {
        const ch = event.data.object as { id: string }
        const { error } = await admin
          .from('orders')
          .update({ refunded_at: nowISO(), status: 'canceled', updated_at: nowISO() })
          .eq('charge_id', ch.id)
        if (error) throw error
        break
      }

      case 'charge.dispute.created': {
        const ch = event.data.object as { charge: string }
        await admin.from('orders')
          .update({ dispute_opened_at: nowISO(), updated_at: nowISO() })
          .eq('charge_id', ch.charge)
        break
      }

      case 'charge.dispute.closed': {
        const dp = event.data.object as { charge: string }
        await admin.from('orders')
          .update({ updated_at: nowISO() })
          .eq('charge_id', dp.charge)
        break
      }

      case 'transfer.failed': {
        const tr = event.data.object as { id: string }
        console.warn('[stripe webhook] transfer.failed', tr.id)
        await admin.from('orders').update({ updated_at: nowISO() }).eq('transfer_id', tr.id)
        break
      }

      case 'transfer.reversed': {
        const tr = event.data.object as { id: string }
        console.warn('[stripe webhook] transfer.reversed', tr.id)
        await admin.from('orders').update({ updated_at: nowISO() }).eq('transfer_id', tr.id)
        break
      }

      default:
        // nicht relevante Events überspringen
        break
    }

    // Nach erfolgreicher Verarbeitung markieren
    try { await markProcessed(event.id, admin) } catch (e) {
      console.error('[stripe webhook] markProcessed fehlgeschlagen', (e as any)?.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe webhook] Handler fehlgeschlagen', event?.type, err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
