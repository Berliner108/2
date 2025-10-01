// /src/app/api/lackanfragen/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    // Sortier-Parameter
    const sortParam = (url.searchParams.get('sort') ?? 'promo').toLowerCase() // 'promo' | 'created'
    const orderParam = (url.searchParams.get('order') ?? 'desc').toLowerCase() // 'asc' | 'desc'
    const isAsc = orderParam === 'asc'

    // ===== Haupt-Query (promo_score kommt als Spaltenwert, kann aber Text sein)
    let q = supabase
      .from('lack_requests')
      .select(
        'id,title,status,delivery_at,lieferdatum,data,created_at,published,owner_id,promo_score',
        { count: 'exact' }
      )

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

    // ===== Pagination-Fenster
    let from = 0
    let to = limit - 1
    if (page) {
      from = (page - 1) * limit
      to = from + limit - 1
    } else if (offset != null) {
      from = offset
      to = from + limit - 1
    }

    // ===== DB-Order & Overfetch
    if (sortParam === 'promo') {
      // NICHT nach promo_score in SQL sortieren (könnte lexikographisch sein) – wir sortieren in JS numerisch.
      const factor = 4
      const overTo = page
        ? (page * limit * factor) - 1
        : (offset != null ? (offset + limit * factor) - 1 : (limit * factor) - 1)
      // stabile Basis (neueste zuerst), aber finaler Sort in JS
      q = q.order('created_at', { ascending: false }).range(0, overTo)
    } else {
      q = q.order('created_at', { ascending: isAsc }).range(from, to)
    }

    const { data, error } = await q
    if (error) {
      console.error('[lackanfragen] query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []
    const ownerIds = Array.from(new Set(rows.map((r: any) => r.owner_id).filter(Boolean)))

    // ===== Profile laden (optional)
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

    // ===== JS-Sort nach promo_score (NUMERISCH), dann created_at – und danach slicen
    let sortedRows = rows
    if (sortParam === 'promo') {
      sortedRows = [...rows].sort((a: any, b: any) => {
        const pa = Number(a?.promo_score ?? 0)
        const pb = Number(b?.promo_score ?? 0)
        const byPromo = pb - pa
        if (byPromo !== 0) return isAsc ? -byPromo : byPromo
        const ta = new Date(a?.created_at ?? 0).getTime()
        const tb = new Date(b?.created_at ?? 0).getTime()
        const byCreated = tb - ta
        return isAsc ? -byCreated : byCreated
      })
      const start = page ? (page - 1) * limit : (offset ?? 0)
      const end = start + limit
      sortedRows = sortedRows.slice(start, end)
    }

    // ===== Mapping (Badge-Logik bleibt exakt wie bei dir)
    const items = sortedRows.map((row: any) => {
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

      const promoScore = (Number(row.promo_score) || 0) | 0
      const isSponsored = promoScore > 0

      const dataOut = {
        ...d,
        // unverändert: Badge bleibt gesetzt, wenn promoScore > 0 oder schon vorhanden
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

        promo_score: promoScore,
        promoScore,
        gesponsert: isSponsored,
      }
    })

    return NextResponse.json({ items })
  } catch (e: any) {
    console.error('[lackanfragen] GET crashed:', e)
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
