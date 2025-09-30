import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function nowISO() { return new Date().toISOString() }

// Idempotenz über processed_events(id text primary key)
async function wasProcessed(id: string, admin: any) {
  const { data } = await admin.from('processed_events').select('id').eq('id', id).maybeSingle()
  return !!data
}
async function markProcessed(id: string, admin: any) {
  const { error } = await admin.from('processed_events').insert({ id })
  if (error && (error as any).code !== '23505') throw error
}

function parseSecrets(...vars: (string | undefined)[]): string[] {
  const out: string[] = []
  for (const v of vars) if (v) for (const s of v.split(',').map(x => x.trim()).filter(Boolean)) out.push(s)
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

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const sig = req.headers.get('stripe-signature')
  const secrets = parseSecrets(process.env.STRIPE_WEBHOOK_SECRET_PROMO, process.env.STRIPE_WEBHOOK_SECRET_TEST)
  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: 'Fehlende Signatur oder Webhook-Secret' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try { event = constructEventWithFallback(stripe, rawBody, sig, secrets) }
  catch (err: any) {
    console.error('[promo webhook] invalid signature', err?.message)
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 })
  }

  let admin
  try { admin = supabaseAdmin() }
  catch (e) {
    console.error('[promo webhook] supabase init failed', e)
    return NextResponse.json({ error: 'DB nicht verfügbar' }, { status: 500 })
  }

  // Dedup
  try {
    if (await wasProcessed(event.id as any, admin)) {
      return NextResponse.json({ ok: true, dedup: true })
    }
  } catch (e) {
    console.error('[promo webhook] dedup check failed', (e as any)?.message)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session

      const requestId = (sess.metadata?.request_id ?? '') as string
      const packageIdsCSV = (sess.metadata?.package_ids ?? '') as string
      if (!requestId || !packageIdsCSV) {
        await markProcessed(event.id as any, admin)
        return NextResponse.json({ ok: true, skipped: 'no_request_or_packages' })
      }

      // Pakete ausschließlich über Codes auflösen
      const codes = packageIdsCSV.split(',').map(s => s.trim()).filter(Boolean)
      const { data: pkgs, error: pkgErr } = await admin
        .from('promo_packages')
        .select('code,title,score_delta,active')
        .in('code', codes)
      if (pkgErr) throw pkgErr

      const activePkgs = (pkgs ?? []).filter((p: any) => !!p.active)
      if (!activePkgs.length) {
        await markProcessed(event.id as any, admin)
        return NextResponse.json({ ok: true, skipped: 'no_active_packages' })
      }

      const totalScore = activePkgs.reduce((sum: number, p: any) => sum + Number(p.score_delta || 0), 0)
      const badgeTitles: string[] = activePkgs.map((p: any) => p.title).filter(Boolean)

      // Anfrage laden (Score + data JSON)
      const { data: reqRow, error: reqErr } = await admin
        .from('lack_requests')
        .select('id, promo_score, data')
        .eq('id', requestId)
        .maybeSingle()
      if (reqErr) throw reqErr
      if (!reqRow) {
        await markProcessed(event.id as any, admin)
        return NextResponse.json({ ok: true, skipped: 'request_not_found' })
      }

      const curScore = Number((reqRow as any).promo_score ?? 0)
      const curData = ((reqRow as any).data || {}) as any
      const curBadges: string[] = Array.isArray(curData.promo_badges) ? curData.promo_badges : []
      const mergedBadges = Array.from(new Set([...curBadges, ...badgeTitles]))

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

      // optional: protokollieren (best-effort). Falls Tabelle anders ist, ignorieren.
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
        console.warn('[promo webhook] logging skipped:', logErr?.message)
      }

      await markProcessed(event.id as any, admin)
      return NextResponse.json({ ok: true })
    }

    await markProcessed(event.id as any, admin)
    return NextResponse.json({ ok: true, ignored: event.type })
  } catch (err: any) {
    console.error('[promo webhook] failed', err?.message)
    return NextResponse.json({ error: 'Webhook-Verarbeitung fehlgeschlagen' }, { status: 500 })
  }
}
