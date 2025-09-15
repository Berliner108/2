// /src/app/api/connect/status/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const nowISO = () => new Date().toISOString()
const mode = () => (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live') ? 'live' : 'test'

export async function GET() {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  // Session-User holen
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Admin-Client (RLS-frei)
  const admin = supabaseAdmin()

  // Profil lesen (oder anlegen, falls nicht vorhanden)
  const cols = 'id, stripe_account_id, stripe_connect_id, connect_ready, payouts_enabled, connect_checked_at, updated_at'
  let { data: prof, error: selErr } = await admin
    .from('profiles')
    .select(cols)
    .eq('id', user.id)
    .maybeSingle()

  if (selErr) {
    return NextResponse.json({ error: `Profile select failed: ${selErr.message}` }, { status: 400 })
  }

  if (!prof) {
    const up = await admin.from('profiles')
      .upsert({ id: user.id }, { onConflict: 'id' })
      .select(cols)
      .single()
    if (up.error) {
      return NextResponse.json({ error: `Profile upsert failed: ${up.error.message}` }, { status: 400 })
    }
    prof = up.data
  }

  // Beide möglichen Spalten berücksichtigen
  let accountId: string | null = prof.stripe_account_id || prof.stripe_connect_id || null

  // Default-Flags
  let detailsSubmitted = false
  let chargesEnabled = false
  let payoutsEnabled = !!prof.payouts_enabled
  let ready = false
  let reason: string | null = null

  if (accountId) {
    try {
      const acct = await stripe.accounts.retrieve(accountId)

      // --- Erweiterung: Transfers-Capability + präziser Reason
      const transfersActive = (acct.capabilities?.transfers === 'active')
      const reasonFromStripe =
        acct.requirements?.disabled_reason ||
        (acct.requirements?.currently_due?.length
          ? `missing: ${acct.requirements.currently_due.join(', ')}`
          : null)

      detailsSubmitted = !!acct.details_submitted
      chargesEnabled   = !!(acct as any).charges_enabled // optional für Destination Charges
      payoutsEnabled   = !!acct.payouts_enabled
      ready            = transfersActive && payoutsEnabled
      reason           = ready ? null : (reasonFromStripe || null)

      // falls Stripe ein anderes ID-Format zurückgibt, zurückspiegeln
      accountId = acct.id

      // Status in DB spiegeln (beide Spalten synchron halten)
      await admin.from('profiles').update({
        connect_ready: ready,
        payouts_enabled: payoutsEnabled,
        connect_checked_at: nowISO(),
        updated_at: nowISO(),
        stripe_account_id: accountId,
        stripe_connect_id: accountId,
      }).eq('id', user.id)
    } catch (e: any) {
      const sc = e?.statusCode
      const code = e?.code || e?.raw?.code
      const msg = e?.raw?.message || e?.message || 'STRIPE_ERROR'

      // Typische Fälle: Test/Live-Mismatch, gelöschter Account, fehlender Zugriff
      if (sc === 401 || sc === 403 || sc === 404 || code === 'resource_missing') {
        await admin.from('profiles').update({
          stripe_account_id: null,
          stripe_connect_id: null,
          connect_ready: false,
          payouts_enabled: false,
          connect_checked_at: nowISO(),
          updated_at: nowISO(),
        }).eq('id', user.id)

        accountId = null
        detailsSubmitted = false
        chargesEnabled = false
        payoutsEnabled = false
        ready = false
        reason = msg
      } else {
        return NextResponse.json({
          ready: false,
          payoutsEnabled: false,
          accountId,
          detailsSubmitted: false,
          chargesEnabled: false,
          reason: msg,
          mode: mode(),
        }, { status: 400 })
      }
    }
  } else {
    // Kein Account vorhanden → klarer „nicht ready“-Status in DB stempeln
    await admin.from('profiles').update({
      connect_ready: false,
      payouts_enabled: false,
      connect_checked_at: nowISO(),
      updated_at: nowISO(),
    }).eq('id', user.id)
  }

  return NextResponse.json({
    ready,
    payoutsEnabled,
    accountId,
    detailsSubmitted,
    chargesEnabled,
    reason,
    mode: mode(), // hilfreiches Debug-Feld (test/live)
  })
}
