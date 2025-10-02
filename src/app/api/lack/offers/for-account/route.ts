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
  owner_id?: string | null
  published?: any
}

type OfferRow = {
  id: string
  request_id: string
  supplier_id: string | null
  amount_cents: number | null
  item_amount_cents: number | null
  shipping_cents: number | null
  created_at: string
  expires_at: string | null
  status: string
}

/** Akzeptiert true, 'true', 't', '1', 'yes', 'on' (Groß/Klein egal) */
function isPublished(v: any): boolean {
  if (v === true) return true
  if (typeof v === 'number') return v === 1
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === 'true' || s === 't' || s === '1' || s === 'yes' || s === 'on'
  }
  return false
}

export async function GET() {
  try {
    const sb = await supabaseServer()
    const admin = supabaseAdmin()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const nowIso = new Date().toISOString()

    // 1) Deine Requests (für "Erhaltene Angebote"); published später gefiltert
    const { data: myReqsRaw, error: reqErr } = await sb
      .from('lack_requests')
      .select('id, title, lieferdatum, delivery_at, data, status, published')
      .eq('owner_id', user.id)
      .eq('status', 'open')

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 })

    const myRequestsAll: ReqRow[] = (myReqsRaw ?? []) as any
    const myRequests: ReqRow[] = myRequestsAll.filter(r => isPublished(r.published))
    const myReqIds = myRequests.map(r => String(r.id))

    // 2) Erhaltene Angebote (aktiv & nicht abgelaufen) zu deinen veröffentlichten Requests
    let received: OfferRow[] = []
    if (myReqIds.length) {
      const { data: rec, error: recErr } = await sb
        .from('lack_offers')
        .select('id, request_id, supplier_id, amount_cents, item_amount_cents, shipping_cents, created_at, expires_at, status')
        .in('request_id', myReqIds)
        .eq('status', 'active')
        .not('supplier_id', 'is', null) // Anbieter muss existieren
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

      if (recErr) return NextResponse.json({ error: recErr.message }, { status: 400 })
      received = (rec ?? []) as any
    }

    // 3) Deine abgegebenen Angebote (du = supplier) – noch ohne published-Filter
    const { data: sub, error: subErr } = await sb
      .from('lack_offers')
      .select('id, request_id, amount_cents, item_amount_cents, shipping_cents, created_at, expires_at, status')
      .eq('supplier_id', user.id)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)

    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 400 })
    const submittedAll: OfferRow[] = (sub ?? []) as any

    // === Zusatz-Metadaten nur für Requests, auf die du geboten hast (und nicht deine eigenen)
    const submittedReqIdsAll = Array.from(new Set(submittedAll.map(o => String(o.request_id))))
    const extraReqIds = submittedReqIdsAll.filter(id => !myReqIds.includes(id))

    // 4) Anbieter-Infos (für received) – nur benötigte supplier_ids
    const supplierIds = Array.from(
      new Set(received.map(o => o.supplier_id).filter((v): v is string => !!v))
    )

    const vendors = new Map<string, {
      handle: string | null
      display: string | null
      rating?: number | null
      rating_count?: number | null
    }>()

    if (supplierIds.length) {
      const { data: profs, error: profErr } = await admin
        .from('profiles')
        .select('id, username, company_name, rating_avg, rating_count')
        .in('id', supplierIds)

      if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 })

      for (const p of (profs ?? []) as any[]) {
        const handle  = (typeof p.username === 'string' && p.username.trim()) || null
        const display = (typeof p.company_name === 'string' && p.company_name.trim()) || null
        const rating = typeof p.rating_avg === 'number' ? p.rating_avg
                    : (p.rating_avg != null ? Number(p.rating_avg) : null)
        const rating_count = typeof p.rating_count === 'number' ? p.rating_count
                          : (p.rating_count != null ? Number(p.rating_count) : null)
        vendors.set(p.id, { handle, display, rating, rating_count })
      }
    }

    // === Username-only für Anbieter ausliefern (Company NICHT mehr verwenden) ===
    const receivedOut = received.map(o => {
      const v = o.supplier_id ? vendors.get(o.supplier_id) : undefined
      const vendorUsername = v?.handle ?? null
      // Username als angezeigter Name; KEIN Company-Fallback
      const vendorName     = vendorUsername || 'Anbieter'
      // Company bewusst nicht mehr nach außen geben (oder als null)
      const vendorDisplay  = null as string | null

      const vendorRating = (typeof v?.rating === 'number' && isFinite(v.rating)) ? v.rating : null
      const vendorRatingCount = (typeof v?.rating_count === 'number' && isFinite(v.rating_count)) ? v.rating_count : null

      const item = Number.isFinite(o.item_amount_cents) ? Number(o.item_amount_cents) : (Number.isFinite(o.amount_cents) ? Number(o.amount_cents) : 0)
      const ship = Number.isFinite(o.shipping_cents) ? Number(o.shipping_cents) : 0
      const total = Number.isFinite(o.amount_cents) ? Number(o.amount_cents) : (item + ship)

      return {
        id: o.id,
        requestId: o.request_id,
        vendorName,
        vendorUsername,
        vendorDisplay,
        vendorRating,
        vendorRatingCount,
        priceCents: total,
        itemCents: item,
        shippingCents: ship,
        createdAt: o.created_at,
        expiresAt: o.expires_at,
      }
    })

    // 5) Extra-Requests (fremde) laden und **auf published filtern**
    let extraReqsPublished: ReqRow[] = []
    if (extraReqIds.length) {
      const { data: extraRows, error: extraErr } = await admin
        .from('lack_requests')
        .select('id, title, lieferdatum, delivery_at, data, status, owner_id, published')
        .in('id', extraReqIds)

      if (extraErr) return NextResponse.json({ error: extraErr.message }, { status: 400 })
      extraReqsPublished = ((extraRows ?? []) as ReqRow[]).filter(r => isPublished(r.published))
    }

    // 6) SUBMITTED auf veröffentlichte Requests einschränken:
    const allowedSubmittedIds = new Set<string>([
      ...myReqIds,
      ...extraReqsPublished.map(r => String(r.id)),
    ])
    const submitted: OfferRow[] = submittedAll.filter(o => allowedSubmittedIds.has(String(o.request_id)))

    // 7) Abgegebene (submitted) normalisieren
    const submittedOut = submitted.map((o) => {
      const item = Number.isFinite(o.item_amount_cents) ? Number(o.item_amount_cents) : (Number.isFinite(o.amount_cents) ? Number(o.amount_cents) : 0)
      const ship = Number.isFinite(o.shipping_cents) ? Number(o.shipping_cents) : 0
      const total = Number.isFinite(o.amount_cents) ? Number(o.amount_cents) : (item + ship)

      return {
        id: o.id,
        requestId: o.request_id,
        vendorName: 'Du',
        vendorUsername: null as string | null,
        vendorDisplay: null as string | null,
        vendorRating: null,
        vendorRatingCount: null,
        priceCents: total,
        itemCents: item,
        shippingCents: ship,
        createdAt: o.created_at,
        expiresAt: o.expires_at,
      }
    })

    // 8) Request-Metadaten fürs FE (eigene + veröffentlichte „extra“)
    const allReqRows: ReqRow[] = [
      ...myRequests.map(r => ({ ...r, owner_id: user.id } as ReqRow)),
      ...extraReqsPublished,
    ]

    const ownerIds = Array.from(new Set(allReqRows.map(r => r.owner_id).filter(Boolean))) as string[]

    const owners = new Map<string, {
      handle: string | null
      display: string | null
      rating?: number | null
      rating_count?: number | null
    }>()

    if (ownerIds.length) {
      const { data: ownerProfs, error: ownerErr } = await admin
        .from('profiles')
        .select('id, username, company_name, rating_avg, rating_count')
        .in('id', ownerIds)

      if (ownerErr) return NextResponse.json({ error: ownerErr.message }, { status: 400 })

      for (const p of (ownerProfs ?? []) as any[]) {
        owners.set(p.id, {
          handle: (p.username && String(p.username).trim()) || null,
          display: null, // Company NICHT mehr exportieren
          rating: typeof p.rating_avg === 'number' ? p.rating_avg : (p.rating_avg != null ? Number(p.rating_avg) : null),
          rating_count: typeof p.rating_count === 'number' ? p.rating_count : (p.rating_count != null ? Number(p.rating_count) : null),
        })
      }
    }

    // 9) Requests fürs FE (mit Owner-Infos); Dedupe nach id
    const seen = new Set<string>()
    const requestsOut = allReqRows
      .filter(r => {
        const id = String(r.id)
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
      .map(r => {
        const owner = r.owner_id ? owners.get(r.owner_id) : undefined
        return {
          id: String(r.id),
          title: r.title ?? null,
          lieferdatum: r.lieferdatum ?? null,
          delivery_at: r.delivery_at ?? null,
          data: r.data ?? null,
          ownerId: r.owner_id ?? null,
          ownerHandle: owner?.handle ?? null,
          ownerDisplay: null as string | null, // Company unterdrücken
          ownerRating: (typeof owner?.rating === 'number' && isFinite(owner.rating!)) ? owner!.rating : null,
          ownerRatingCount: (typeof owner?.rating_count === 'number' && isFinite(owner.rating_count!)) ? owner!.rating_count : null,
        }
      })

    return NextResponse.json({
      received: receivedOut,
      submitted: submittedOut,
      requestIds: myReqIds,   // nur DEINE (bereits published)
      requests: requestsOut,  // eigene + veröffentlichte der submitted (ohne Company-Namen)
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list offers' }, { status: 500 })
  }
}
