import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** utils */
const nowISO = () => new Date().toISOString()
const parseSecrets = (...vars: (string | undefined)[]) =>
  Array.from(new Set(vars.flatMap(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []))))

// Idempotenz: falls du die Tabelle nicht hast, setze beide Funktionen unten auf No-Op
async function wasProcessed(id: string, admin: any) {
  try {
    const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
    return !!data
  } catch { return false }
}
async function markProcessed(id: string, admin: any) {
  try {
    const { error } = await admin.from('processed_events').insert({ id })
    if (error && (error as any).code !== '23505') throw error
  } catch { /* best effort */ }
}

function constructEventWithFallback(stripe: Stripe, rawBody: string, sig: string, secrets: string[]) {
  let lastErr: any
  for (const sec of secrets) {
    try { return stripe.webhooks.constructEvent(rawBody, sig, sec) }
    catch (e) { lastErr = e }
  }
  throw lastErr
}

export async function POST(req: Request) {
  // 1) Stripe + Signatur prüfen
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return NextResponse.json({ error: 'Stripe Secret fehlt' }, { status: 500 })
  const stripe = new Stripe(secretKey)

  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(process.env.STRIPE_WEBHOOK_SECRET_PROMO, process.env.STRIPE_WEBHOOK_SECRET_TEST)
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  // 2) RAW body (wichtig für Signatur-Verifizierung)
  const rawBody = await req.text()

  // 3) Event verifizieren
  let event: Stripe.Event
  try {
    event = constructEventWithFallback(stripe, rawBody, sig, secrets)
  } catch (err: any) {
    console.error('[promo-webhook] invalid signature:', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  // 4) Supabase Admin (Service Role)
  let admin: any
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo-webhook] supabase init failed:', (e as any)?.message)
    return NextResponse.json({ error: 'DB nicht verfügbar' }, { status: 500 })
  }

  // 5) Idempotenz
  try {
    if (await wasProcessed(event.id as string, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo-webhook] dedup check failed:', (e as any)?.message)
  }

  // 6) Event behandeln
  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session

      // Wir erwarten: request_id + package_ids (CSV Codes: z.B. homepage,premium,search_boost)
      const requestId = (sess.metadata?.request_id ?? '') as string
      const packageIdsCSV = (sess.metadata?.package_ids ?? '') as string

      if (!requestId || !packageIdsCSV) {
        console.warn('[promo-webhook] missing metadata', { requestId, packageIdsCSV })
        await markProcessed(event.id as string, admin)
        return NextResponse.json({ ok: true, skipped: 'missing_metadata' })
      }

      const codes = packageIdsCSV.split(',').map(s => s.trim()).filter(Boolean)
      if (codes.length === 0) {
        await markProcessed(event.id as string, admin)
        return NextResponse.json({ ok: true, skipped: 'empty_codes' })
      }

      // Pakete laden – OHNE active-Flag
      const { data: pkgs, error: pkgErr } = await admin
        .from('promo_packages')
        .select('code,label,score_delta')
        .in('code', codes)

      if (pkgErr) throw pkgErr

      const usedPkgs = pkgs ?? []
      if (!usedPkgs.length) {
        await markProcessed(event.id as string, admin)
        return NextResponse.json({ ok: true, skipped: 'packages_not_found' })
      }

      // Gesamt-Score & Badges
      const totalScore = usedPkgs.reduce((sum: number, p: any) => sum + Number(p.score_delta || 0), 0)
      const badgeTitles: string[] = usedPkgs.map((p: any) => p.label || p.code).filter(Boolean)

      // Anfrage lesen
      const { data: reqRow, error: reqErr } = await admin
        .from('lack_requests')
        .select('id,promo_score,data')
        .eq('id', requestId)
        .maybeSingle()
      if (reqErr) throw reqErr
      if (!reqRow) {
        await markProcessed(event.id as string, admin)
        return NextResponse.json({ ok: true, skipped: 'request_not_found' })
      }

      const curScore = Number(reqRow.promo_score ?? 0)
      const curData  = (reqRow.data ?? {}) as any
      const curBadges: string[] = Array.isArray(curData.promo_badges) ? curData.promo_badges : []
      const mergedBadges = Array.from(new Set([...curBadges, ...badgeTitles]))

      // Update: nur promo_score + Flags
      const { error: upErr } = await admin
        .from('lack_requests')
        .update({
          promo_score: curScore + totalScore,
          data: {
            ...curData,
            gesponsert: true,
            promo_badges: mergedBadges,
            promo_last_purchase_at: nowISO(),
          },
          updated_at: nowISO(),
        })
        .eq('id', requestId)

      if (upErr) throw upErr

      // (Optionales) Logging, falls Tabelle existiert – best effort
      try {
        await admin.from('promo_orders').insert({
          request_id: requestId,
          checkout_session_id: sess.id,
          package_ids: codes,
          total_cents: typeof sess.amount_total === 'number' ? sess.amount_total : null,
          currency: (sess.currency || 'eur').toString().toLowerCase(),
          status: 'paid',
          created_at: nowISO(),
          updated_at: nowISO(),
        } as any)
      } catch (logErr: any) {
        console.warn('[promo-webhook] order-log failed:', logErr?.message)
      }

      await markProcessed(event.id as string, admin)
      return NextResponse.json({ ok: true })
    }

    // andere Events ignorieren – aber als verarbeitet markieren
    await markProcessed(event.id as string, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo-webhook] handler failed:', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
