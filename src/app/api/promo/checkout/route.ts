import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const requestId: string = body?.request_id
    const packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : []

    if (!requestId || packageIds.length === 0) {
      return NextResponse.json({ error: 'request_id und package_ids[] sind erforderlich.' }, { status: 400 })
    }

    const url = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${url.protocol}//${url.host}`

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()

    // Anfrage prüfen
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

    // Pakete laden NUR per code (kein id in Tabelle)
    const { data: rows, error: pkgErr } = await admin
      .from('promo_packages')
      .select(`
        code, label, description,
        amount_cents, price_cents, currency,
        score_delta, duration_days,
        is_active, active, most_popular, stripe_price_id
      `)
      .in('code', packageIds)

    if (pkgErr) return NextResponse.json({ error: 'DB error (packages by code)' }, { status: 500 })

    const packages = (rows ?? [])
      .map((r: any) => ({
        code: r.code,
        title: r.label ?? r.title,
        price_cents: (r.amount_cents ?? r.price_cents) ?? 0,
        currency: String(r.currency ?? 'EUR').toUpperCase(),
        score_delta: Number(r.score_delta ?? 0),
        duration_days: Number(r.duration_days ?? 0),
        stripe_price_id: r.stripe_price_id ?? null,
        active: (typeof r.is_active === 'boolean') ? r.is_active : !!r.active,
      }))
      .filter(p => p.active)

    if (packages.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen/aktiven Pakete gefunden.' }, { status: 400 })
    }

    // promo_orders anlegen (package_id = code)
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live'
    const toInsert = packages.map(p => ({
      request_id: requestId,
      package_id: p.code,             // <-- Code speichern
      buyer_id: user.id,
      amount_cents: p.price_cents,
      score_delta: p.score_delta,
      duration_days: p.duration_days,
      status: 'created',
      mode,
    }))
    const { data: orders, error: insErr } = await admin
      .from('promo_orders')
      .insert(toInsert)
      .select('id')
    if (insErr || !orders?.length) {
      return NextResponse.json({ error: 'Bestellung konnte nicht angelegt werden.' }, { status: 500 })
    }

    // Stripe Checkout
    const line_items = packages.map(p =>
      p.stripe_price_id
        ? { price: p.stripe_price_id, quantity: 1 }
        : {
            price_data: {
              currency: p.currency.toLowerCase(),
              unit_amount: p.price_cents,
              product_data: { name: `Bewerbung: ${p.title}` },
            },
            quantity: 1,
          }
    )

    const metadata = {
      promo_order_ids: orders.map(o => o.id).join(','),
      request_id: requestId,
      user_id: user.id,
      package_codes: packageIds.join(','),
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/lackanfragen/artikel/${encodeURIComponent(requestId)}?promo=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/lackanfragen/artikel/${encodeURIComponent(requestId)}?promo=cancel`,
      line_items,
      payment_intent_data: { metadata },
      metadata,
    })

    await admin
      .from('promo_orders')
      .update({ stripe_session_id: session.id })
      .in('id', orders.map(o => o.id))

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[promo/checkout] failed:', e?.message)
    return NextResponse.json({ error: 'Checkout konnte nicht erstellt werden.' }, { status: 500 })
  }
}
