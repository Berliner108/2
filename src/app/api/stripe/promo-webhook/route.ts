import { NextResponse } from 'next/server'
import Stripe from 'stripe'
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

function constructEventWithFallback(stripe: Stripe, rawBody: string, sig: string, secrets: string[]) {
  let lastErr: any
  for (const sec of secrets) {
    try { return stripe.webhooks.constructEvent(rawBody, sig, sec) }
    catch (e) { lastErr = e }
  }
  throw lastErr
}

// Idempotenz über processed_events(id text primary key)
async function wasProcessed(id: string, admin: any) {
  const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
  return !!data
}
async function markProcessed(id: string, admin: any) {
  const { error } = await admin.from('processed_events').insert({ id })
  if (error && (error as any).code !== '23505') throw error
}

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(
    process.env.STRIPE_WEBHOOK_SECRET_PROMO,
    process.env.STRIPE_WEBHOOK_SECRET_TEST
  )
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
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

  // Dedup
  try {
    if (await wasProcessed((event as any).id, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo webhook] Idempotenz-Check fehlgeschlagen', (e as any)?.message)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session

      const requestId = (sess.metadata?.request_id ?? '') as string
      const packageIdsCSV = (sess.metadata?.package_ids ?? '') as string
      if (!requestId) {
        await markProcessed((event as any).id, admin)
        return NextResponse.json({ ok: true, skipped: 'no_request_id' })
      }

      // Line Items → Stripe price IDs
      const li = await stripe.checkout.sessions.listLineItems(sess.id, { expand: ['data.price.product'] })
      const priceIds = (li?.data ?? [])
        .map((l: any) => l?.price?.id)
        .filter((x: any): x is string => typeof x === 'string')

      // Pakete über stripe_price_id oder Codes auflösen
      let pkgs: any[] = []
      if (priceIds.length) {
        const { data: byPrice, error } = await admin
          .from('promo_packages')
          .select('code,label,amount_cents,score_delta,is_active,active,stripe_price_id')
          .in('stripe_price_id', priceIds)
        if (error) throw error
        pkgs = (byPrice ?? []).filter(p => (typeof p.is_active === 'boolean' ? p.is_active : !!p.active))
      }
      if ((!pkgs || pkgs.length === 0) && packageIdsCSV) {
        const codes = packageIdsCSV.split(',').map(s => s.trim()).filter(Boolean)
        if (codes.length) {
          const { data: byCode, error } = await admin
            .from('promo_packages')
            .select('code,label,amount_cents,score_delta,is_active,active')
            .in('code', codes)
          if (error) throw error
          pkgs = (byCode ?? []).filter(p => (typeof p.is_active === 'boolean' ? p.is_active : !!p.active))
        }
      }
      if (!pkgs || pkgs.length === 0) {
        await markProcessed((event as any).id, admin)
        return NextResponse.json({ ok: true, skipped: 'no_packages_resolved' })
      }

      // Punkte + Badges
      const totalScore = pkgs.reduce((sum: number, p: any) => sum + (p.score_delta || 0), 0)
      const badgeTitles: string[] = pkgs.map((p: any) => p.label).filter(Boolean)

      // aktuelle Anfrage laden (Score + JSON)
      const { data: reqRow, error: reqErr } = await admin
        .from('lack_requests')
        .select('id, promo_score, data')
        .eq('id', requestId)
        .maybeSingle()
      if (reqErr) throw reqErr
      if (!reqRow) {
        await markProcessed((event as any).id, admin)
        return NextResponse.json({ ok: true, skipped: 'request_not_found' })
      }

      const curScore = Number(reqRow.promo_score ?? 0)
      const curData = (reqRow.data || {}) as any
      const curBadges: string[] = Array.isArray(curData.promo_badges) ? curData.promo_badges : []
      const mergedBadges = Array.from(new Set([...curBadges, ...badgeTitles]))

      // Anfrage aktualisieren: Score + Badges (Hybrid)
      const newData = { ...curData, promo_badges: mergedBadges, promo_last_purchase_at: nowISO(), gesponsert: true }
      const { error: upErr } = await admin
        .from('lack_requests')
        .update({
          promo_score: curScore + totalScore,
          data: newData,
          updated_at: nowISO(),
        })
        .eq('id', requestId)
      if (upErr) throw upErr

      // Best effort: Zahlung protokollieren (falls Schema passt)
      try {
        const totalCents = typeof (sess.amount_total) === 'number' ? sess.amount_total : null
        const currency = (sess.currency || 'eur').toString().toLowerCase()
        await admin.from('promo_orders').insert({
          request_id: requestId,
          checkout_session_id: sess.id,
          payment_intent_id: typeof sess.payment_intent === 'string' ? sess.payment_intent : null,
          package_ids: packageIdsCSV ? packageIdsCSV.split(',').map(s => s.trim()).filter(Boolean) : null,
          price_ids: priceIds,
          total_cents: totalCents,
          currency,
          status: 'paid',
          created_at: nowISO(),
          updated_at: nowISO(),
        } as any).then(({ error }: any) => {
          if (error) console.warn('[promo webhook] promo_orders insert warn:', (error as any)?.message)
        })
      } catch (logErr: any) {
        console.warn('[promo webhook] logging skipped:', logErr?.message)
      }

      await markProcessed((event as any).id, admin)
      return NextResponse.json({ ok: true })
    }

    // andere Events ignorieren
    await markProcessed((event as any).id, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo webhook] Handler fehlgeschlagen', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
