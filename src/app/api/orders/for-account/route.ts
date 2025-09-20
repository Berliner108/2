// /src/app/api/orders/for-account/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type UiStatus = 'in_progress' | 'reported' | 'disputed' | 'confirmed'
type UiKind   = 'vergeben' | 'angenommen'

// UI-Status aus Order-Spalten ableiten (robust gegen neue Backend-Status)
const uiStatus = (r: any): UiStatus => {
  // bevorzugt harte Felder
  if (r.released_at) return 'confirmed'
  if (r.dispute_opened_at) return 'disputed'
  if (r.reported_at) return 'reported'
  // fallback: mappe orders.status, falls Felder leer
  const s = String(r.status ?? '').toLowerCase()
  if (s === 'released') return 'confirmed'
  if (s === 'processing' || s === 'requires_confirmation' || s === 'funds_held') return 'in_progress'
  if (s === 'canceled') return 'in_progress' // im UI nicht gesondert darstellen
  return 'in_progress'
}

// Menge aus lack_requests.data best-effort schätzen
function parseMenge(d?: Record<string, any> | null): number | undefined {
  if (!d) return undefined
  const cands = [d.menge, d.menge_kg, d.max_masse, d.gewicht, d.maxMasse, d.max_gewicht]
  for (const c of cands) {
    const n = typeof c === 'string' ? parseFloat(c.replace(',', '.'))
            : typeof c === 'number' ? c : NaN
    if (isFinite(n) && n > 0) return n
  }
  return undefined
}

const pickLiefer = (req: any) =>
  req?.lieferdatum ?? req?.delivery_at ?? req?.data?.lieferdatum ?? req?.data?.delivery_at ?? null

const addDaysIso = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 86400_000).toISOString()

export async function GET() {
  try {
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // 1) Alle Lack-Orders, wo du Buyer ODER Supplier bist
    const { data: orders, error: ordErr } = await sb
      .from('orders')
      .select(`
        id, created_at, buyer_id, supplier_id, kind, request_id, offer_id,
        amount_cents, currency, status,
        reported_at, released_at, refunded_at, dispute_opened_at,
        auto_release_at, shipped_at, auto_refund_at
      `)
      .eq('kind', 'lack')
      .or(`buyer_id.eq.${user.id},supplier_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 })
    const rows = orders ?? []
    if (rows.length === 0) return NextResponse.json({ vergeben: [], angenommen: [] })

    // 2) IDs einsammeln
    const offerIds    = Array.from(new Set(rows.map(r => r.offer_id).filter(Boolean))) as string[]
    const reqIds      = Array.from(new Set(rows.map(r => r.request_id).filter(Boolean))) as string[]
    const supplierIds = Array.from(new Set(rows.map(r => r.supplier_id).filter(Boolean))) as string[]
    const orderIds    = rows.map(r => String(r.id))

    const admin = supabaseAdmin()

    // 2.5) Eigene Reviews (damit FE "Bewerten"-Button ausblenden kann)
    let myReviewMap = new Map<string, { stars: number; comment: string }>()
    if (orderIds.length) {
      const { data: myRevs, error: myRevErr } = await admin
        .from('reviews')
        .select('order_id, stars, comment')
        .in('order_id', orderIds)
        .eq('rater_id', user.id)
      if (myRevErr) return NextResponse.json({ error: myRevErr.message }, { status: 500 })
      myReviewMap = new Map(
        (myRevs ?? []).map((r: any) => [
          String(r.order_id),
          { stars: Number(r.stars), comment: String(r.comment ?? '') },
        ])
      )
    }

    // 3) lack_offers → item/shipping (optional)
    const offersById = new Map<string, { item_amount_cents: number | null; shipping_cents: number | null }>()
    if (offerIds.length) {
      const { data: ofs, error } = await admin
        .from('lack_offers')
        .select('id, item_amount_cents, shipping_cents')
        .in('id', offerIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const o of ofs ?? []) {
        offersById.set(String(o.id), {
          item_amount_cents: (o as any).item_amount_cents ?? null,
          shipping_cents: (o as any).shipping_cents ?? null,
        })
      }
    }

    // 4) lack_requests → Meta (optional)
    const reqById = new Map<string, any>()
    if (reqIds.length) {
      const { data: reqs, error } = await admin
        .from('lack_requests')
        .select('id, owner_id, title, lieferdatum, delivery_at, data')
        .in('id', reqIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const r of reqs ?? []) reqById.set(String(r.id), r)
    }

    // 5) profiles → Anbieter (supplier) + optional Auftraggeber (owner)
    const ownerIds = Array.from(new Set(
      Array.from(reqById.values()).map((r: any) => r.owner_id).filter(Boolean)
    )) as string[]
    const profileIds = Array.from(new Set([...supplierIds, ...ownerIds]))
    type Prof = { id: string; username: string | null; company_name: string | null; rating_avg: number | null; rating_count: number | null }
    const profById = new Map<string, Prof>()
    if (profileIds.length) {
      const { data: profs, error } = await admin
        .from('profiles')
        .select('id, username, company_name, rating_avg, rating_count')
        .in('id', profileIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const p of profs ?? []) profById.set(String(p.id), p as Prof)
    }

    // 6) Mapper → UI-Objekt
    const toUi = (r: any) => {
      const kind: UiKind = r.buyer_id === user.id ? 'vergeben' : 'angenommen'

      // Anbieter
      const vProf = r.supplier_id ? profById.get(String(r.supplier_id)) : undefined
      const vendorUsername = vProf?.username?.trim() || null
      const vendorDisplay  = vProf?.company_name?.trim() || null
      const vendorName     = vendorDisplay || vendorUsername || 'Anbieter'
      const vendorRating      = (typeof vProf?.rating_avg === 'number') ? vProf!.rating_avg : (vProf?.rating_avg != null ? Number(vProf.rating_avg) : null)
      const vendorRatingCount = (typeof vProf?.rating_count === 'number') ? vProf!.rating_count : (vProf?.rating_count != null ? Number(vProf.rating_count) : null)

      // Request-Meta
      const req = reqById.get(String(r.request_id))
      const title = req?.title ?? req?.data?.verfahrenstitel ?? req?.data?.verfahrenTitel ?? req?.data?.verfahren ?? null
      const lieferdatum = pickLiefer(req)
      const ort   = req?.data?.ort ?? null
      const menge = parseMenge(req?.data ?? null)

      // Auftraggeber-Profil
      const oProf = req?.owner_id ? profById.get(String(req.owner_id)) : undefined
      const ownerHandle = oProf?.username?.trim() || null
      const ownerDisplay = oProf?.company_name?.trim() || null
      const ownerRating      = (typeof oProf?.rating_avg === 'number') ? oProf!.rating_avg : (oProf?.rating_avg != null ? Number(oProf.rating_avg) : null)
      const ownerRatingCount = (typeof oProf?.rating_count === 'number') ? oProf!.rating_count : (oProf?.rating_count != null ? Number(oProf?.rating_count) : null)

      // Preisaufschlüsselung
      const off = r.offer_id ? offersById.get(String(r.offer_id)) : undefined

      // Fallback-Deadlines (falls auto_* leer)
      const releaseAtUi =
        r.auto_release_at ??
        (r.reported_at ? addDaysIso(r.reported_at, 28) : null)

      const refundAtUi =
        r.auto_refund_at ??
        (req?.lieferdatum
          ? new Date(new Date(req.lieferdatum).setHours(23, 59, 59, 999)).toISOString()
          : null)

      // Eigene Bewertung
      const mine = myReviewMap.get(String(r.id))
      const myReview = mine
        ? { stars: Math.max(1, Math.min(5, Number(mine.stars))) as 1|2|3|4|5, text: String(mine.comment ?? '') }
        : undefined

      return {
        orderId: String(r.id),
        requestId: String(r.request_id),
        offerId: r.offer_id ?? undefined,
        amountCents: Number(r.amount_cents),
        itemCents: (typeof off?.item_amount_cents === 'number') ? off!.item_amount_cents : undefined,
        shippingCents: (typeof off?.shipping_cents === 'number') ? off!.shipping_cents : undefined,
        acceptedAt: String(r.created_at),
        kind,

        vendor: vendorName,

        vendorName,
        vendorUsername,
        vendorDisplay,
        vendorRating,
        vendorRatingCount,
        vendorId: r.supplier_id ?? null,
        ownerId : req?.owner_id ?? null,

        title,
        ort,
        lieferdatum,
        mengeKg: typeof menge === 'number' ? menge : null,

        ownerHandle,
        ownerDisplay,
        ownerRating,
        ownerRatingCount,

        status: uiStatus(r) as UiStatus,
        deliveredReportedAt: r.reported_at ?? undefined,
        deliveredConfirmedAt: r.released_at ?? undefined,
        autoReleaseAt: releaseAtUi ?? undefined,
        disputeOpenedAt: r.dispute_opened_at ?? undefined,

        shippedAt: r.shipped_at ?? undefined,
        autoRefundAt: refundAtUi ?? undefined,
        refundedAt: r.refunded_at ?? undefined,

        myReview,
      }
    }

    const vergeben   = rows.filter(r => r.buyer_id    === user.id).map(toUi)
    const angenommen = rows.filter(r => r.supplier_id === user.id).map(toUi)

    return NextResponse.json({ vergeben, angenommen })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list orders' }, { status: 500 })
  }
}
