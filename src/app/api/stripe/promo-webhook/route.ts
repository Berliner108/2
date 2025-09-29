import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ========= kleine Helfer ========= */
const nowISO = () => new Date().toISOString()

function parseSecrets(...vars: (string | undefined)[]) {
  const out: string[] = []
  for (const v of vars) {
    if (!v) continue
    for (const s of v.split(',').map(x => x.trim()).filter(Boolean)) out.push(s)
  }
  return Array.from(new Set(out))
}

function constructEventWithFallback(stripe: any, rawBody: string, sig: string, secrets: string[]) {
  let lastErr: any
  for (const sec of secrets) {
    try { return stripe.webhooks.constructEvent(rawBody, sig, sec) }
    catch (e) { lastErr = e }
  }
  throw lastErr
}

async function wasProcessed(id: string, admin: any) {
  const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
  return !!data
}
async function markProcessed(id: string, admin: any) {
  const { error } = await admin.from('processed_events').insert({ id })
  if (error && (error as any).code !== '23505') throw error
}

function getChargeIdFromPI(pi: any): string | null {
  if (!pi) return null
  const lc = (pi as any).latest_charge
  if (typeof lc === 'string') return lc
  if (lc && typeof lc.id === 'string') return lc.id
  return null
}

/* ========= Webhook ========= */
export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe ist nicht konfiguriert' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(
    process.env.STRIPE_WEBHOOK_SECRET_PROMO, // ← eigener Secret empfohlen
    process.env.STRIPE_WEBHOOK_SECRET,       // Fallbacks ok
    process.env.STRIPE_WEBHOOK_SECRET_TEST
  )
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: any
  try { event = constructEventWithFallback(stripe, rawBody, sig, secrets) }
  catch (err: any) {
    console.error('[promo webhook] ungültige Signatur', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  let admin
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo webhook] Supabase-Admin-Init fehlgeschlagen', e)
    return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 })
  }

  // Idempotenz (Achtung: Endpunkt in Stripe bitte auf *nur* checkout.session.* filtern)
  try {
    if (await wasProcessed(event.id, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo webhook] Idempotenz-Check fehlgeschlagen', (e as any)?.message)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sess = event.data.object as any
        // Für Charge-ID & Price-Check nachladen
        const session = await stripe.checkout.sessions.retrieve(sess.id, {
          expand: ['line_items.data.price', 'payment_intent.latest_charge'],
        })

        // promo_order ermitteln: zuerst über session_id, sonst client_reference_id / metadata
        let po: any | null = null
        {
          const { data } = await admin.from('promo_orders')
            .select('id,request_id,amount_cents,currency,price_id,status')
            .eq('session_id', session.id)
            .maybeSingle()
          po = data
        }
        if (!po && session.client_reference_id) {
          const { data } = await admin.from('promo_orders')
            .select('id,request_id,amount_cents,currency,price_id,status')
            .eq('id', session.client_reference_id)
            .maybeSingle()
          po = data
        }
        if (!po && session.metadata?.promo_order_id) {
          const { data } = await admin.from('promo_orders')
            .select('id,request_id,amount_cents,currency,price_id,status')
            .eq('id', session.metadata.promo_order_id)
            .maybeSingle()
          po = data
        }
        if (!po) {
          console.warn('[promo webhook] promo_order nicht gefunden für session', session.id)
          break
        }

        // Bruttopreis prüfen (Fixpreis, keine Tax/Shipping)
        const total = session.amount_total ?? 0
        const cur   = (session.currency ?? '').toString().toLowerCase()
        if (po.amount_cents !== total || cur !== 'eur') {
          console.error('[promo webhook] Betrag/Währung mismatch', {
            promo_order_id: po.id, expected: po.amount_cents, got: total, cur
          })
          // Wir protokollieren hart, setzen aber trotzdem auf succeeded (falls du lieber „error“ willst: hier return 400)
        }

        // Price-ID optional prüfen/übernehmen
        const li0 = session.line_items?.data?.[0] as any
        const priceId = li0?.price?.id || po.price_id || null

        // Payment/Charge-IDs
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent?.id ?? null)
        const chargeId = getChargeIdFromPI(session.payment_intent)

        await admin.from('promo_orders').update({
          status: 'succeeded',
          paid_at: nowISO(),
          updated_at: nowISO(),
          price_id: priceId ?? po.price_id,
          payment_intent_id: paymentIntentId,
          charge_id: chargeId,
        }).eq('id', po.id)

        break
      }

      case 'checkout.session.expired': {
        const sess = event.data.object as any
        await admin.from('promo_orders').update({
          status: 'expired',
          updated_at: nowISO(),
        })
        .eq('session_id', sess.id)
        .in('status', ['pending','created'])
        break
      }

      default:
        // ignorieren – dieser Endpunkt hört in Stripe idealerweise nur auf checkout.session.*
        break
    }

    try { await markProcessed(event.id, admin) } catch (e) {
      console.error('[promo webhook] markProcessed fehlgeschlagen', (e as any)?.message)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[promo webhook] Handler fehlgeschlagen', event?.type, err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
