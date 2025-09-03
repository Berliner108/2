// /src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function addDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function getChargeIdFromPI(pi: any): string | null {
  if (!pi) return null
  const lc = pi.latest_charge
  if (typeof lc === 'string') return lc
  if (lc && typeof lc.id === 'string') return lc.id
  return null
}

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !whSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  // WICHTIG: raw body verwenden für die Signaturprüfung
  const rawBody = await req.text()
  let event: any
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret)
  } catch (err: any) {
    console.error('[stripe webhook] invalid signature', err?.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (process.env.LOG_STRIPE_EVENTS === '1') {
    console.log('[stripe webhook]', event.type, event.id)
  }

  let admin
  try {
    admin = supabaseAdmin()
  } catch (e) {
    console.error('[stripe webhook] supabase admin init failed', e)
    return NextResponse.json({ error: 'DB unavailable' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.processing': {
        const pi = event.data.object as { id: string; metadata?: Record<string, string> }
        const orderId = pi.metadata?.order_id
        if (!orderId) break

        const { error } = await admin
          .from('orders')
          .update({
            status: 'processing',
            payment_intent_id: pi.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
        if (error) throw error
        break
      }

      case 'payment_intent.succeeded': {
        // Variante B: Zahlung erfasst → Geld liegt bei DIR (Platform-Balance) → späterer Transfer
        const pi = event.data.object as {
          id: string
          metadata?: Record<string, string>
          latest_charge?: string | { id: string }
        }
        const orderId = pi.metadata?.order_id
        if (!orderId) break

        // Offer/Request finalisieren (idempotent)
        const offerId   = pi.metadata?.offer_id
        const requestId = pi.metadata?.lack_request_id || pi.metadata?.request_id

        if (offerId && requestId) {
          // Angenommenes Angebot markieren …
          await admin
            .from('lack_offers')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', offerId)
            .in('status', ['active'])

          // … konkurrierende aktive Angebote ablehnen
          await admin
            .from('lack_offers')
            .update({ status: 'declined', updated_at: new Date().toISOString() })
            .eq('request_id', requestId)
            .neq('id', offerId)
            .eq('status', 'active')

          // Anfrage auf accepted
          await admin
            .from('lack_requests')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', requestId)
        }

        const chargeId = getChargeIdFromPI(pi)

        // Order auf funds_held setzen + charge_id verknüpfen
        const { error } = await admin
          .from('orders')
          .update({
            status: 'funds_held',
            payment_intent_id: pi.id,
            charge_id: chargeId,
            auto_release_at: addDaysISO(28), // ggf. überschreibt vorhandenes – ok für unseren Zweck
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['processing', 'requires_confirmation', 'requires_capture'])
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
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['processing', 'requires_confirmation'])
        if (error) throw error
        break
      }

      case 'charge.refunded': {
        // Volle Rückerstattung → Order schließen
        const ch = event.data.object as { id: string }
        const { error } = await admin
          .from('orders')
          .update({
            refunded_at: new Date().toISOString(),
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('charge_id', ch.id)
        if (error) throw error
        break
      }

      case 'charge.dispute.created': {
        // Kartenstorno/Dispute eröffnet → markieren
        const ch = event.data.object as { charge: string }
        const { error } = await admin
          .from('orders')
          .update({
            dispute_opened_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('charge_id', ch.charge)
        if (error) throw error
        break
      }

      case 'charge.dispute.closed': {
        // Optional: outcome auswerten; Refund käme separat.
        const dp = event.data.object as { charge: string }
        const { error } = await admin
          .from('orders')
          .update({ updated_at: new Date().toISOString() })
          .eq('charge_id', dp.charge)
        if (error) throw error
        break
      }

      case 'transfer.failed': {
        // Auszahlung an Verkäufer fehlgeschlagen → optional markieren
        const tr = event.data.object as { id: string }
        console.warn('[stripe webhook] transfer.failed', tr.id)
        await admin
          .from('orders')
          .update({ updated_at: new Date().toISOString() })
          .eq('transfer_id', tr.id)
        break
      }

      default:
        // andere Events aktuell ignorieren
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe webhook] handler failed', event?.type, err?.message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
