import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEV_VERBOSE = process.env.NODE_ENV !== 'production'
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1'

function err(msg: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ error: msg, ...(DEV_VERBOSE && extra ? { details: extra } : {}) }, { status })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const requestId: string = body?.request_id
    let packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : []

    if (!requestId || packageIds.length === 0) {
      return err('request_id und package_ids[] sind erforderlich.', 400, { requestId, packageIds })
    }

    packageIds = Array.from(new Set(packageIds.map(String)))

    const url = new URL(req.url)
    const origin = process.env.APP_ORIGIN ?? `${url.protocol}//${url.host}`

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message })
    if (!user)   return err('Not authenticated', 401)

    const admin = supabaseAdmin()

    // Anfrage + Owner
    const { data: reqRow, error: reqErr } = await admin
      .from('lack_requests')
      .select('id, owner_id')
      .eq('id', requestId)
      .maybeSingle()
    if (reqErr)  return err('DB error (request)', 500, { db: reqErr.message })
    if (!reqRow) return err('Anfrage nicht gefunden.', 404, { requestId })
    if (!DISABLE_OWNER_CHECK && reqRow.owner_id !== user.id) {
      return err('Nur der Besitzer der Anfrage kann sie bewerben.', 403, { owner_id: reqRow.owner_id, user_id: user.id })
    }

    // Pakete nach Code laden
    const { data: rows, error: pkgErr } = await admin
      .from('promo_packages')
      .select('code,title,amount_cents,currency,score_delta,active')
      .in('code', packageIds)
    if (pkgErr) return err('DB error (packages)', 500, { db: pkgErr.message, packageIds })

    const packages = (rows ?? [])
      .filter((r: any) => !!r.active)
      .map((r: any) => ({
        code: r.code as string,
        title: (r.title ?? '') as string,
        price_cents: Number(r.amount_cents ?? 0),
        currency: String(r.currency ?? 'EUR').toUpperCase(),
        score_delta: Number(r.score_delta ?? 0),
      }))

    if (!packages.length) {
      return err('Keine gültigen/aktiven Pakete gefunden.', 400, { packageIds, resolved: rows })
    }

    // Stripe Line Items (immer price_data)
    const line_items = packages.map(p => ({
      price_data: {
        currency: p.currency.toLowerCase(),
        unit_amount: p.price_cents,
        product_data: { name: `Bewerbung: ${p.title}` },
      },
      quantity: 1,
    }))

    if (!process.env.STRIPE_SECRET_KEY) {
      return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500)
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    const metadata = {
      request_id: requestId,
      package_ids: packageIds.join(','), // Codes (vom Webhook gelesen)
      user_id: user.id,
    }

    let session
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${origin}/lackanfragen/artikel/${encodeURIComponent(requestId)}?promo=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${origin}/lackanfragen/artikel/${encodeURIComponent(requestId)}?promo=cancel`,
        line_items,
        payment_intent_data: { metadata },
        metadata,
      })
    } catch (se: any) {
      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, { stripe: se?.message })
    }

    if (!session?.url) return err('Stripe-Session ohne URL.', 500, { session })
    return NextResponse.json({ url: session.url, debug: DEV_VERBOSE ? { requestId, packageIds } : undefined })
  } catch (e: any) {
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message })
  }
}
