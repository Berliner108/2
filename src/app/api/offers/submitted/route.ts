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

    /**
     * Ziel:
     * - Konto/Angebote (submitted) zeigt NUR nicht-bezahlte Angebote
     * - Offers zu Jobs, die bereits vergeben sind (selected_offer_id gesetzt):
     *   -> nur das ausgewählte Offer (falls es deins ist) bleibt sichtbar
     * - status muss mit raus
     */
    const { data: rows, error } = await admin
      .from('job_offers')
      .select(
        `
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
        refunded_amount_cents,
        jobs!inner(
          id,
          selected_offer_id
        )
      `
      )
      .eq('bieter_id', user.id)
      .is('paid_at', null)
      .in('status', ['open', 'selected'])
      // gültig ODER selected (damit selected nicht verschwindet, wenn valid_until vorbei ist)
      .or(`valid_until.gt.${nowIso},status.eq.selected`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[submitted offers] db:', error)
      return NextResponse.json({ ok: false, error: 'db' }, { status: 500 })
    }

    // Wenn Job bereits selected_offer_id hat => nur das selected Offer behalten
    const filtered = (rows ?? []).filter((r: any) => {
      const sel = r?.jobs?.selected_offer_id
      if (!sel) return true
      return String(sel) === String(r.id)
    })

    // Jobs zu diesen Offers nachladen (für Titel-Daten)
    const jobIds = Array.from(new Set(filtered.map((r: any) => String(r.job_id)).filter(Boolean)))

    let jobsById = new Map<string, any>()
    if (jobIds.length > 0) {
      const { data: jobRows, error: jErr } = await admin
        .from('jobs')
        .select(
          `
          id,
          user_id,
          verfahren_1,
          verfahren_2,
          material_guete,
          material_guete_custom
        `
        )
        .in('id', jobIds)

      if (jErr) {
        console.error('[submitted offers jobs] db:', jErr)
      } else {
        jobsById = new Map((jobRows ?? []).map((j: any) => [String(j.id), j]))
      }
    }

    // Owner-Profile (Auftraggeber) nachladen -> username + rating + address (zip/city)
    const ownerIds = Array.from(new Set(filtered.map((r: any) => String(r.owner_id)).filter(Boolean)))

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

    // Offers ausgeben (inkl. job-title Daten + owner Daten)
    const offers = filtered.map((r: any) => {
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

        // ✅ status für UI (open | selected)
        status: String(r.status),

        // optional (hilft später, falls du "refund requested" o.ä. visualisieren willst)
        refunded_amount_cents: Number(r.refunded_amount_cents ?? 0),

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
