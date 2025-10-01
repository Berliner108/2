// /src/app/api/lackanfragen/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_STATUSES = new Set(['paid', 'succeeded'])

/* ----- Helpers (gekürzt) ----- */
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
  return extractZipCity(d?.lieferort) || extractZipCity(d?.lieferadresse) || extractZipCity(d?.address) || '—'
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

function normalizeZustand(z?: unknown): string {
  const v = (z ?? '').toString().toLowerCase()
  if (!v) return ''
  if (v.includes('neu')) return 'Neu und ungeöffnet'
  if (v.includes('geöffnet') || v.includes('geoeffnet') || v.includes('offen')) return 'Geöffnet und einwandfrei'
  return (z ?? '').toString()
}

const SENSITIVE_KEYS = new Set([
  'email','e_mail','mail','telefon','phone','mobile','handy',
  'adresse','address','anschrift','lieferadresse','street','strasse','hausnummer',
  'iban','bic','tax_id','ustid','vat','geo','lat','lng','longitude','latitude',
  'firstName','lastName','vorname','nachname','geburtsdatum','birthday','national_id','ausweis',
])

function stripSensitive(d: any) {
  if (!d || typeof d !== 'object') return {}
  const out: any = {}
  for (const [k, v] of Object.entries(d)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) continue
    out[k] = v
  }
  return out
}

/* ----- Route ----- */
export async function GET(
  _req: Request,
  ctx: any               // ungetypt gelassen
) {
  const raw = ctx?.params?.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // nur eingeloggte Nutzer
  const sb = await supabaseServer()
  const { data: { user }, error: userErr } = await sb.auth.getUser()
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
  if (!user)    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

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

  // Unpublished nur Owner/Staff
  if (data.published === false && user.id !== data.owner_id) {
    const { data: me } = await admin.from('profiles').select('is_staff').eq('id', user.id).maybeSingle()
    if (!me?.is_staff) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Promo-Score
  let promo_score = 0
  try {
    const { data: promos } = await admin
      .from('promo_orders')
      .select('score_delta,status')
      .eq('request_id', id)

    for (const p of (promos ?? [])) {
      const st = (p?.status ?? '').toString().toLowerCase()
      if (PAID_STATUSES.has(st)) {
        promo_score += typeof p?.score_delta === 'number' ? p.score_delta : 0
      }
    }
  } catch (e) {
    console.warn('[lackanfragen] promo_orders lookup failed (non-fatal)', (e as any)?.message)
  }

  // Owner-Profil
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
      userRating = typeof prof.rating_avg === 'number' ? prof.rating_avg
                 : (prof.rating_avg != null ? Number(prof.rating_avg) : null)
      userRatingCount = typeof prof.rating_count === 'number' ? prof.rating_count
                      : (prof.rating_count != null ? Number(prof.rating_count) : 0)
    }
  } catch (e) {
    console.warn('[lackanfragen] profile lookup failed (non-fatal)', (e as any)?.message)
  }

  const dRaw: any = data.data || {}
  const dSanitized = stripSensitive(dRaw)

  // WICHTIG: promo_score/gesponsert zusätzlich in data mitschicken,
  // damit das FE sie beim Mapping sicher findet.
  const dataForClient = {
    ...dSanitized,
    promo_score,
    gesponsert: promo_score > 0,
  }

  const artikel = {
    id: data.id,
    titel: data.title || dRaw.titel || 'Ohne Titel',
    title: data.title ?? null,

    data: dataForClient, // <- enthält promo_score & gesponsert

    bilder: normalizeBilder(dRaw),
    lieferdatum: (data.lieferdatum || data.delivery_at || null) as string | null,
    ort: computeOrtPublic(dRaw),

    zustand: normalizeZustand(dRaw.zustand),
    hersteller: dRaw.hersteller || '',
    menge: typeof dRaw.menge === 'number' ? dRaw.menge : (dRaw.menge ? Number(dRaw.menge) : null),
    kategorie:
      (dRaw.kategorie || '').toString().toLowerCase() === 'pulverlack' ? 'Pulverlack'
      : (dRaw.kategorie || '').toString().toLowerCase() === 'nasslack' ? 'Nasslack'
      : (dRaw.kategorie || ''),

    user_id: data.owner_id as string,
    user: userName,
    user_handle: userHandle,
    user_rating: userRating,
    user_rating_count: userRatingCount,

    farbcode: dRaw.farbcode || '',
    effekt: Array.isArray(dRaw.effekt) ? dRaw.effekt.join(', ') : (dRaw.effekt || ''),
    anwendung: dRaw.anwendung || '',
    oberfläche: dRaw.oberflaeche || dRaw.oberfläche || '',
    glanzgrad: dRaw.glanzgrad || '',
    sondereigenschaft: dRaw.sondereigenschaft || '',
    beschreibung: dRaw.beschreibung || '',

    dateien: Array.isArray(dRaw.dateien) ? dRaw.dateien : [],

    farbpalette: dRaw.farbpalette || '',
    farbton: dRaw.farbton || '',
    qualität: dRaw.qualitaet || dRaw.qualität || '',
    zertifizierung: Array.isArray(dRaw.zertifizierungen) ? dRaw.zertifizierungen : [],
    aufladung: Array.isArray(dRaw.aufladung) ? dRaw.aufladung : [],

    promo_score,
    gesponsert: promo_score > 0,

    gewerblich: !!dRaw.istGewerblich,
    privat: dRaw.istGewerblich === false,

    published: data.published,
    status: data.status,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  return NextResponse.json({ artikel })
}
