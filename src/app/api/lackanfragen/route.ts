// /src/app/api/lackanfragen/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ===== Helpers ===== */
const joinPlzOrt = (plz?: unknown, ort?: unknown) =>
  [plz, ort].map(v => (v ?? '').toString().trim()).filter(Boolean).join(' ') || ''

function computeOrtShort(d: any): string {
  const direct = (d?.lieferort ?? '').toString().trim()
  if (direct) return direct
  const joined = joinPlzOrt(d?.plz, d?.ort)
  return joined || '—'
}

function normalizeBilder(d: any): string[] {
  const b = d?.bilder
  if (Array.isArray(b)) {
    if (typeof b[0] === 'string') return b as string[]
    if (typeof b[0] === 'object' && b[0]?.url) return (b as any[]).map(x => x.url).filter(Boolean)
  }
  if (typeof b === 'string' && b.trim()) return b.split(',').map((s: string) => s.trim()).filter(Boolean)
  return []
}

function displayNameFromProfile(p?: any): string | undefined {
  const u = (p?.username ?? '').toString().trim()
  return u || undefined
}

const num = (v: any): number | undefined => {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'))
    return isFinite(n) ? n : undefined
  }
  return undefined
}
const str = (...vals: any[]) => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}
const pickDate = (...vals: any[]) => {
  for (const v of vals) {
    if (!v) continue
    const d = v instanceof Date ? v : new Date(v)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  return null
}

/* ===== Promo ===== */
const PAID_STATUSES = new Set(['paid', 'succeeded'])

/* ===== Route ===== */
export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer()
    const url = new URL(req.url)

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '12', 10), 200)
    const kategorie = url.searchParams.get('kategorie') ?? ''
    const includeUnpublished = ['1','true','yes'].includes((url.searchParams.get('includeUnpublished') ?? '').toLowerCase())

    const id = url.searchParams.get('id') ?? ''
    const idsRaw = url.searchParams.get('ids') ?? ''
    const search = url.searchParams.get('q') ?? url.searchParams.get('search') ?? ''

    const offsetParam = url.searchParams.get('offset') ?? url.searchParams.get('skip') ?? url.searchParams.get('start')
    const pageParam = url.searchParams.get('page')
    const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : null
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : null

    const isGlobal = !page && offset == null && !id && !(idsRaw || '').trim() && !search
    const fetchLimit = isGlobal ? Math.min(400, Math.max(limit * 3, 120)) : limit

    let q = supabase
      .from('lack_requests')
      .select('id,title,status,delivery_at,lieferdatum,data,created_at,published,owner_id', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (!includeUnpublished) q = q.or('published.eq.true,published.is.null')
    if (kategorie) q = q.eq('data->>kategorie', kategorie)
    if (id) q = q.eq('id', id)

    const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length) q = q.in('id', ids)

    if (search) q = q.or(`id.ilike.%${search}%,title.ilike.%${search}%`)

    if (page) {
      const from = (page - 1) * fetchLimit
      const to = from + fetchLimit - 1
      q = q.range(from, to)
    } else if (offset != null) {
      const from = offset
      const to = from + fetchLimit - 1
      q = q.range(from, to)
    } else {
      q = q.range(0, fetchLimit - 1)
    }

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data ?? []
    const ownerIds = Array.from(new Set(rows.map((r: any) => r.owner_id).filter(Boolean)))
    const reqIds = rows.map((r: any) => r.id).filter(Boolean)

    // Profile
    let profilesById = new Map<string, any>()
    if (ownerIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, rating_avg, rating_count')
        .in('id', ownerIds)
      profilesById = new Map((profs ?? []).map((p: any) => [p.id, p]))
    }

    // Promo-Scores (nur bezahlte)
    let scoreByReq = new Map<string, number>()
    if (reqIds.length) {
      const { data: promoRows } = await supabase
        .from('promo_orders')
        .select('request_id, score_delta, status')
        .in('request_id', reqIds)

      for (const p of (promoRows ?? [])) {
        const st = (p?.status ?? '').toString().toLowerCase()
        if (!PAID_STATUSES.has(st)) continue
        const rid = (p?.request_id ?? '').toString()
        const delta = typeof p?.score_delta === 'number' ? p.score_delta : 0
        scoreByReq.set(rid, (scoreByReq.get(rid) || 0) + delta)
      }
    }

    // Internes Mapping
    const mapped = rows.map((row: any) => {
      const d = row.data || {}
      const prof = profilesById.get(row.owner_id)
      const nameFromProfile = displayNameFromProfile(prof)

      const user =
        nameFromProfile ||
        (d.user ?? '').toString().trim() ||
        undefined

      const user_rating =
        typeof prof?.rating_avg === 'number' ? prof.rating_avg
        : (typeof d.user_rating === 'number' ? d.user_rating : null)

      const user_rating_count =
        typeof prof?.rating_count === 'number' ? prof.rating_count
        : (typeof d.user_rating_count === 'number' ? d.user_rating_count : 0)

      const promo_score = scoreByReq.get(row.id) || 0

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        delivery_at: row.delivery_at,
        lieferdatum: row.lieferdatum,
        created_at: row.created_at,
        published: row.published,
        data: row.data,

        ort: computeOrtShort(d),
        bilder: normalizeBilder(d),
        lieferadresse_full: (d.lieferadresse ?? '').toString(),

        user,
        user_rating,
        user_rating_count,

        promo_score,
        gesponsert: promo_score > 0,
      }
    })

    // Öffentliches Format (für Startseite)
    const toPublic = (it: any) => {
      const d = it.data || {}
      return {
        id: it.id,
        titel: str(d.titel, it.title, d.title, d.name, 'Unbenannt'),
        bilder: it.bilder,
        menge: num(d.menge ?? d.quantity ?? d.amount ?? d.kg ?? d.mass_kg) ?? 0,
        lieferdatum: pickDate(it.lieferdatum, it.delivery_at, d.lieferdatum, d.delivery_at, d.date),
        hersteller: str(d.hersteller, d.manufacturer, d.brand),
        zustand: str(d.zustand, d.condition, d.state),
        kategorie: str(d.kategorie, d.category, d.type),
        ort: it.ort,
        preis: num(d.preis ?? d.min_price ?? d.price),
        gesponsert: Boolean(it.gesponsert),
        created_at: it.created_at,
        farbton: str(d.farbton, d.farbtonbezeichnung, d.farb_bezeichnung, d.farb_name, d.color_name, d.color, d.ral, d.ncs),
      }
    }

    // Antwort
    if (isGlobal) {
      const byCreatedDesc = (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

      const promoted = mapped
        .filter(it => (it.promo_score | 0) > 0)
        .sort((a, b) => (b.promo_score | 0) - (a.promo_score | 0) || byCreatedDesc(a, b))

      const organic = mapped
        .filter(it => (it.promo_score | 0) === 0)
        .sort(byCreatedDesc)

      const filled = promoted.concat(organic).slice(0, limit)
      const publicRows = filled.map(toPublic)
      return NextResponse.json(publicRows)
    }

    mapped.sort((a, b) =>
      (b.promo_score | 0) - (a.promo_score | 0) ||
      (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    )
    return NextResponse.json({ items: mapped.map(toPublic) })
  } catch (e: any) {
    console.error('[lackanfragen] GET crashed:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
