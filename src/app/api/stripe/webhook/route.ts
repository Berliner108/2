// /src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !whSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  const rawBody = await req.text() // RAW body, kein JSON-parse!
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
        const pi = event.data.object as {
          id: string
          metadata?: Record<string, string>
          latest_charge?: string | { id: string }
        }
        const orderId = pi.metadata?.order_id
        const lackId  = pi.metadata?.lack_request_id || pi.metadata?.request_id
        if (!orderId) break

        let chargeId: string | null = null
        if (typeof pi.latest_charge === 'string') chargeId = pi.latest_charge
        else if (pi.latest_charge && typeof (pi.latest_charge as any).id === 'string') {
          chargeId = (pi.latest_charge as any).id
        }

        // Order auf succeeded
        {
          const { error } = await admin
            .from('orders')
            .update({
              status: 'succeeded',
              payment_intent_id: pi.id,
              charge_id: chargeId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .in('status', ['processing']) // schützt vor Doppelverarbeitung
          if (error) throw error
        }

        // Anfrage auf paid
        if (lackId) {
          const { error } = await admin
            .from('lack_requests')
            .update({ status: 'paid' })
            .eq('id', lackId)
          if (error) throw error
        }
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
          .in('status', ['processing'])
        if (error) throw error

        // Optional: lack_requests bei Abbruch wieder öffnen:
        // const lackId = pi.metadata?.lack_request_id || pi.metadata?.request_id
        // if (lackId) await admin.from('lack_requests').update({ status: 'accepted' }).eq('id', lackId)

        break
      }

      case 'charge.refunded': {
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

      // Optional:
      case 'transfer.failed': {
        const tr = event.data.object as { id: string }
        console.warn('[stripe webhook] transfer.failed', tr.id)
        break
      }

      default:
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe webhook] handler failed', event?.type, err?.message)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
