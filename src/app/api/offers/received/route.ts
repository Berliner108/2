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
     * WICHTIG:
     * - Nur Angebote für Jobs des Owners
     * - Nur NICHT bezahlte Angebote (paid_at IS NULL)
     * - Nur offene/ausgewählte Angebote (open/selected)
     * - Nur gültige Angebote (valid_until > now) ODER selected (optional)
     * - Wenn jobs.selected_offer_id gesetzt ist: nur dieses eine Angebot anzeigen, alle anderen raus
     */
    const { data: rows, error } = await admin
      .from('job_offers')
      .select(
        `
        id,
        job_id,
        bieter_id,
        artikel_cents,
        versand_cents,
        gesamt_cents,
        created_at,
        valid_until,
        status,
        anbieter_snapshot,
        paid_at,
        refunded_amount_cents,
        jobs!inner(
          id,
          selected_offer_id
        )
      `
      )
      .eq('owner_id', user.id)
      .is('paid_at', null)
      .in('status', ['open', 'selected'])
      // gültig ODER selected (damit selected nicht "verschwindet", wenn valid_until abläuft)
      .or(`valid_until.gt.${nowIso},status.eq.selected`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[received offers] db:', error)
      return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
    }

    // Nur Angebote behalten, die zum selected_offer_id passen (falls gesetzt)
    const filtered = (rows ?? []).filter((r: any) => {
      const sel = r?.jobs?.selected_offer_id
      if (!sel) return true
      return String(sel) === String(r.id)
    })

    const bieterIds = Array.from(
      new Set(filtered.map((r: any) => String(r.bieter_id)).filter(Boolean))
    )

    const { data: profs, error: pErr } = bieterIds.length
      ? await admin.from('profiles').select('id, username, rating_avg, rating_count').in('id', bieterIds)
      : { data: [], error: null }

    if (pErr) {
      console.error('[received offers profiles] db:', pErr)
      return NextResponse.json({ ok: false, error: 'db_profiles' }, { status: 500 })
    }

    const profMap = new Map<string, any>()
    for (const p of profs ?? []) profMap.set(String((p as any).id), p)

    const offers = filtered.map((r: any) => {
      const p = profMap.get(String(r.bieter_id)) || {}
      const snap = pickSnapPublic(r.anbieter_snapshot)

      return {
        id: String(r.id),
        job_id: String(r.job_id),
        bieter_id: String(r.bieter_id),

        artikel_cents: Number(r.artikel_cents),
        versand_cents: Number(r.versand_cents),
        gesamt_cents: Number(r.gesamt_cents),

        created_at: String(r.created_at),
        valid_until: String(r.valid_until),

        // WICHTIG: Status für UI
        status: String(r.status), // open | selected (paid kommt hier nicht mehr rein)

        // optional: falls du später auch "refunded" in Angebote anzeigen willst
        refunded_amount_cents: Number(r.refunded_amount_cents ?? 0),

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
  } catch (e) {
    console.error('[GET /api/offers/received] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal' }, { status: 500 })
  }
}
