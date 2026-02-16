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
    const n =
      typeof c === 'string' ? parseFloat(c.replace(',', '.')) :
      typeof c === 'number' ? c :
      NaN
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
      if (data && data[0]) {
        rateeId = data[0].id
        rateeProfile = data[0]
      }
    } else {
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, rating_avg, rating_count')
        .eq('username', slug)
        .limit(1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (data && data[0]) {
        rateeId = data[0].id
        rateeProfile = data[0]
      }
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
        page,
        pageSize,
        total: 0,
        items: [],
      })
    }

    // Reviews holen (✅ job_id NUR zusätzlich)
    const { data: rows, count, error: revErr } = await admin
      .from('reviews')
      .select('id, order_id, shop_order_id, job_id, rater_id, comment, created_at, stars, rating', { count: 'exact' })
      .eq('ratee_id', rateeId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (revErr) return NextResponse.json({ error: revErr.message }, { status: 500 })

    // Rater-Profile (nur id + username)
    const raterIds = Array.from(new Set((rows ?? []).map((r: any) => r.rater_id).filter(Boolean))) as string[]
    const raters = new Map<string, any>()
    if (raterIds.length) {
      const { data: profs, error } = await admin
        .from('profiles')
        .select('id, username')
        .in('id', raterIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const p of profs ?? []) raters.set(String((p as any).id), p)
    }

    // Reviews -> order_ids (kann lack-orders ODER shop_orders sein)
    // --- IDs getrennt sammeln ---
    const lackOrderIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.order_id).filter(Boolean).map(String))
    ) as string[]

    const shopOrderIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.shop_order_id).filter(Boolean).map(String))
    ) as string[]

    // ✅ NEU: jobIds (nur zusätzlich)
    const jobIds = Array.from(
      new Set((rows ?? []).map((r: any) => (r as any).job_id).filter(Boolean).map(String))
    ) as string[]

    // 1) Lack-Orders -> request_id
    const ordersById = new Map<string, { request_id: string | null }>()
    if (lackOrderIds.length) {
      const { data: ords, error } = await admin
        .from('orders')
        .select('id, request_id')
        .in('id', lackOrderIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const o of ords ?? []) {
        ordersById.set(String((o as any).id), { request_id: (o as any).request_id ?? null })
      }
    }

    // 2) Shop-Orders -> article + title
    const shopById = new Map<string, { article_id: string | null; title: string | null }>()
    if (shopOrderIds.length) {
      const { data: shops, error } = await admin
        .from('shop_orders')
        .select('id, article_id, articles ( title )')
        .in('id', shopOrderIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      for (const s of shops ?? []) {
        const t = Array.isArray((s as any).articles)
          ? ((s as any).articles[0]?.title ?? null)
          : ((s as any).articles?.title ?? null)

        shopById.set(String((s as any).id), {
          article_id: (s as any).article_id ?? null,
          title: t,
        })
      }
    }

    // ✅ NEU: Jobs -> verfahren_1 (nur zusätzlich)
    const jobsById = new Map<string, { verfahren_1: string | null }>()
    if (jobIds.length) {
      const { data: js, error } = await admin
        .from('jobs')
        .select('id, verfahren_1')
        .in('id', jobIds)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      for (const j of js ?? []) {
        jobsById.set(String((j as any).id), { verfahren_1: (j as any).verfahren_1 ?? null })
      }
    }

    // lack_requests -> Titel
    const reqIds = Array.from(
      new Set(Array.from(ordersById.values()).map((o) => o.request_id).filter(Boolean))
    ) as string[]

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

    const items = (rows ?? []).map((r: any) => {
      const lackOrderId = r.order_id ? String(r.order_id) : null
      const shopOrderId = r.shop_order_id ? String(r.shop_order_id) : null

      const isShop = !!shopOrderId
      const p = raters.get(String(r.rater_id))

      // Lack-Kontext
      const requestId = !isShop && lackOrderId ? (ordersById.get(lackOrderId)?.request_id ?? null) : null
      const req = requestId ? reqById.get(String(requestId)) : null

      // Shop-Kontext
      const shop = isShop && shopOrderId ? (shopById.get(shopOrderId) ?? null) : null

      // ✅ NEU: Job-Kontext (nur zusätzlich)
      const jobId = (r as any).job_id ? String((r as any).job_id) : null
      const jobRow = jobId ? (jobsById.get(jobId) ?? null) : null
      const jobTitle =
        jobRow?.verfahren_1 && String(jobRow.verfahren_1).trim()
          ? String(jobRow.verfahren_1).trim()
          : null

      return {
        id: r.id,
        createdAt: r.created_at,
        comment: r.comment || '',
        stars: toStars(r),

        rater: p
          ? { id: (p as any).id, username: (p as any).username || null }
          : { id: r.rater_id, username: null },

        // ✅ Lack: (UNVERÄNDERT)
        orderId: !isShop ? (lackOrderId ?? null) : null,
        requestId: !isShop ? (requestId ? String(requestId) : null) : null,
        requestTitle: !isShop ? pickRequestTitle(req) : null,

        // ✅ Shop: (UNVERÄNDERT)
        shopOrderId: isShop ? shopOrderId : null,
        productId: isShop ? (shop?.article_id ?? null) : null,
        productTitle: isShop ? (shop?.title ?? null) : null,

        // ✅ NEU: Auftrag (nur hinzufügen)
        jobId,
        jobTitle,
      }
    })

    return NextResponse.json({
      profile: {
        id: rateeProfile.id,
        username: rateeProfile.username || null,
        ratingAvg: rateeProfile.rating_avg,
        ratingCount: rateeProfile.rating_count,
      },
      page,
      pageSize,
      total: count ?? 0,
      items,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list reviews' }, { status: 500 })
  }
}
