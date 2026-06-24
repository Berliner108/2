// /src/app/api/lackanfragen/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ------------ Helpers ------------ */

const joinPlzOrt = (plz?: unknown, ort?: unknown) =>
  [plz, ort]
    .map((v) => (v ?? '').toString().trim())
    .filter(Boolean)
    .join(' ') || ''

function computeOrtShort(d: any): string {
  const direct = (d?.lieferort ?? '').toString().trim()
  if (direct) return direct

  const joined = joinPlzOrt(d?.plz, d?.ort)
  return joined || '—'
}

function sortImageUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return []

  return urls
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .sort((a, b) => {
      const getName = (url: string) => {
        try {
          return decodeURIComponent(url.split('/').pop() ?? url)
        } catch {
          return url
        }
      }

      return getName(a).localeCompare(getName(b), 'de', {
        numeric: true,
        sensitivity: 'base',
      })
    })
}

function normalizeBilder(d: any): string[] {
  const b = d?.bilder
  let bilder: string[] = []

  if (Array.isArray(b)) {
    if (typeof b[0] === 'string') {
      bilder = b.filter(
        (x): x is string => typeof x === 'string' && x.trim().length > 0
      )
    } else if (typeof b[0] === 'object' && (b[0] as any)?.url) {
      bilder = (b as any[])
        .map((x) => x?.url)
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    }
  } else if (typeof b === 'string' && b.trim()) {
    bilder = b
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
  }

  return sortImageUrls(bilder)
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

    const limitRaw = parseInt(url.searchParams.get('limit') ?? '50', 10)
    const limit = Math.min(Number.isNaN(limitRaw) ? 50 : limitRaw, 200)

    const pageRaw = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page = Math.max(Number.isNaN(pageRaw) ? 1 : pageRaw, 1)

    const offsetParam =
      url.searchParams.get('offset') ??
      url.searchParams.get('skip') ??
      url.searchParams.get('start')

    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : null

    const kategorie = url.searchParams.get('kategorie') ?? ''
    const zustandRaw = url.searchParams.get('zustand') ?? ''
    const herstellerRaw = url.searchParams.get('hersteller') ?? ''
    const maxRaw = url.searchParams.get('max') ?? ''
    const g = url.searchParams.get('g') ?? ''
    const p = url.searchParams.get('p') ?? ''

    const id = url.searchParams.get('id') ?? ''
    const idsRaw = url.searchParams.get('ids') ?? ''
    const search = url.searchParams.get('q') ?? url.searchParams.get('search') ?? ''

    const includeUnpublished = ['1', 'true', 'yes'].includes(
      (url.searchParams.get('includeUnpublished') ?? '').toLowerCase()
    )

    const sortParam = (url.searchParams.get('sort') ?? 'promo').toLowerCase()
    const orderParam = (url.searchParams.get('order') ?? 'desc').toLowerCase()
    const isAsc = orderParam === 'asc'

    const ids = idsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const zustandList = zustandRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const herstellerList = herstellerRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const maxMenge = maxRaw ? Number(maxRaw) : null

    const columns =
      'id,title,status,delivery_at,lieferdatum,data,created_at,published,owner_id,promo_score'

    const applyFilters = (query: any) => {
      let next = query

      /**
       * Öffentliche Börse:
       * Nur offene und veröffentlichte Lackanfragen anzeigen.
       */
      if (!includeUnpublished) {
        next = next.eq('status', 'open')
        next = next.eq('published', true)
      }

      if (kategorie) {
        next = next.eq('data->>kategorie', kategorie)
      }

      if (zustandList.length) {
        next = next.in('data->>zustand', zustandList)
      }

      if (herstellerList.length) {
        next = next.in('data->>hersteller', herstellerList)
      }

      /**
       * Achtung:
       * data->>menge ist JSON/Text.
       * Das ist für den Start okay, langfristig besser als echte numeric-Spalte.
       */
      if (maxMenge !== null && !Number.isNaN(maxMenge)) {
        next = next.lte('data->>menge', String(maxMenge))
      }

      /**
       * Verkaufstyp:
       * g=1 = gewerblich
       * p=1 = privat
       * Wenn beide aktiv sind, wird nicht eingeschränkt.
       */
      if (g === '1' && p !== '1') {
        next = next.or(
          'data->>istGewerblich.eq.true,data->>gewerblich.eq.true,data->>account_type.eq.business'
        )
      }

      if (p === '1' && g !== '1') {
        next = next.or(
          'data->>istGewerblich.eq.false,data->>gewerblich.eq.false,data->>account_type.eq.private'
        )
      }

      if (id) {
        next = next.eq('id', id)
      }

      if (ids.length) {
        next = next.in('id', ids)
      }

      if (search) {
        next = next.or(
          [
            `id.ilike.%${search}%`,
            `title.ilike.%${search}%`,
            `data->>titel.ilike.%${search}%`,
            `data->>hersteller.ilike.%${search}%`,
            `data->>farbton.ilike.%${search}%`,
            `data->>farbtonbezeichnung.ilike.%${search}%`,
            `data->>farbcode.ilike.%${search}%`,
          ].join(',')
        )
      }

      return next
    }

    /**
     * Count-Abfrage:
     * Zählt alle passenden Einträge für die Pagination.
     */
    const countQuery = applyFilters(
      supabase
        .from('lack_requests')
        .select('id', { count: 'exact', head: true })
    )

    const { count: total, error: countError } = await countQuery

    if (countError) {
      console.error('[lackanfragen] count failed:', countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    /**
     * Daten-Abfrage:
     * Lädt die passende Seite.
     */
    let q = applyFilters(
      supabase
        .from('lack_requests')
        .select(columns)
    )

    let from = 0
    let to = limit - 1

    if (offset !== null) {
      from = offset
      to = from + limit - 1
    } else {
      from = (page - 1) * limit
      to = from + limit - 1
    }

    if (sortParam === 'promo') {
      /**
       * Promo-Sortierung:
       * Overfetch, danach stabile Sortierung in JS.
       */
      const factor = 4

      const overTo =
        offset !== null
          ? offset + limit * factor - 1
          : page * limit * factor - 1

      q = q
        .order('created_at', { ascending: false })
        .range(0, overTo)
    } else {
      q = q
        .order('created_at', { ascending: isAsc })
        .range(from, to)
    }

    const { data, error } = await q

    if (error) {
      console.error('[lackanfragen] query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    const ownerIds = Array.from(
      new Set(rows.map((r: any) => r.owner_id).filter(Boolean))
    )

    let profilesById = new Map<string, any>()

    if (ownerIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, rating_avg, rating_count')
        .in('id', ownerIds)

      if (!profErr && profs) {
        profilesById = new Map((profs as any[]).map((profile: any) => [profile.id, profile]))
      } else if (profErr) {
        console.warn('[lackanfragen] profiles lookup failed:', profErr.message ?? profErr)
      }
    }

    let sortedRows = rows

    if (sortParam === 'promo') {
      sortedRows = [...rows].sort((a: any, b: any) => {
        const pa = Number.parseInt(String(a?.promo_score ?? 0), 10) || 0
        const pb = Number.parseInt(String(b?.promo_score ?? 0), 10) || 0

        const byPromo = pb - pa
        if (byPromo !== 0) return isAsc ? -byPromo : byPromo

        const ta = new Date(a?.created_at ?? 0).getTime()
        const tb = new Date(b?.created_at ?? 0).getTime()

        const byCreated = tb - ta
        return isAsc ? -byCreated : byCreated
      })

      const start = offset !== null ? offset : (page - 1) * limit
      const end = start + limit

      sortedRows = sortedRows.slice(start, end)
    }

    const items = sortedRows.map((row: any) => {
      const d = row.data || {}
      const prof = profilesById.get(row.owner_id)
      const nameFromProfile = displayNameFromProfile(prof)

      const user =
        nameFromProfile ||
        (d.user ?? '').toString().trim() ||
        undefined

      const user_rating =
        typeof prof?.rating_avg === 'number'
          ? prof.rating_avg
          : typeof d.user_rating === 'number'
            ? d.user_rating
            : null

      const user_rating_count =
        typeof prof?.rating_count === 'number'
          ? prof.rating_count
          : typeof d.user_rating_count === 'number'
            ? d.user_rating_count
            : 0

      const promoScore = Number.parseInt(String(row.promo_score ?? 0), 10) || 0
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

        promo_score: promoScore,
        promoScore,
        gesponsert: isSponsored,
      }
    })

    return NextResponse.json({
      items,
      total: total ?? 0,
      page,
      limit,
    })
  } catch (e: any) {
    console.error('[lackanfragen] GET crashed:', e)
    return NextResponse.json(
      { error: e?.message ?? 'Server error' },
      { status: 500 }
    )
  }
}