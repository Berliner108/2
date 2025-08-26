// /src/app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs' // wichtig für raw body in app router

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
    return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  const admin = supabaseAdmin()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
      case 'payment_intent.processing': {
        const pi = event.data.object as {
          id: string
          metadata?: Record<string, string>
          latest_charge?: string | { id: string }
        }
        const orderId = pi.metadata?.order_id
        if (!orderId) break

        // charge_id extrahieren
        let chargeId: string | null = null
        if (typeof pi.latest_charge === 'string') chargeId = pi.latest_charge
        else if (pi.latest_charge && typeof (pi.latest_charge as any).id === 'string') chargeId = (pi.latest_charge as any).id

        await admin
          .from('orders')
          .update({
            status: 'succeeded',
            charge_id: chargeId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['processing']) // idempotent: nur wenn noch „offen“
        break
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object as { id: string; metadata?: Record<string, string> }
        const orderId = pi.metadata?.order_id
        if (!orderId) break

        await admin
          .from('orders')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['processing']) // nur offene Orders zurücksetzen
        break
      }

      case 'charge.refunded': {
        const ch = event.data.object as { id: string }
        // markiere Order als refundet
        await admin
          .from('orders')
          .update({
            refunded_at: new Date().toISOString(),
            status: 'canceled', // oder eigener Status, falls gewünscht
            updated_at: new Date().toISOString(),
          })
          .eq('charge_id', ch.id)
        break
      }

      default:
        // andere Events ignorieren
        break
    }
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[stripe webhook] DB error', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
