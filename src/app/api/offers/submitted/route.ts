// src/app/api/offers/submitted/route.ts
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

    // 1) Nur aktive, eigene abgegebene Angebote
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
        anbieter_snapshot
      `)
      .eq('bieter_id', user.id)
      .gt('valid_until', nowIso)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[submitted offers] db:', error)
      return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
    }

    // 2) Jobs zu diesen Offers nachladen (für Titel-Daten)
    const jobIds = Array.from(new Set((rows ?? []).map((r: any) => String(r.job_id)).filter(Boolean)))

    let jobsById = new Map<string, any>()
    if (jobIds.length > 0) {
      const { data: jobRows, error: jErr } = await admin
        .from('jobs')
        .select(`
          id,
          user_id,
          verfahren_1,
          verfahren_2,
          material_guete,
          material_guete_custom
        `)
        .in('id', jobIds)

      if (jErr) {
        console.error('[submitted offers jobs] db:', jErr)
      } else {
        jobsById = new Map((jobRows ?? []).map((j: any) => [String(j.id), j]))
      }
    }

    // 3) Owner-Profile (Auftraggeber) nachladen -> username + rating + address (zip/city)
    //    ✅ ownerIds NICHT aus jobsById, sondern aus rows.owner_id
    const ownerIds = Array.from(new Set((rows ?? []).map((r: any) => String(r.owner_id)).filter(Boolean)))

    let ownersById = new Map<string, any>()
    if (ownerIds.length > 0) {
      const { data: ownerRows, error: oErr } = await admin
        .from('profiles')
        .select('id, username, rating_avg, rating_count, address')
        .in('id', ownerIds)

      if (oErr) {
        console.error('[submitted offers owners] db:', oErr)
      } else {
        ownersById = new Map((ownerRows ?? []).map((p: any) => [String(p.id), p]))
      }
    }

    // 4) Offers ausgeben (inkl. job-title Daten + owner Daten)
    const offers = (rows ?? []).map((r: any) => {
      const snap = pickSnapPublic(r.anbieter_snapshot)

      const job = jobsById.get(String(r.job_id))
      const ownerId = String(r.owner_id ?? '')
      const owner = ownersById.get(ownerId)
      const addr = (owner?.address ?? {}) as any

      const job_verfahren_1 = String(job?.verfahren_1 ?? '')
      const job_verfahren_2 = String(job?.verfahren_2 ?? '')
      const job_material = String(job?.material_guete_custom || job?.material_guete || '')

      return {
        id: String(r.id),
        job_id: String(r.job_id),

        // ✅ Titel-Daten fürs Frontend
        job_verfahren_1,
        job_verfahren_2,
        job_material,

        artikel_cents: Number(r.artikel_cents ?? 0),
        versand_cents: Number(r.versand_cents ?? 0),
        gesamt_cents: Number(r.gesamt_cents ?? 0),

        created_at: String(r.created_at),
        valid_until: String(r.valid_until),

        // Snapshot (fix, nicht live)
        snap_country: snap.snap_country || '—',
        snap_city: snap.snap_city || '—',
        snap_account_type: snap.snap_account_type || '',

        // ✅ Auftraggeber (Owner)
        owner_username: String(owner?.username ?? ''),
        owner_rating_avg:
          typeof owner?.rating_avg === 'number' ? owner.rating_avg : Number(owner?.rating_avg ?? 0) || 0,
        owner_rating_count:
          typeof owner?.rating_count === 'number' ? owner.rating_count : Number(owner?.rating_count ?? 0) || 0,
        owner_city: String(addr?.city ?? '—'),
        owner_zip: String(addr?.zip ?? '—'),
      }
    })

    return NextResponse.json({ ok: true, offers }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[GET /api/offers/submitted] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal' }, { status: 500 })
  }
}
