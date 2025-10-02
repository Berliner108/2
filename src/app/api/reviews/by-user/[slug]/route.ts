// /src/app/api/reviews/by-user/[slug]/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

// exakt wie in deinen anderen Files: Titel + Extras (Ort, Menge) aus data
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
function pickRequestTitle(req?: any): string | null {
  if (!req) return null
  const base =
    (typeof req.title === 'string' && req.title.trim()) ||
    (typeof req?.data?.verfahrenstitel === 'string' && req.data.verfahrenstitel.trim()) ||
    (typeof req?.data?.verfahrenTitel  === 'string' && req.data.verfahrenTitel.trim())  ||
    (typeof req?.data?.verfahren       === 'string' && req.data.verfahren.trim())       ||
    (typeof req?.data?.titel           === 'string' && req.data.titel.trim())           ||
    (typeof req?.data?.title           === 'string' && req.data.title.trim())           ||
    null

  const ort = (typeof req?.data?.ort === 'string' && req.data.ort.trim()) || ''
  const menge = parseMenge(req?.data)
  const extras = [ort, typeof menge === 'number' ? `${menge} kg` : ''].filter(Boolean).join(' · ')
  return [base, extras].filter(Boolean).join(' — ') || null
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params
    const admin = supabaseAdmin()

    // Profil über username ODER id; bei "nicht gefunden" -> 200 + leere Liste
    let rateeId: string | null = null
    let rateeProfile: any = null

    if (isUuid(slug)) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, rating_avg, rating_count')
        .eq('id', slug)
        .limit(1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (data && data[0]) { rateeId = data[0].id; rateeProfile = data[0] }
    } else {
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, rating_avg, rating_count')
        .eq('username', slug)
        .limit(1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (data && data[0]) { rateeId = data[0].id; rateeProfile = data[0] }
    }

    // Pagination
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '10', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // wenn Nutzer unbekannt: leere Antwort (200)
    if (!rateeId) {
      return NextResponse.json({
        profile: { id: slug, username: null, ratingAvg: null, ratingCount: 0 },
        page, pageSize, total: 0, items: []
      })
    }

    // Reviews holen
    const { data: rows, count, error: revErr } = await admin
      .from('reviews')
      .select('id, order_id, rater_id, comment, created_at, stars, rating', { count: 'exact' })
      .eq('ratee_id', rateeId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 })

    // Rater-Profile (nur id + username)
    const raterIds = Array.from(new Set((rows ?? []).map(r => r.rater_id).filter(Boolean))) as string[]
    const raters = new Map<string, any>()
    if (raterIds.length) {
      const { data: profs, error } = await admin
        .from('profiles')
        .select('id, username')
        .in('id', raterIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const p of profs ?? []) raters.set(String(p.id), p)
    }

    // Orders -> request_id
    const orderIds = Array.from(new Set((rows ?? []).map(r => r.order_id).filter(Boolean))) as string[]
    const ordersById = new Map<string, { request_id: string | null }>()
    if (orderIds.length) {
      const { data: ords, error } = await admin
        .from('orders')
        .select('id, request_id')
        .in('id', orderIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const o of ords ?? []) ordersById.set(String((o as any).id), { request_id: (o as any).request_id ?? null })
    }

    // lack_requests -> Titel
    const reqIds = Array.from(new Set(Array.from(ordersById.values()).map(o => o.request_id).filter(Boolean))) as string[]
    const reqById = new Map<string, any>()
    if (reqIds.length) {
      const { data: reqs, error } = await admin
        .from('lack_requests')
        .select('id, title, data')
        .in('id', reqIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const r of reqs ?? []) reqById.set(String((r as any).id), r)
    }

    // Stars sauber 1–5 ableiten (stars bevorzugt, sonst rating numerisch)
    const toStars = (row: any): number => {
      const raw = row.stars ?? row.rating
      const n = Number(raw)
      if (isFinite(n)) return Math.max(1, Math.min(5, Math.round(n)))
      return 5
    }

    const items = (rows ?? []).map(r => {
      const orderId = String(r.order_id)
      const requestId = ordersById.get(orderId)?.request_id ?? null
      const req = requestId ? reqById.get(String(requestId)) : null

      const p = raters.get(String(r.rater_id))

      return {
        id: r.id,
        createdAt: r.created_at,
        comment: r.comment || '',
        stars: toStars(r),
        rater: p
          ? { id: p.id, username: p.username || null }
          : { id: r.rater_id, username: null },
        orderId,
        requestId: requestId ? String(requestId) : null,
        requestTitle: pickRequestTitle(req),
      }
    })

    return NextResponse.json({
      profile: {
        id: rateeProfile.id,
        username: rateeProfile.username || null,
        ratingAvg: rateeProfile.rating_avg,
        ratingCount: rateeProfile.rating_count,
      },
      page, pageSize, total: count ?? 0, items
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list reviews' }, { status: 500 })
  }
}
