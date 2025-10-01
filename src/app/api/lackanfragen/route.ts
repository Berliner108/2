// /src/app/api/lackanfragen/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_STATUSES = new Set(['paid', 'succeeded'])

/* ------------ Helpers ------------ */
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
    if (typeof b[0] === 'object' && (b[0] as any)?.url) return (b as any[]).map(x => x.url).filter(Boolean)
  }
  if (typeof b === 'string' && b.trim()) return b.split(',').map((s: string) => s.trim()).filter(Boolean)
  return []
}

function displayNameFromProfile(p?: any): string | undefined {
  const u = (p?.username ?? '').toString().trim()
  return u || undefined
}

/* ------------ Route ------------ */
export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer()
    const admin = supabaseAdmin()
    const url = new URL(req.url)

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200)
    const kategorie = url.searchParams.get('kategorie') ?? ''
    const includeUnpublished = ['1','true','yes'].includes((url.searchParams.get('includeUnpublished') ?? '').toLowerCase())

    const id = url.searchParams.get('id') ?? ''
    const idsRaw = url.searchParams.get('ids') ?? ''
    const search = url.searchParams.get('q') ?? url.searchParams.get('search') ?? ''

    const offsetParam = url.searchParams.get('offset') ?? url.searchParams.get('skip') ?? url.searchParams.get('start')
    const pageParam = url.searchParams.get('page')
    const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : null
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : null

    const sortParam = (url.searchParams.get('sort') ?? 'promo').toLowerCase() // 'promo' | 'created'
    const orderParam = (url.searchParams.get('order') ?? 'desc').toLowerCase() // 'asc' | 'desc'
    const isAsc = orderParam === 'asc'

    // ===== Basis-Query: wir holen einen größeren Fensterbereich (Overfetch), wenn nach promo sortiert wird.
    let q = supabase
      .from('lack_requests')
      .select('id,title,status,delivery_at,lieferdatum,data,created_at,published,owner_id', { count: 'exact' })
      .order('created_at', { ascending: false }) // Baseline-Order; echte Promo-Sortierung folgt in JS

    if (!includeUnpublished) {
      q = q.or('published.eq.true,published.is.null')
    }
    if (kategorie) q = q.eq('data->>kategorie', kategorie)
    if (id) q = q.eq('id', id)

    const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length) q = q.in('id', ids)

    if (search) {
      q = q.or(`id.ilike.%${search}%,title.ilike.%${search}%`)
    }

    // ===== Pagination-Fenster berechnen
    let from = 0
    let to = limit - 1
    if (page) {
      from = (page - 1) * limit
      to = from + limit - 1
    } else if (offset != null) {
      from = offset
      to = from + limit - 1
    }

    if (sortParam === 'promo') {
      // Overfetch – wir holen mehr, sortieren in JS und slicen danach.
      const factor = 4
      const overTo = page
        ? (page * limit * factor) - 1
        : (offset != null ? (offset + limit * factor) - 1 : (limit * factor) - 1)
      q = q.range(0, overTo)
    } else {
      q = q.range(from, to)
    }

    const { data, error } = await q
    if (error) {
      console.error('[lackanfragen] query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []
    const ownerIds = Array.from(new Set(rows.map((r: any) => r.owner_id).filter(Boolean)))
    const reqIds   = rows.map((r: any) => r.id).filter(Boolean)

    // ===== Profile (optional)
    let profilesById = new Map<string, any>()
    if (ownerIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, rating_avg, rating_count')
        .in('id', ownerIds)
      if (profErr) {
        console.warn('[lackanfragen] profiles lookup failed:', profErr.message ?? profErr)
      } else if (profs) {
        profilesById = new Map((profs as any[]).map((p: any) => [p.id, p]))
      }
    }

    // ===== Promo-Scores (nur paid/succeeded) aggregieren
    const scoreByReq = new Map<string, number>()
    if (reqIds.length) {
      try {
        const { data: promoRows, error: promoErr } = await admin
          .from('promo_orders')
          .select('request_id, score_delta, status')
          .in('request_id', reqIds)
        if (promoErr) {
          console.warn('[lackanfragen] promo_orders lookup failed:', promoErr.message ?? promoErr)
        } else {
          for (const p of (promoRows ?? [])) {
            const st = (p?.status ?? '').toString().toLowerCase()
            if (!PAID_STATUSES.has(st)) continue
            const rid = (p?.request_id ?? '').toString()
            if (!rid) continue
            const deltaRaw = (p as any).score_delta
            const delta = typeof deltaRaw === 'number' ? deltaRaw : (deltaRaw != null ? Number(deltaRaw) : 0)
            if (!isFinite(delta)) continue
            scoreByReq.set(rid, (scoreByReq.get(rid) || 0) + delta)
          }
        }
      } catch (e) {
        console.warn('[lackanfragen] promo_orders lookup crashed (non-fatal)', (e as any)?.message)
      }
    }

    // ===== Mapping
    let items = rows.map((row: any) => {
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

      // Aggregierten Score verwenden; wenn keiner vorhanden, 0
      const promoScoreNum = scoreByReq.get(row.id) ?? 0
      const promoScore = typeof promoScoreNum === 'number' ? promoScoreNum : Number(promoScoreNum) || 0
      const isSponsored = promoScore > 0

      const dataOut = {
        ...d,
        gesponsert: Boolean(d.gesponsert) || isSponsored,
      }

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        delivery_at: row.delivery_at,
        lieferdatum: row.lieferdatum,
        created_at: row.created_at,
        published: row.published,
        owner_id: row.owner_id,

        data: dataOut,
        ort: computeOrtShort(d),
        bilder: normalizeBilder(d),
        lieferadresse_full: (d.lieferadresse ?? '').toString(),

        user,
        user_rating,
        user_rating_count,

        promo_score: promoScore,     // numerisch lassen
        promoScore: promoScore,      // beide Schreibweisen fürs FE
        gesponsert: isSponsored,
      }
    })

    // ===== Finale Sortierung in JS: promo_score dann created_at
    items.sort((a, b) => {
      if (sortParam === 'promo') {
        const ps = (b.promo_score ?? 0) - (a.promo_score ?? 0)
        if (ps !== 0) return isAsc ? -ps : ps
        const byCreated = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return isAsc ? -byCreated : byCreated
      } else {
        const byCreated = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        return isAsc ? -byCreated : byCreated
      }
    })

    // ===== Slice nach Overfetch
    if (sortParam === 'promo') {
      const start = page ? (page - 1) * limit : (offset ?? 0)
      const end = start + limit
      items = items.slice(start, end)
    }

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[lackanfragen] GET crashed:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
