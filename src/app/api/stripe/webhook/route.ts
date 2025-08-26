// /src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // wichtig bei Webhooks

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !whSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  const rawBody = await req.text()
  let event: any
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret)
  } catch (err: any) {
    console.error('[stripe webhook] invalid signature:', err?.message)
    return NextResponse.json({ error: `Invalid signature` }, { status: 400 })
  }

  const admin = supabaseAdmin()

  try {
    switch (event.type) {
      // ===== Zahlungen =====
      case 'payment_intent.processing': {
        const pi = event.data.object as { metadata?: Record<string,string> }
        const orderId = pi.metadata?.order_id
        if (!orderId) break
        await admin
          .from('orders')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['requires_payment', 'processing']) // idempotent
        break
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as any
        const orderId = pi.metadata?.order_id
        if (!orderId) break

        // charge_id extrahieren (robust)
        const chargeId: string | null =
          (pi.latest_charge && typeof pi.latest_charge === 'string' && pi.latest_charge) ||
          (pi.charges?.data?.[0]?.id ?? null)

        await admin
          .from('orders')
          .update({
            status: 'succeeded',
            charge_id: chargeId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['requires_payment', 'processing']) // idempotent
        break
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object as { metadata?: Record<string,string> }
        const orderId = pi.metadata?.order_id
        if (!orderId) break
        await admin
          .from('orders')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['requires_payment', 'processing'])
        break
      }

      // ===== Refunds / Disputes =====
      case 'charge.refunded': {
        const ch = event.data.object as { id: string; metadata?: Record<string,string> }
        // Falls du order_id in die Charge-Metadata schreibst, nutze die – sonst via charge_id matchen.
        const orderId = ch.metadata?.order_id
        if (orderId) {
          await admin
            .from('orders')
            .update({
              status: 'refunded',
              refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
        } else {
          await admin
            .from('orders')
            .update({
              status: 'refunded',
              refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('charge_id', ch.id)
        }
        break
      }

      case 'charge.dispute.created': {
        const ch = event.data.object as { id: string; metadata?: Record<string,string> }
        const orderId = ch.metadata?.order_id
        if (orderId) {
          await admin
            .from('orders')
            .update({
              status: 'disputed',
              dispute_opened_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
        } else {
          await admin
            .from('orders')
            .update({
              status: 'disputed',
              dispute_opened_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('charge_id', ch.id)
        }
        break
      }

      // ===== Transfers (Release der Auszahlung an den Supplier) =====
      case 'transfer.created': {
        const tr = event.data.object as any
        const orderId = tr.metadata?.order_id
        if (!orderId) break
        await admin
          .from('orders')
          .update({
            transfer_id: tr.id,
            transferred_cents: Math.round(tr.amount ?? 0),
            released_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
        break
      }

      case 'transfer.reversed': {
        const tr = event.data.object as any
        const orderId = tr.metadata?.order_id
        if (!orderId) break
        await admin
          .from('orders')
          .update({
            status: 'reversed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
        break
      }

      default: {
        // Optional: zum Debuggen kurz loggen
        // console.log('[stripe webhook] unhandled event', event.type)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe webhook] handler error', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
