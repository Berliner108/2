// /src/app/api/lack/offers/for-account/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type ReqRow = {
  id: string
  title: string | null
  lieferdatum: string | null
  delivery_at: string | null
  data: Record<string, any> | null
  status: string | null
}

export async function GET() {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // 1) Nur DEINE Lackanfragen laden (kein Börsen-Feed)
    const { data: myReqs, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, title, lieferdatum, delivery_at, data, status')
      .eq('owner_id', user.id)
      .in('status', ['open', 'awarded'])

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 })

    const requests: ReqRow[] = (myReqs || []) as any
    const reqIds = requests.map(r => String(r.id))
    const nowIso = new Date().toISOString()

    // 2) Erhaltene Angebote für diese Requests (nur aktive & nicht abgelaufen)
    let received: Array<{
      id: string
      request_id: string
      supplier_id: string | null
      amount_cents: number
      created_at: string
      expires_at: string | null
      status: string
    }> = []

    if (reqIds.length) {
      const { data: rec, error: recErr } = await sb
        .from('lack_offers')
        .select('id, request_id, supplier_id, amount_cents, created_at, expires_at, status')
        .in('request_id', reqIds)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

      if (recErr) return NextResponse.json({ error: recErr.message }, { status: 400 })
      received = (rec || []) as any
    }

    // 3) Vendor-Infos (Username + Rating) aus profiles per Admin-Client (um RLS-Probleme zu vermeiden)
    const supplierIds = Array.from(
      new Set(received.map(o => o.supplier_id).filter((v): v is string => !!v))
    )

    const vendors = new Map<string, {
      display: string
      handle: string | null
      rating?: number | null
      rating_count?: number | null
    }>()
    if (supplierIds.length) {
      const admin = supabaseAdmin()
      const { data: profs } = await admin
        .from('profiles')
        .select('id, username, display_name, company_name, rating_avg, rating_count')
        .in('id', supplierIds)

      for (const p of (profs || []) as any[]) {
        const display =
          p.display_name?.trim?.() ||
          p.username?.trim?.() ||
          p.company_name?.trim?.() ||
          'Anbieter'
        const handle = (p.username && String(p.username).trim()) || null
        const rating = typeof p.rating_avg === 'number' ? p.rating_avg : (p.rating_avg != null ? Number(p.rating_avg) : null)
        const rating_count = typeof p.rating_count === 'number' ? p.rating_count : (p.rating_count != null ? Number(p.rating_count) : null)
        vendors.set(p.id, { display, handle, rating, rating_count })
      }
    }

    const receivedOut = received.map(o => {
      const v = o.supplier_id ? vendors.get(o.supplier_id) : undefined
      const vendorName = v?.display || 'Anbieter'
      const vendorUsername = v?.handle ?? null
      const vendorRating = (typeof v?.rating === 'number' && isFinite(v.rating)) ? v.rating : null
      const vendorRatingCount = (typeof v?.rating_count === 'number' && isFinite(v.rating_count)) ? v.rating_count : null

      return {
        id: o.id,
        requestId: o.request_id,
        vendorName,
        vendorUsername, // <- Handle (@username) zusätzlich
        vendorRating,
        vendorRatingCount,
        priceCents: o.amount_cents,
        createdAt: o.created_at,
        // expiresAt optional, Frontend berechnet "gültig bis" aus createdAt & lieferdatum
        expiresAt: o.expires_at,
      }
    })

    // 4) Deine eigenen abgegebenen Angebote (als Anbieter)
    const { data: sub, error: subErr } = await sb
      .from('lack_offers')
      .select('id, request_id, amount_cents, created_at, expires_at, status')
      .eq('supplier_id', user.id)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 400 })

    const submittedOut = (sub || []).map((o: any) => ({
      id: o.id as string,
      requestId: o.request_id as string,
      vendorName: 'Du',
      vendorUsername: null as string | null,
      vendorRating: null,
      vendorRatingCount: null,
      priceCents: o.amount_cents as number,
      createdAt: o.created_at as string,
      expiresAt: o.expires_at as (string | null),
    }))

    // 5) Request-Metadaten (für Titel + Lieferdatum im FE)
    const requestsOut = requests.map(r => ({
      id: String(r.id),
      title: r.title ?? null,
      lieferdatum: r.lieferdatum ?? null,
      delivery_at: r.delivery_at ?? null,
      data: r.data ?? null,
    }))

    return NextResponse.json({
      received: receivedOut,
      submitted: submittedOut,
      requestIds: reqIds,
      requests: requestsOut,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list offers' }, { status: 500 })
  }
}
