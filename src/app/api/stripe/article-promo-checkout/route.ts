// src/app/api/stripe/article-promo-checkout/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')

const stripe = new Stripe(STRIPE_SECRET_KEY)

const nowISO = () => new Date().toISOString()

type Body = {
  articleId: string
  packageCodes: string[]
  // optional: wohin danach zurück
  returnTo?: string // z.B. "/kaufen"
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    // 1) Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    // 2) Body
    const body = (await req.json().catch(() => null)) as Body | null
    const articleId = String(body?.articleId ?? '').trim()
    const packageCodes = Array.isArray(body?.packageCodes)
      ? body!.packageCodes.map((x) => String(x).trim()).filter(Boolean)
      : []

    if (!articleId) {
      return NextResponse.json({ error: 'missing_articleId' }, { status: 400 })
    }
    if (packageCodes.length === 0) {
      return NextResponse.json({ error: 'no_packages_selected' }, { status: 400 })
    }

    // 3) Artikel prüfen (nur Owner darf bewerben)
    const { data: article, error: artErr } = await supabase
      .from('articles')
      .select('id, owner_id, published, archived')
      .eq('id', articleId)
      .maybeSingle()

    if (artErr) {
      return NextResponse.json({ error: 'article_lookup_failed', details: artErr.message }, { status: 500 })
    }
    if (!article) {
      return NextResponse.json({ error: 'article_not_found' }, { status: 404 })
    }
    if (article.owner_id !== user.id) {
      return NextResponse.json({ error: 'not_owner' }, { status: 403 })
    }
    if (article.archived) {
      return NextResponse.json({ error: 'article_archived' }, { status: 400 })
    }
    if (!article.published) {
      return NextResponse.json({ error: 'article_not_published' }, { status: 400 })
    }

    // 4) Packages aus DB laden (Single source of truth)
    const { data: packages, error: pkgErr } = await supabase
      .from('article_promo_packages')
      .select('code, amount_cents, currency, stripe_price_id, score_delta')
      .in('code', packageCodes)
      .eq('active', true)

    if (pkgErr) {
      return NextResponse.json({ error: 'packages_lookup_failed', details: pkgErr.message }, { status: 500 })
    }
    if (!packages || packages.length === 0) {
      return NextResponse.json({ error: 'no_active_packages_found' }, { status: 400 })
    }

    // sicherstellen: alle ausgewählten Codes existieren aktiv
    const foundCodes = new Set(packages.map((p: any) => p.code))
    const missing = packageCodes.filter((c) => !foundCodes.has(c))
    if (missing.length) {
      return NextResponse.json({ error: 'invalid_package_codes', missing }, { status: 400 })
    }

    // stripe_price_id Pflicht
    const missingPrice = packages.filter((p: any) => !p.stripe_price_id)
    if (missingPrice.length) {
      return NextResponse.json(
        { error: 'missing_stripe_price_id', codes: missingPrice.map((p: any) => p.code) },
        { status: 500 },
      )
    }

    const currency = String((packages[0] as any).currency ?? 'EUR').toUpperCase()
    const amountFallback = packages.reduce((sum: number, p: any) => sum + (p.amount_cents ?? 0), 0)
    const scoreFallback = packages.reduce((sum: number, p: any) => sum + (p.score_delta ?? 0), 0)

    // 5) Order in DB anlegen (pending)
    const { data: order, error: ordErr } = await supabase
      .from('article_promo_orders')
      .insert({
        article_id: articleId,
        buyer_id: user.id,
        package_codes: packageCodes,
        status: 'pending',
        // optional: schon mitschreiben (Webhook kann trotzdem serverseitig neu berechnen)
        amount_cents_total: amountFallback,
        currency,
        score_delta_total: scoreFallback,
        created_at: nowISO(),
        updated_at: nowISO(),
      })
      .select('id')
      .single()

    if (ordErr || !order?.id) {
      return NextResponse.json({ error: 'order_insert_failed', details: ordErr?.message }, { status: 500 })
    }

    const orderId = String(order.id)

    // 6) Stripe Checkout Session
    const origin = req.headers.get('origin') || 'https://mein-shop.de'
    const returnTo = (body?.returnTo && body.returnTo.startsWith('/')) ? body.returnTo : '/kaufen'

    const successUrl = `${origin}${returnTo}?promo=success&order=${encodeURIComponent(orderId)}`
    const cancelUrl  = `${origin}${returnTo}?promo=cancel&order=${encodeURIComponent(orderId)}`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: packages.map((p: any) => ({
        price: p.stripe_price_id,
        quantity: 1,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,

      // optional nice-to-have
      automatic_tax: { enabled: true },

      metadata: {
        article_promo_order_id: orderId,
        article_id: articleId,
      },
    })

    // 7) session_id in order speichern
    const { error: updErr } = await supabase
      .from('article_promo_orders')
      .update({ stripe_session_id: session.id, updated_at: nowISO() })
      .eq('id', orderId)

    if (updErr) {
      // Session existiert, aber DB Update fail → ist nicht fatal, webhook kann über metadata trotzdem matchen,
      // aber wir geben Fehler zurück, damit du es sofort merkst.
      return NextResponse.json({ error: 'order_update_failed', details: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, url: session.url, orderId })
  } catch (err: any) {
    console.error('article-promo-checkout error', err)
    return NextResponse.json(
      { error: 'internal_error', details: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}
