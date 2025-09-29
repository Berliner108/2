// /src/app/api/stripe/promo-webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function nowISO() { return new Date().toISOString() }

function parseSecrets(...vars: (string | undefined)[]): string[] {
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

// Idempotenz
async function wasProcessed(id: string, admin: any) {
  const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
  return !!data
}
async function markProcessed(id: string, admin: any) {
  const { error } = await admin.from('processed_events').insert({ id })
  if (error && (error as any).code !== '23505') throw error
}

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe ist nicht konfiguriert' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(
    process.env.STRIPE_WEBHOOK_SECRET_PROMO, // ⬅️ eigener Secret für Promo
    process.env.STRIPE_WEBHOOK_SECRET_TEST   // optional: Test
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

  if (process.env.LOG_STRIPE_EVENTS === '1') {
    console.log('[promo webhook]', event.type, event.id)
  }

  let admin
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo webhook] Supabase-Admin-Init fehlgeschlagen', e)
    return NextResponse.json({ error: 'Datenbank nicht verfügbar' }, { status: 500 })
  }

  // Dedup
  try {
    if (await wasProcessed(event.id, admin)) {
      if (process.env.LOG_STRIPE_EVENTS === '1') console.log('[promo webhook] dedup', event.id)
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo webhook] Idempotenz-Check fehlgeschlagen', (e as any)?.message)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sess = event.data.object as any

        // Wir erwarten: metadata.request_id und optional metadata.package_ids (CSV)
        const requestId: string | undefined = sess.metadata?.request_id
        const packageIdsCSV: string | undefined = sess.metadata?.package_ids
        if (!requestId) break

        // Line Items expanden, um die Stripe-Price-IDs zu bekommen
        const li = await stripe.checkout.sessions.listLineItems(sess.id, { expand: ['data.price.product'] })
        const priceIds = (li?.data ?? [])
          .map((l: any) => l.price?.id)
          .filter((x: any) => typeof x === 'string')

        // Promo-Pakete anhand stripe_price_id ermitteln
        const { data: pkgs, error: pkgErr } = await admin
          .from('promo_packages')
          .select('id,title,price_cents,score_delta,stripe_price_id')
          .in('stripe_price_id', priceIds)

        if (pkgErr) throw pkgErr

        // Fallback, falls nur package_ids in metadata übergeben wurden
        let packageIds: string[] = []
        if (Array.isArray(pkgs) && pkgs.length) {
          packageIds = pkgs.map(p => p.id)
        } else if (packageIdsCSV) {
          packageIds = packageIdsCSV.split(',').map(s => s.trim()).filter(Boolean)
        }

        // Gesamten Score-Boost addieren (keine Laufzeitbegrenzung – brutto Fixpreise)
        const totalScore = (pkgs ?? []).reduce((sum: number, p: any) => sum + (p.score_delta || 0), 0)

        // Anfrage holen (für Mergen von JSON)
        const { data: reqRow, error: reqErr } = await admin
          .from('lack_requests')
          .select('id, data')
          .eq('id', requestId)
          .maybeSingle()
        if (reqErr) throw reqErr
        if (!reqRow) break

        const data = reqRow.data || {}
        const newBadges: string[] = Array.from(new Set([...(data.promo_badges ?? []), ...((pkgs ?? []).map((p: any) => p.title))]))
        const newScore = (data.promo_score ?? 0) + totalScore

        // Anfrage aktualisieren: gesponsert=true, Badges/Score hochzählen
        {
          const { error } = await admin
            .from('lack_requests')
            .update({
              data: {
                ...data,
                gesponsert: true,
                promo_score: newScore,
                promo_badges: newBadges,
                promo_last_purchase_at: nowISO(),
              },
              updated_at: nowISO(),
            })
            .eq('id', requestId)
          if (error) throw error
        }

        // Order/Payment in eigener Tabelle loggen (optional, aber sehr nützlich)
        {
          const totalCents = typeof sess.amount_total === 'number' ? sess.amount_total : null
          const currency = (sess.currency || 'eur').toString().toLowerCase()
          const rec: any = {
            request_id: requestId,
            checkout_session_id: sess.id,
            customer_id: sess.customer || null,
            payment_intent_id: sess.payment_intent || null,
            price_ids: priceIds,            // Referenz auf Stripe-Preiszeilen
            package_ids: packageIds,        // Referenz auf unsere Pakete
            total_cents: totalCents,
            currency,
            status: 'paid',
            created_at: nowISO(),
            updated_at: nowISO(),
          }
          const { error } = await admin.from('promo_orders').insert(rec)
          if (error && (error as any).code !== '23505') {
            // Nicht kritisch, Anfrage wurde schon geboostet
            console.warn('[promo webhook] promo_orders insert warn:', (error as any)?.message)
          }
        }

        break
      }

      case 'charge.refunded': {
        // Falls du Promo-Rückerstattungen tracken willst:
        const ch = event.data.object as any
        await admin
          .from('promo_orders')
          .update({ status: 'refunded', updated_at: nowISO() })
          .eq('payment_intent_id', ch.payment_intent)
        break
      }

      default:
        // andere Events sind hier nicht relevant
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
