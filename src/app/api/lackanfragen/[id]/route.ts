// /src/app/api/lackanfragen/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ---------------------- Utils / Normalizer ---------------------- */
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

type DateiItem = { name: string; url: string }
function getNameFromUrl(u: string): string {
  try {
    const p = new URL(u)
    const last = p.pathname.split('/').filter(Boolean).pop() || 'datei'
    return decodeURIComponent(last)
  } catch {
    const parts = u.split('/')
    return decodeURIComponent(parts[parts.length - 1] || 'datei')
  }
}
function normalizeDateien(d: any): DateiItem[] {
  const arr = d?.dateien
  if (!arr) return []
  if (Array.isArray(arr)) {
    if (arr.length === 0) return []
    if (typeof arr[0] === 'string') {
      return (arr as string[]).filter(Boolean).map(url => ({ name: getNameFromUrl(url), url }))
    }
    return (arr as any[])
      .map((x) => {
        const url: string | undefined = x?.url || x?.href
        const name: string | undefined = x?.name || x?.filename || (url ? getNameFromUrl(url) : undefined)
        return url ? { name: name || 'Datei', url } : null
      })
      .filter(Boolean) as DateiItem[]
  }
  if (typeof arr === 'string' && arr.trim()) {
    return arr.split(',').map(s => s.trim()).filter(Boolean).map(url => ({ name: getNameFromUrl(url), url }))
  }
  return []
}

function normalizeZustand(z?: unknown): string {
  const v = (z ?? '').toString().toLowerCase()
  if (!v) return ''
  if (v.includes('neu')) return 'Neu und ungeöffnet'
  if (v.includes('geöffnet') || v.includes('geoeffnet') || v.includes('offen')) return 'Geöffnet und einwandfrei'
  return (z ?? '').toString()
}

/* ---------------------- Route ---------------------- */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }   // ← kein Promise nötig
) {
  const { id } = params

  // 0) Auth-Zwang beibehalten (wie bei dir): nur eingeloggte Nutzer
  const sb = await supabaseServer()
  const { data: { user }, error: userErr } = await sb.auth.getUser()
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
  if (!user)    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // 1) Anfrage via Admin (RLS umgehen) holen
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('lack_requests')
    .select('id,title,lieferdatum,delivery_at,created_at,updated_at,status,owner_id,data,published')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[lackanfragen] detail error', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!data || data.status === 'deleted') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 1b) Promo-Score (nur paid/succeeded)
  let promo_score = 0
  try {
    const { data: promos, error: promoErr } = await admin
      .from('promo_orders')
      .select('score_delta,status')
      .eq('request_id', id)

    if (promoErr) {
      console.warn('[lackanfragen] promo_orders lookup failed (non-fatal)', promoErr.message ?? promoErr)
    } else {
      for (const p of promos ?? []) {
        const st = (p?.status ?? '').toString().toLowerCase()
        if (st === 'paid' || st === 'succeeded') {
          const d = typeof p?.score_delta === 'number' ? p.score_delta : 0
          promo_score += d
        }
      }
    }
  } catch (e) {
    console.warn('[lackanfragen] promo_orders lookup crashed (non-fatal)', (e as any)?.message)
  }

  // 2) Owner-Profile
  let userName: string | null = null
  let userRating: number | null = null
  let userRatingCount = 0
  let userHandle: string | null = null
  try {
    const { data: prof } = await admin
      .from('profiles')
      .select('id, username, company_name, rating_avg, rating_count')
      .eq('id', data.owner_id)
      .maybeSingle()

    if (prof) {
      const handle  = (prof.username ?? '').toString().trim() || null
      const display = (prof.company_name ?? '').toString().trim() || null
      userHandle = handle
      userName = display || handle
      userRating = typeof prof.rating_avg === 'number' ? prof.rating_avg : (prof.rating_avg != null ? Number(prof.rating_avg) : null)
      userRatingCount = typeof prof.rating_count === 'number' ? prof.rating_count : (prof.rating_count != null ? Number(prof.rating_count) : 0)
    }
  } catch (e) {
    console.warn('[lackanfragen] profile lookup failed (non-fatal)', (e as any)?.message)
  }

  const d: any = data.data || {}

  if (!userName) {
    const fromData = (d.user ?? d.username ?? d.user_name ?? '').toString().trim()
    userName = fromData || null
  }
  if (userRating == null && typeof d.user_rating === 'number') {
    userRating = d.user_rating
  }
  if (!userRatingCount && typeof d.user_rating_count === 'number') {
    userRatingCount = d.user_rating_count
  }

  // 3) Antwort – jetzt inkl. *rohem* data für deinen Mapper
  const artikel = {
    id: data.id,
    titel: data.title || d.titel || 'Ohne Titel',
    title: data.title ?? null,

    // Rohdaten für deine mapItem-Logik:
    data: d,                                      // ← WICHTIG: raw data mitgeben

    // Normalisierte/abgeleitete Felder:
    bilder: normalizeBilder(d),
    lieferdatum: (data.lieferdatum || data.delivery_at || null) as string | null,
    ort: computeOrtShort(d),
    lieferadresse_full: (d.lieferadresse ?? '').toString(),

    zustand: normalizeZustand(d.zustand),
    hersteller: d.hersteller || '',
    menge: typeof d.menge === 'number' ? d.menge : (d.menge ? Number(d.menge) : null),
    kategorie:
      (d.kategorie || '').toString().toLowerCase() === 'pulverlack' ? 'Pulverlack'
      : (d.kategorie || '').toString().toLowerCase() === 'nasslack' ? 'Nasslack'
      : (d.kategorie || ''),

    // User/Rating
    user_id: data.owner_id as string,
    user: userName,
    user_handle: userHandle,                       // optional hilfreich für Reviews-Link
    user_rating: userRating,
    user_rating_count: userRatingCount,

    // sonstige Felder
    farbcode: d.farbcode || '',
    effekt: Array.isArray(d.effekt) ? d.effekt.join(', ') : (d.effekt || ''),
    anwendung: d.anwendung || '',
    oberfläche: d.oberflaeche || d.oberfläche || '',
    glanzgrad: d.glanzgrad || '',
    sondereigenschaft: d.sondereigenschaft || '',
    beschreibung: d.beschreibung || '',

    dateien: normalizeDateien(d),
    farbpalette: d.farbpalette || '',
    farbton: d.farbton || '',
    qualität: d.qualitaet || d.qualität || '',
    zertifizierung: Array.isArray(d.zertifizierungen) ? d.zertifizierungen : [],
    aufladung: Array.isArray(d.aufladung) ? d.aufladung : [],

    // Sponsoring
    promo_score,
    gesponsert: promo_score > 0,

    // Flags/Meta
    gewerblich: !!d.istGewerblich,
    privat: d.istGewerblich === false,
    published: data.published,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  return NextResponse.json({ artikel })
}
