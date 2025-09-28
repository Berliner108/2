import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_STATUSES = new Set(['paid', 'succeeded'])

/* ------------ Helpers (nur PLZ+Ort) ------------ */
const joinPlzOrt = (plz?: unknown, ort?: unknown) =>
  [plz, ort].map(v => (v ?? '').toString().trim()).filter(Boolean).join(' ') || ''

function extractZipCity(s?: unknown): string {
  const text = (s ?? '').toString()
  if (!text) return ''
  const m = text.match(/(?:^|\b)(?:D[-\s])?(\d{4,5})\s+([A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß.\- ]{2,}?)(?=,|$|\n|\r)/)
  if (!m) return ''
  const zip = m[1].trim()
  const city = m[2].trim().replace(/\s+/g, ' ')
  return [zip, city].filter(Boolean).join(' ')
}

function computeOrtPublic(d: any): string {
  const joined = joinPlzOrt(d?.plz, d?.ort)
  if (joined) return joined
  // NICHT direkt d.lieferort durchreichen → erst PLZ/Ort extrahieren
  const fromText =
    extractZipCity(d?.lieferort) ||
    extractZipCity(d?.lieferadresse) ||
    extractZipCity(d?.address)
  return fromText || '—'
}

function normalizeBilder(d: any): string[] {
  const b = d?.bilder
  if (Array.isArray(b) && b.length) {
    if (typeof b[0] === 'string') return b as string[]
    if (typeof b[0] === 'object' && (b[0] as any)?.url) {
      return (b as Array<{ url?: string }>).map(x => x?.url).filter(Boolean) as string[]
    }
  }
  if (typeof b === 'string' && b.trim()) {
    return b.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

function displayNameFromProfile(p?: any): string | undefined {
  const u = (p?.username ?? '').toString().trim()
  const c = (p?.company_name ?? '').toString().trim()
  return c || u || undefined
}

/* ------------ Route ------------ */
export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin()
    const url = new URL(req.url)

    // optional: Staff bestimmen (für includeUnpublished)
    let isStaff = false
    try {
      const sb = await supabaseServer()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: me } = await admin.from('profiles').select('is_staff').eq('id', user.id).maybeSingle()
        isStaff = !!me?.is_staff
      }
    } catch {}

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200)
    const kategorie = url.searchParams.get('kategorie') ?? ''
    const includeUnpublishedReq = ['1','true','yes'].includes((url.searchParams.get('includeUnpublished') ?? '').toLowerCase())
    const includeUnpublished = isStaff && includeUnpublishedReq   // ← nur Staff darf

    const id = url.searchParams.get('id') ?? ''
    const idsRaw = url.searchParams.get('ids') ?? ''
    const search = url.searchParams.get('q') ?? url.searchParams.get('search') ?? ''

    const offsetParam = url.searchParams.get('offset') ?? url.searchParams.get('skip') ?? url.searchParams.get('start')
    const pageParam = url.searchParams.get('page')
    const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : null
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : null

    // Global Listing (für Startseite)
    const isGlobal = !page && offset == null && !id && !(idsRaw || '').trim() && !search
    const fetchLimit = isGlobal ? Math.min(400, Math.max(limit * 3, 120)) : limit

    // ===== Query (admin → RLS-frei) =====
    let q = admin
      .from('lack_requests')
      .select('id,title,status,delivery_at,lieferdatum,data,created_at,published,owner_id', { count: 'exact' })
      .neq('status', 'deleted')
      .neq('status', 'draft')               // ← Drafts ausblenden
      .order('created_at', { ascending: false })

    if (!includeUnpublished) {
      // öffentlich: published = true ODER NULL
      q = q.or('published.eq.true,published.is.null')
    }
    if (kategorie) q = q.eq('data->>kategorie', kategorie)
    if (id) q = q.eq('id', id)

    const ids = idsRaw.split(',').map(s => s.trim()).filter(Boolean)
    if (ids.length) q = q.in('id', ids)

    if (search) {
      q = q.or(`id.ilike.%${search}%,title.ilike.%${search}%`)
    }

    // Range
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
    if (error) {
      console.error('[lackanfragen] query failed:', error)
      return NextResponse.json({ items: [] })
    }

    const rows = data ?? []
    const ownerIds = Array.from(new Set(rows.map((r: any) => r.owner_id).filter(Boolean)))
    const reqIds   = rows.map((r: any) => r.id).filter(Boolean)

    // Profile laden
    let profilesById = new Map<string, any>()
    if (ownerIds.length) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, username, company_name, rating_avg, rating_count')
        .in('id', ownerIds)
      profilesById = new Map((profs ?? []).map((p: any) => [p.id, p]))
    }

    // Promo-Scores (nur paid/succeeded)
    let scoreByReq = new Map<string, number>()
    if (reqIds.length) {
      const { data: promoRows } = await admin
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

    // Mapping – d.gesponsert befüllen, Ort „public only“, KEINE komplette Adresse
    const mapped = rows.map((row: any) => {
      const d = row.data || {}
      const prof = profilesById.get(row.owner_id)
      const user = displayNameFromProfile(prof) || (d.user ?? '').toString().trim() || undefined

      const user_rating =
        typeof prof?.rating_avg === 'number' ? prof.rating_avg
        : (typeof d.user_rating === 'number' ? d.user_rating : null)

      const user_rating_count =
        typeof prof?.rating_count === 'number' ? prof.rating_count
        : (typeof d.user_rating_count === 'number' ? d.user_rating_count : 0)

      const promo_score = scoreByReq.get(row.id) || 0
      const isSponsored = (promo_score | 0) > 0

      const dataOut = { ...d, gesponsert: Boolean(d.gesponsert) || isSponsored }

      return {
        id: row.id,
        title: row.title,
        status: row.status,
        delivery_at: row.delivery_at,
        lieferdatum: row.lieferdatum,
        created_at: row.created_at,
        published: row.published,

        data: dataOut,
        ort: computeOrtPublic(d),                 // ← nur PLZ+Ort
        bilder: normalizeBilder(d),

        user,
        user_rating,
        user_rating_count,

        promo_score,
        gesponsert: isSponsored,
      }
    })

    // Sortierung & Top-N
    const byCreatedDesc = (a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

    if (isGlobal) {
      const promoted = mapped
        .filter(it => (it.promo_score | 0) > 0)
        .sort((a, b) => (b.promo_score | 0) - (a.promo_score | 0) || byCreatedDesc(a, b))
      const organic = mapped
        .filter(it => (it.promo_score | 0) === 0)
        .sort(byCreatedDesc)
      const filled = promoted.concat(organic).slice(0, limit)
      return NextResponse.json({ items: filled })
    }

    mapped.sort((a, b) =>
      (b.promo_score | 0) - (a.promo_score | 0) ||
      (new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    )

    return NextResponse.json({ items: mapped })
  } catch (e: any) {
    console.error('[lackanfragen] GET crashed:', e)
    return NextResponse.json({ items: [] })
  }
}
