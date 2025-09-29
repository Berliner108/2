// /src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const requestId: string = body?.request_id
    const packageId: string = body?.package_id
    if (!requestId || !packageId) {
      return NextResponse.json({ error: 'request_id und package_id sind erforderlich.' }, { status: 400 })
    }

    const url = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${url.protocol}//${url.host}`

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()

    // Request holen & Ownership prüfen
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('id, owner_id, title')
      .eq('id', requestId)
      .maybeSingle()

    if (reqErr) return NextResponse.json({ error: 'DB error (request)' }, { status: 500 })
    if (!reqRow) return NextResponse.json({ error: 'Anfrage nicht gefunden.' }, { status: 404 })
    if (reqRow.owner_id !== user.id) {
      return NextResponse.json({ error: 'Nur der Besitzer der Anfrage kann sie bewerben.' }, { status: 403 })
    }

    // Paket holen
    const { data: pkg, error: pkgErr } = await admin
      .from('promo_packages')
      .select('id,title,price_cents,score_delta,duration_days,stripe_price_id,active')
      .eq('id', packageId)
      .maybeSingle()

    if (pkgErr) return NextResponse.json({ error: 'DB error (package)' }, { status: 500 })
    if (!pkg || !pkg.active) return NextResponse.json({ error: 'Paket nicht verfügbar.' }, { status: 400 })

    const amount = Number(pkg.price_cents || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Ungültiger Paketpreis.' }, { status: 400 })
    }

    // promo_order anlegen (status: created)
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live'
    const insertPayload = {
      request_id: requestId,
      package_id: pkg.id,
      buyer_id: user.id,
      amount_cents: amount,
      score_delta: Number(pkg.score_delta || 0),
      duration_days: Number(pkg.duration_days || 0),
      status: 'created',
      mode,
    }

    const { data: orderRow, error: insErr } = await admin
      .from('promo_orders')
      .insert(insertPayload)
      .select('id')
      .maybeSingle()

    if (insErr || !orderRow) {
      return NextResponse.json({ error: 'Bestellung konnte nicht angelegt werden.' }, { status: 500 })
    }

    const metadata = {
      promo_order_id: orderRow.id,
      request_id: requestId,
      package_id: pkg.id,
      user_id: user.id,
      score_delta: String(pkg.score_delta ?? 0),
      duration_days: String(pkg.duration_days ?? 0),
    }

    // Checkout-Session erstellen
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/lackanfragen/artikel/${encodeURIComponent(requestId)}?promo=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/lackanfragen/artikel/${encodeURIComponent(requestId)}?promo=cancel`,
      ...(pkg.stripe_price_id
        ? { line_items: [{ price: pkg.stripe_price_id, quantity: 1 }] }
        : {
            line_items: [{
              price_data: {
                currency: 'eur',
                unit_amount: amount,
                product_data: { name: `Bewerbung: ${pkg.title} · Anfrage ${requestId}` },
              },
              quantity: 1,
            }],
          }),
      // WICHTIG: Metadata auch in die PaymentIntent packen → Webhook kann es lesen
      payment_intent_data: { metadata },
      metadata,
    })

    // Session-ID speichern
    await admin
      .from('promo_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', orderRow.id)

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[promo/checkout] failed:', e?.message)
    return NextResponse.json({ error: 'Checkout konnte nicht erstellt werden.' }, { status: 500 })
  }
}
