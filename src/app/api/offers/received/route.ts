// src/app/api/offers/received/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function pickSnapPublic(snap: any) {
  const pub = snap?.public ?? {}
  const loc = pub?.location ?? {}
  return {
    snap_account_type: String(pub?.account_type ?? ''),
    snap_country: String(loc?.country ?? ''),
    snap_city: String(loc?.city ?? ''),
  }
}

export async function GET() {
  try {
    const sb = await supabaseServer()
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
    }

    const admin = supabaseAdmin()
    const nowIso = new Date().toISOString()

    /**
     * Anzeige-Regel (wie du willst):
     * - paid/released/refunded NIE (wandern zu konto/auftraege)
     * - open NUR wenn valid_until > now
     * - selected NUR wenn valid_until > now (wenn selected aber abgelaufen => ausblenden)
     */
    const { data: rows, error } = await admin
      .from('job_offers')
      .select(`
        id,
        job_id,
        bieter_id,
        owner_id,
        artikel_cents,
        versand_cents,
        gesamt_cents,
        created_at,
        valid_until,
        status,
        anbieter_snapshot,
        paid_at,
        paid_amount_cents,
        refunded_amount_cents,
        currency,
        payment_intent_id,
        charge_id
      `)
      .eq('owner_id', user.id)
      // ✅ nichts fertiges anzeigen
      .is('paid_at', null)
      .not('status', 'in', '("paid","released","refunded")')
      // ✅ nur diese Stati gehören in "Angebote"
      .in('status', ['open', 'selected'])
      // ✅ abgelaufene komplett raus
      .gt('valid_until', nowIso)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[received offers] db:', error)
      return NextResponse.json(
        { ok: false, error: 'db', detail: error.message, code: (error as any).code ?? null },
        { status: 500 }
      )
    }

    // Live username + rating aus profiles
    const bieterIds = Array.from(new Set((rows ?? []).map((r: any) => String(r.bieter_id)).filter(Boolean)))

    const { data: profs, error: pErr } = bieterIds.length
      ? await admin.from('profiles').select('id, username, rating_avg, rating_count').in('id', bieterIds)
      : { data: [], error: null }

    if (pErr) {
      console.error('[received offers profiles] db:', pErr)
      return NextResponse.json(
        { ok: false, error: 'db_profiles', detail: pErr.message, code: (pErr as any).code ?? null },
        { status: 500 }
      )
    }

    const profMap = new Map<string, any>()
    for (const p of profs ?? []) profMap.set(String((p as any).id), p)

    const offers = (rows ?? []).map((r: any) => {
      const p = profMap.get(String(r.bieter_id)) || {}
      const snap = pickSnapPublic(r.anbieter_snapshot)

      return {
        id: String(r.id),
        job_id: String(r.job_id),
        bieter_id: String(r.bieter_id),

        artikel_cents: Number(r.artikel_cents ?? 0),
        versand_cents: Number(r.versand_cents ?? 0),
        gesamt_cents: Number(r.gesamt_cents ?? 0),

        created_at: String(r.created_at),
        valid_until: String(r.valid_until),

        // Status/Payment Info (für UI/Debug)
        status: String(r.status ?? ''),
        paid_at: null, // durch Filter garantiert
        paid_amount_cents: null,
        refunded_amount_cents: 0,
        currency: r.currency ? String(r.currency) : null,
        payment_intent_id: r.payment_intent_id ? String(r.payment_intent_id) : null,
        charge_id: r.charge_id ? String(r.charge_id) : null,

        // Snapshot (fix)
        snap_country: snap.snap_country || '—',
        snap_city: snap.snap_city || '—',
        snap_account_type: snap.snap_account_type || '',

        // Live aus profiles
        username: typeof p.username === 'string' && p.username.trim() ? p.username : '',
        rating_avg: typeof p.rating_avg === 'number' ? p.rating_avg : Number(p.rating_avg ?? 0) || 0,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : Number(p.rating_count ?? 0) || 0,
      }
    })

    return NextResponse.json({ ok: true, offers }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    console.error('[GET /api/offers/received] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal', detail: e?.message ?? String(e) }, { status: 500 })
  }
}
