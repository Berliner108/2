import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY fehlt' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: 100, // 1,00 €
          product_data: { name: 'Selftest • Promo Checkout' },
        },
        quantity: 1,
      }],
      success_url: `${origin}/?selftest=success&sid={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/?selftest=cancel`,
      metadata: { selftest: '1' },
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: 'Selftest fehlgeschlagen', details: e?.message }, { status: 500 })
  }
}
