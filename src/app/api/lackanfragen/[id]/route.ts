// /src/app/api/lackanfragen/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }   // Next 15: params ist ein Promise
) {
  const { id } = await params

  const supa = await supabaseServer()

  // Datensatz
  const { data, error } = await supa
    .from('lack_requests')
    .select('id,title,lieferdatum,delivery_at,created_at,updated_at,status,owner_id,data,published')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[lackanfragen] detail error', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
  if (!data || data.published === false || data.status === 'deleted') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Username & Ratings aus profiles holen
  let userName: string | null = null
  let userRating: number | null = null
  let userRatingCount = 0
  try {
    const { data: prof, error: pErr } = await supa
      .from('profiles')
      .select('id, username, rating_avg, rating_count')
      .eq('id', data.owner_id)
      .maybeSingle()

    if (!pErr && prof) {
      userName = (prof.username ?? null)
      userRating = typeof prof.rating_avg === 'number' ? prof.rating_avg : null
      userRatingCount = typeof prof.rating_count === 'number' ? prof.rating_count : 0
    }
  } catch (e) {
    console.warn('[lackanfragen] profile lookup failed (non-fatal)', (e as any)?.message)
  }

  const d: any = data.data || {}

  // Fallbacks aus Datensatz
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

  const artikel = {
    id: data.id,
    titel: data.title || d.titel || 'Ohne Titel',
    bilder: normalizeBilder(d),
    lieferdatum: (data.lieferdatum || data.delivery_at || null) as string | null,

    zustand: normalizeZustand(d.zustand),
    hersteller: d.hersteller || '',
    menge: typeof d.menge === 'number' ? d.menge : (d.menge ? Number(d.menge) : null),

    // Adresse
    ort: computeOrtShort(d),
    lieferadresse_full: (d.lieferadresse ?? '').toString(),

    kategorie:
      (d.kategorie || '').toString().toLowerCase() === 'pulverlack' ? 'Pulverlack'
      : (d.kategorie || '').toString().toLowerCase() === 'nasslack' ? 'Nasslack'
      : (d.kategorie || ''),

    // User-Infos (Naming wie in der Listen-API)
    user_id: data.owner_id as string,
    user: userName,
    user_rating: userRating,
    user_rating_count: userRatingCount,

    farbcode: d.farbcode || '',
    effekt: Array.isArray(d.effekt) ? d.effekt.join(', ') : (d.effekt || ''),
    anwendung: d.anwendung || '',
    oberfläche: d.oberflaeche || d.oberfläche || '',
    glanzgrad: d.glanzgrad || '',
    sondereigenschaft: d.sondereigenschaft || '',
    beschreibung: d.beschreibung || '',

    gesponsert: Array.isArray(d.bewerbung) && d.bewerbung.length > 0,
    gewerblich: !!d.istGewerblich,
    privat: d.istGewerblich === false,

    dateien: normalizeDateien(d),

    farbpalette: d.farbpalette || '',
    farbton: d.farbton || '',
    qualität: d.qualitaet || d.qualität || '',
    zertifizierung: Array.isArray(d.zertifizierungen) ? d.zertifizierungen : [],
    aufladung: Array.isArray(d.aufladung) ? d.aufladung : [],
  }

  return NextResponse.json({ artikel })
}
