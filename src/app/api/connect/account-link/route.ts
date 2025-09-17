// /src/app/api/connect/account-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const now = () => new Date().toISOString()
const isLiveMode = () => (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_live')

const baseUrl = (req: NextRequest) => {
  const override =
    process.env.CONNECT_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL
  if (override) return override

  const origin = req.headers.get('origin') || ''
  if (isLiveMode()) {
    if (origin && origin.startsWith('https://')) return origin
    const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
    if (vercel) return vercel
  }
  return origin || 'http://localhost:3000'
}

const normalizeCountry = (raw?: any): string => {
  const t = String(raw || '').trim()
  if (!t) return (process.env.STRIPE_DEFAULT_COUNTRY || 'DE').toUpperCase()
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase()
  const s = t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const map: Record<string, string> = {
    Deutschland: 'DE', germany: 'DE', bundesrepublikdeutschland: 'DE',
    Österreich: 'AT', österreich: 'AT', austria: 'AT',
    Schweiz: 'CH', suisse: 'CH', switzerland: 'CH',
    frankreich: 'FR', france: 'FR',
    italien: 'IT', italy: 'IT', italia: 'IT',
    niederlande: 'NL', netherlands: 'NL',
    polen: 'PL', poland: 'PL',
    spanien: 'ES', spain: 'ES',
    portugal: 'PT',
    tschechien: 'CZ', czechrepublic: 'CZ',
    vereinigtestaaten: 'US', unitedstates: 'US', usa: 'US',
    belgien: 'BE', belgium: 'BE',
    luxemburg: 'LU', luxembourg: 'LU',
    Liechtenstein: 'LI',
  }
  const key = s.replace(/[^a-z]/g, '')
  return map[key] || (process.env.STRIPE_DEFAULT_COUNTRY || 'DE').toUpperCase()
}

const shouldNullOutAccount = (e: any): boolean => {
  const code = e?.code || e?.raw?.code
  const status = e?.statusCode || e?.status
  const msg = String(e?.message || e?.raw?.message || '')
  if (status === 404) return true
  if (code === 'invalid_request_error' || code === 'permission_error' || code === 'account_invalid') return true
  if (/does not have access to account/i.test(msg)) return true
  if (/No such account/i.test(msg)) return true
  if (/You can only access test mode/i.test(msg)) return true
  if (/You can only access live mode/i.test(msg)) return true
  return false
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  // Session-User
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Body (nur für return_to relevant – Accounttyp ignorieren)
  let body: any = {}
  try { body = await req.json() } catch {}
  const returnTo = typeof body?.return_to === 'string' ? body.return_to : null

  // DB-Admin
  const admin = supabaseAdmin()
  const selectCols = 'id, stripe_account_id, stripe_connect_id, address, payouts_enabled, connect_ready, connect_checked_at'
  let { data: prof, error: profErr } = await admin.from('profiles').select(selectCols).eq('id', user.id).maybeSingle()
  if (profErr) return NextResponse.json({ error: `Profile read failed: ${profErr.message}` }, { status: 400 })
  if (!prof) {
    const up = await admin.from('profiles').upsert({ id: user.id }, { onConflict: 'id' }).select(selectCols).single()
    if (up.error) return NextResponse.json({ error: `Profile upsert failed: ${up.error.message}` }, { status: 400 })
    prof = up.data
  }

  // Country bestimmen
  const rawCountry =
    (prof as any)?.address?.country ??
    (prof as any)?.address?.Country ??
    process.env.STRIPE_DEFAULT_COUNTRY ??
    'DE'
  const country = normalizeCountry(rawCountry)

  // Vorhandenes Konto prüfen (beide Spalten)
  let accountId: string | null = prof?.stripe_account_id || (prof as any)?.stripe_connect_id || null
  if (accountId) {
    try {
      await stripe.accounts.retrieve(accountId)
    } catch (e: any) {
      if (shouldNullOutAccount(e)) {
        await admin.from('profiles').update({
          stripe_account_id: null,
          stripe_connect_id: null,
          connect_ready: false,
          payouts_enabled: false,
          connect_checked_at: now(),
          updated_at: now(),
        }).eq('id', user.id)
        accountId = null
      } else {
        return NextResponse.json({ error: e?.raw?.message || e?.message || 'Account retrieve failed' }, { status: 400 })
      }
    }
  }

  // Falls nötig: Konto neu anlegen (ohne business_type; Stripe fragt das im Onboarding)
  if (!accountId) {
    try {
      const acct = await stripe.accounts.create({
        type: 'express',
        country,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        email: user.email ?? undefined,
        metadata: { app_user_id: user.id },
      } as any)

      accountId = acct.id
      const { error: updErr } = await admin.from('profiles').update({
        stripe_account_id: accountId,
        stripe_connect_id: accountId, // beide Spalten synchron halten
        updated_at: now(),
      }).eq('id', user.id)
      if (updErr) return NextResponse.json({ error: `DB update failed: ${updErr.message}` }, { status: 400 })
    } catch (e: any) {
      console.error('[connect/account-link] create account failed', e?.raw || e)
      if (isLiveMode()) {
        const origin = baseUrl(req)
        if (!origin.startsWith('https://')) {
          return NextResponse.json({
            error: 'LIVE-Modus erfordert HTTPS-Return-URLs. Setze CONNECT_BASE_URL/NEXT_PUBLIC_APP_URL auf https://…',
          }, { status: 400 })
        }
      }
      return NextResponse.json({ error: e?.raw?.message || e?.message || 'Konto konnte nicht angelegt werden.' }, { status: 400 })
    }
  }

  // Onboarding-Link erzeugen
  const origin = baseUrl(req)
  try {
    const link = await stripe.accountLinks.create({
      account: accountId!,
      type: 'account_onboarding',
      return_url: returnTo || `${origin}/konto/einstellungen?onboarding=1`,
      refresh_url: `${origin}/konto/einstellungen?onboarding=0`,
    })
    return NextResponse.json({ url: link.url, accountId, mode: isLiveMode() ? 'live' : 'test' })
  } catch (e: any) {
    console.error('[connect/account-link] create link failed', e?.raw || e, { accountId, origin })
    return NextResponse.json({ error: e?.raw?.message || e?.message || 'Onboarding-Link konnte nicht erstellt werden.' }, { status: 400 })
  }
}
