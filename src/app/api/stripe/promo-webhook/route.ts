// /src/app/api/stripe/promo-webhook/route.ts
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function nowISO() { return new Date().toISOString() }

// mehrere Secrets erlauben (z. B. live + test)
function parseSecrets(...vars: (string | undefined)[]): string[] {
  const out: string[] = []
  for (const v of vars) {
    if (!v) continue
    for (const s of v.split(',').map(x => x.trim()).filter(Boolean)) out.push(s)
  }
  return Array.from(new Set(out))
}

// probiere Secrets der Reihe nach, bis eins passt
function constructEventWithFallback(stripe: any, rawBody: string, sig: string, secrets: string[]) {
  let lastErr: any
  for (const sec of secrets) {
    try { return stripe.webhooks.constructEvent(rawBody, sig, sec) }
    catch (e) { lastErr = e }
  }
  throw lastErr
}

// Idempotenz über Tabelle processed_events(id text primary key)
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
    process.env.STRIPE_WEBHOOK_SECRET_PROMO, // eigener Secret für Promo
    process.env.STRIPE_WEBHOOK_SECRET_TEST   // optional: Test
  )
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  // Roh-Body lesen (wichtig für Signatur)
  const rawBody = await req.text()

  let event: any
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
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
    // Wir werten sowohl checkout.session.completed als auch payment_intent.succeeded aus.
    // Primär nehmen wir checkout.session.completed, weil dort die Line Items verfügbar sind.
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as any

      // Erwartet: metadata.request_id + optional metadata.package_ids (CSV der Codes)
      const requestId: string | undefined = sess.metadata?.request_id
      const packageIdsCSV: string | undefined = sess.metadata?.package_ids
      if (!requestId) {
        // ohne request_id keine Promotion-Zuordnung möglich
        await markProcessed(event.id, admin)
        return NextResponse.json({ ok: true, skipped: 'no_request_id' })
      }

      // Line Items expanden, um Stripe-Price-IDs zu bekommen
      const li = await stripe.checkout.sessions.listLineItems(sess.id, { expand: ['data.price.product'] })
      const priceIds: string[] = (li?.data ?? [])
        .map((l: any) => l?.price?.id)
        .filter((x: any): x is string => typeof x === 'string')

      // Erstes Mapping: über stripe_price_id → promo_packages
      let pkgs: any[] = []
      if (priceIds.length) {
        const { data: byPrice, error: pkgErr } = await admin
          .from('promo_packages')
          .select('code,label,amount_cents,score_delta,stripe_price_id,is_active,active')
          .in('stripe_price_id', priceIds)
        if (pkgErr) throw pkgErr
        pkgs = (byPrice ?? []).filter(p =>
          (typeof p.is_active === 'boolean' ? p.is_active : !!p.active)
        )
      }

      // Fallback: wenn keine Stripe-Preise gemappt sind → per package_codes aus metadata nachladen
      if ((!pkgs || pkgs.length === 0) && packageIdsCSV) {
        const codes = packageIdsCSV.split(',').map(s => s.trim()).filter(Boolean)
        if (codes.length) {
          const { data: byCode, error: pkgErr2 } = await admin
            .from('promo_packages')
            .select('code,label,amount_cents,score_delta,is_active,active')
            .in('code', codes)
          if (pkgErr2) throw pkgErr2
          pkgs = (byCode ?? []).filter(p =>
            (typeof p.is_active === 'boolean' ? p.is_active : !!p.active)
          )
        }
      }

      if (!pkgs || pkgs.length === 0) {
        // nichts anzuwenden
        await markProcessed(event.id, admin)
        return NextResponse.json({ ok: true, skipped: 'no_packages_resolved' })
      }

      // Score + Badges berechnen
      const totalScore = pkgs.reduce((sum: number, p: any) => sum + (p.score_delta || 0), 0)
      const badgeTitles: string[] = pkgs.map((p: any) => p.label).filter(Boolean)

      // Anfrage laden (für JSON-Merge)
      const { data: reqRow, error: reqErr } = await admin
        .from('lack_requests')
        .select('id, data')
        .eq('id', requestId)
        .maybeSingle()
      if (reqErr) throw reqErr
      if (!reqRow) {
        await markProcessed(event.id, admin)
        return NextResponse.json({ ok: true, skipped: 'request_not_found' })
      }

      const data = (reqRow.data || {}) as any
      const newBadges = Array.from(new Set([...(data.promo_badges ?? []), ...badgeTitles]))
      const newScore = Number(data.promo_score ?? 0) + Number(totalScore || 0)

      // Anfrage aktualisieren
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

      // Optional: Zahlung protokollieren (best-effort; Schema-unabhängig halten)
      try {
        const totalCents = typeof sess.amount_total === 'number' ? sess.amount_total : null
        const currency = (sess.currency || 'eur').toString().toLowerCase()

        // Falls du eine flexible Log-Tabelle hast, nutze sie hier (Beispiel: promo_payments)
        // Wenn du nur promo_orders hast, kann das Insert scheitern → bewusst weggeloggt
        await admin.from('promo_orders').insert({
          request_id: requestId,
          checkout_session_id: sess.id,
          payment_intent_id: typeof sess.payment_intent === 'string' ? sess.payment_intent : null,
          package_ids: (packageIdsCSV ?? '').split(',').map(x => x.trim()).filter(Boolean),
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

      await markProcessed(event.id, admin)
      return NextResponse.json({ ok: true })
    }

    // Optionaler Zweig: falls dein Stripe-Setup nur payment_intent.succeeded sendet
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as any
      const requestId = pi.metadata?.request_id as string | undefined
      const codesCSV = pi.metadata?.package_ids as string | undefined
      if (!requestId || !codesCSV) {
        await markProcessed(event.id, admin)
        return NextResponse.json({ ok: true, skipped: 'no_request_or_packages_in_pi' })
      }

      const codes = codesCSV.split(',').map((s: string) => s.trim()).filter(Boolean)
      const { data: pkgs, error: pkgErr } = await admin
        .from('promo_packages')
        .select('code,label,amount_cents,score_delta,is_active,active')
        .in('code', codes)
      if (pkgErr) throw pkgErr

      const activePkgs = (pkgs ?? []).filter(p =>
        (typeof p.is_active === 'boolean' ? p.is_active : !!p.active)
      )
      if (activePkgs.length === 0) {
        await markProcessed(event.id, admin)
        return NextResponse.json({ ok: true, skipped: 'no_active_packages' })
      }

      const totalScore = activePkgs.reduce((sum: number, p: any) => sum + (p.score_delta || 0), 0)
      const badgeTitles: string[] = activePkgs.map((p: any) => p.label).filter(Boolean)

      const { data: reqRow, error: reqErr } = await admin
        .from('lack_requests')
        .select('id, data')
        .eq('id', requestId)
        .maybeSingle()
      if (reqErr) throw reqErr
      if (!reqRow) {
        await markProcessed(event.id, admin)
        return NextResponse.json({ ok: true, skipped: 'request_not_found' })
      }

      const data = (reqRow.data || {}) as any
      const newBadges = Array.from(new Set([...(data.promo_badges ?? []), ...badgeTitles]))
      const newScore = Number(data.promo_score ?? 0) + Number(totalScore || 0)

      const { error: upErr } = await admin
        .from('lack_requests')
        .update({
          data: { ...data, gesponsert: true, promo_score: newScore, promo_badges: newBadges, promo_last_purchase_at: nowISO() },
          updated_at: nowISO(),
        })
        .eq('id', requestId)
      if (upErr) throw upErr

      await markProcessed(event.id, admin)
      return NextResponse.json({ ok: true })
    }

    // andere Events ignorieren
    await markProcessed(event.id, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo webhook] Handler fehlgeschlagen', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
