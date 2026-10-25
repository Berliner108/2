// src/app/api/auftraege/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const VERFAHREN = [
  'Nasslackieren',
  'Pulverbeschichten',
  'KTL-Beschichten',
  'Verzinken',
  'Vernickeln',
  'Verchromen',
  'Verkupfern',
  'Verzinnen',
  'Vermessingen',
  'Bronzebeschichten',
  'Vergolden',
  'Versilbern',
  'Aluminieren',
  'Eloxieren',
  'Anodisieren',
  'Aluminium-Passivieren',
  'Edelstahl-Passivieren',
  'Zinkphosphatieren',
  'Eisenphosphatieren',
  'Mn-Phosphatieren',
  'Brünieren',
  'Beizen',
  'Elektropolieren',
  'Strahlen',
  'Schleifen',
  'Polieren',
  'Bürsten',
  'Trowalisieren',
  'Entgraten',
  'Verrunden',
  'Glätten',
  'Mattieren',
  'Chemisches Glänzen',
  'Entlacken',
  'Entzinken',
  'Entnickeln',
  'Entchromen',
  'Entkupfern',
  'Entmessingen',
  'Entbronzieren',
  'Entgolden',
  'Entsilbern',
  'Entzinnen',
  'Entaluminieren',
  'Enteloxieren',
  'Entanodisieren',
  'Folieren',
  'Isolierstegverpressen',
  'Einlagern',
] as const
const DEFAULT_LIMITS = {
  length: 20000,
  width: 6000,
  height: 3000,
  masse: 20000,
}
const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
function safeSearchValue(value: string): string {
  return value
    .trim()
    .replace(/,/g, ' ')
    .replace(/%/g, '\\\\%')
    .replace(/_/g, '\\\\_')
}
function finiteNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}
async function fetchProfileIdsByAccountType(
  supabase: any,
  accountType: 'business' | 'private'
): Promise<string[]> {
  const ids: string[] = []
  const chunk = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('account_type', accountType)
      .range(from, from + chunk - 1)
    if (error) throw error
    const rows = data ?? []
    ids.push(...rows.map((row: any) => String(row.id)).filter(Boolean))
    if (rows.length < chunk) break
    from += chunk
  }
  return ids
}
async function fetchLocationProfileIds(
  supabase: any,
  search: string
): Promise<string[]> {
  const s = safeSearchValue(search)
  if (!s) return []
  const ids: string[] = []
  const chunk = 1000
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .or(`address->>zip.ilike.%${s}%,address->>city.ilike.%${s}%`)
      .range(from, from + chunk - 1)
    if (error) {
      // Standortsuche soll die gesamte Auftragssuche nicht unbrauchbar machen,
      // falls ein altes Profil kein erwartetes address-JSON besitzt.
      console.warn('[auftraege] Standortsuche in profiles fehlgeschlagen:', error)
      return []
    }
    const rows = data ?? []
    ids.push(...rows.map((row: any) => String(row.id)).filter(Boolean))
    if (rows.length < chunk) break
    from += chunk
  }
  return ids
}
async function getNumericMaximum(
  supabase: any,
  column: 'laenge_mm' | 'breite_mm' | 'hoehe_mm' | 'masse_kg',
  fallback: number
): Promise<number> {
  const { data, error } = await supabase
    .from('jobs')
    .select(column)
    .eq('published', true)
    .eq('status', 'open')
    .not(column, 'is', null)
    .order(column, { ascending: false })
    .limit(1)
  if (error) {
    console.warn(`[auftraege] Maximum ${column} konnte nicht geladen werden:`, error)
    return fallback
  }
  return Math.max(fallback, finiteNumber(data?.[0]?.[column], fallback))
}
export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer()
    const url = new URL(req.url)
    const limitRaw = parseInt(url.searchParams.get('limit') ?? '50', 10)
    const limit = Math.min(Math.max(Number.isNaN(limitRaw) ? 50 : limitRaw, 1), 200)
    const pageRaw = parseInt(url.searchParams.get('page') ?? '1', 10)
    const page = Math.max(Number.isNaN(pageRaw) ? 1 : pageRaw, 1)
    const offsetParam =
      url.searchParams.get('offset') ??
      url.searchParams.get('skip') ??
      url.searchParams.get('start')
    const parsedOffset = offsetParam === null ? null : parseInt(offsetParam, 10)
    const offset =
      parsedOffset !== null && Number.isFinite(parsedOffset)
        ? Math.max(parsedOffset, 0)
        : null
    const search = url.searchParams.get('q') ?? url.searchParams.get('search') ?? ''
    const verfahren = url.searchParams.get('verfahren') ?? ''
    const sortierung = (url.searchParams.get('sort') ?? '').toLowerCase()
    const g = url.searchParams.get('g') === '1'
    const p = url.searchParams.get('p') === '1'
    const waSelbst = url.searchParams.get('wa_s') === '1'
    const waAbhol = url.searchParams.get('wa_a') === '1'
    const wnZust = url.searchParams.get('wn_z') === '1'
    const wnSelbst = url.searchParams.get('wn_s') === '1'
    const lRaw = url.searchParams.get('l')
    const wRaw = url.searchParams.get('w')
    const hRaw = url.searchParams.get('h')
    const mRaw = url.searchParams.get('m')
    const maxLength = lRaw !== null ? Number(lRaw) : null
    const maxWidth = wRaw !== null ? Number(wRaw) : null
    const maxHeight = hRaw !== null ? Number(hRaw) : null
    const maxMasse = mRaw !== null ? Number(mRaw) : null
    let accountProfileIds: string[] | null = null
    // Exakt wie bisher im Frontend: nur wenn genau einer der beiden Typfilter aktiv ist.
    if (g && !p) {
      accountProfileIds = await fetchProfileIdsByAccountType(supabase, 'business')
    } else if (p && !g) {
      accountProfileIds = await fetchProfileIdsByAccountType(supabase, 'private')
    }
    const locationProfileIds = search.trim()
      ? await fetchLocationProfileIds(supabase, search)
      : []
    const applyFilters = (
      query: any,
      options: { includeVerfahren?: boolean; includeSearch?: boolean } = {}
    ) => {
      const includeVerfahren = options.includeVerfahren !== false
      const includeSearch = options.includeSearch !== false
      let next = query
      next = next.eq('published', true)
      next = next.eq('status', 'open')
      if (includeVerfahren && verfahren) {
        next = next.or(
          `verfahren_1.eq.${verfahren},verfahren_2.eq.${verfahren}`
        )
      }
      if (accountProfileIds !== null) {
        next = next.in(
          'user_id',
          accountProfileIds.length ? accountProfileIds : [ZERO_UUID]
        )
      }
      if (waSelbst || waAbhol) {
        const values: string[] = []
        if (waSelbst) values.push('selbst')
        if (waAbhol) values.push('abholung')
        next = next.in('liefer_art', values)
      }
      if (wnZust || wnSelbst) {
        const values: string[] = []
        if (wnZust) values.push('anlieferung')
        if (wnSelbst) values.push('selbst')
        next = next.in('rueck_art', values)
      }
      if (maxLength !== null && Number.isFinite(maxLength)) {
        next = next.or(`laenge_mm.lte.${maxLength},laenge_mm.is.null`)
      }
      if (maxWidth !== null && Number.isFinite(maxWidth)) {
        next = next.or(`breite_mm.lte.${maxWidth},breite_mm.is.null`)
      }
      if (maxHeight !== null && Number.isFinite(maxHeight)) {
        next = next.or(`hoehe_mm.lte.${maxHeight},hoehe_mm.is.null`)
      }
      if (maxMasse !== null && Number.isFinite(maxMasse)) {
        next = next.or(`masse_kg.lte.${maxMasse},masse_kg.is.null`)
      }
      if (includeSearch && search.trim()) {
        const s = safeSearchValue(search)
        if (s) {
          const clauses = [
            `material_guete.ilike.%${s}%`,
            `material_guete_custom.ilike.%${s}%`,
            `verfahren_1.ilike.%${s}%`,
            `verfahren_2.ilike.%${s}%`,
          ]
          if (locationProfileIds.length) {
            clauses.push(`user_id.in.(${locationProfileIds.join(',')})`)
          }
          next = next.or(clauses.join(','))
        }
      }
      return next
    }
    // 1) Count-Abfrage – identisches Grundmuster wie bei Lackanfragen.
    const countQuery = applyFilters(
      supabase.from('jobs').select('id', { count: 'exact', head: true })
    )
    const { count: total, error: countError } = await countQuery
    if (countError) {
      console.error('[auftraege] count failed:', countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }
    // 2) Daten-Abfrage – nur die aktuelle Seite.
    const columns = `
      id,
      user_id,
      description,
      material_guete,
      material_guete_custom,
      laenge_mm,
      breite_mm,
      hoehe_mm,
      masse_kg,
      liefer_datum_utc,
      rueck_datum_utc,
      liefer_art,
      rueck_art,
      promo_score,
      verfahren_1,
      verfahren_2,
      specs,
      published,
      status
    `
    let dataQuery = applyFilters(supabase.from('jobs').select(columns))
    switch (sortierung) {
      case 'warenausgabe-auf':
        dataQuery = dataQuery
          .order('liefer_datum_utc', { ascending: true })
          .order('id', { ascending: true })
        break
      case 'warenausgabe-ab':
        dataQuery = dataQuery
          .order('liefer_datum_utc', { ascending: false })
          .order('id', { ascending: false })
        break
      case 'warenannahme-auf':
        dataQuery = dataQuery
          .order('rueck_datum_utc', { ascending: true })
          .order('id', { ascending: true })
        break
      case 'warenannahme-ab':
        dataQuery = dataQuery
          .order('rueck_datum_utc', { ascending: false })
          .order('id', { ascending: false })
        break
      default:
        dataQuery = dataQuery
          .order('promo_score', { ascending: false })
          .order('rueck_datum_utc', { ascending: true })
          .order('id', { ascending: true })
        break
    }
    const from = offset !== null ? offset : (page - 1) * limit
    const to = from + limit - 1
    dataQuery = dataQuery.range(from, to)
    const { data: jobData, error: jobError } = await dataQuery
    if (jobError) {
      console.error('[auftraege] query failed:', jobError)
      return NextResponse.json({ error: jobError.message }, { status: 500 })
    }
    const jobs = jobData ?? []
    // 3) Profile nur für die aktuelle Seite laden.
    const userIds = Array.from(
      new Set(jobs.map((job: any) => job.user_id).filter(Boolean))
    ) as string[]
    const profileById = new Map<string, any>()
    if (userIds.length) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, account_type, address')
        .in('id', userIds)
      if (profileError) {
        console.warn('[auftraege] profiles lookup failed:', profileError)
      } else {
        for (const profile of profileData ?? []) {
          profileById.set(profile.id, profile)
        }
      }
    }
    // 4) Titelbild nur für die aktuelle Seite laden.
    const jobIds = jobs.map((job: any) => job.id)
    const titleImgByJob = new Map<string, string>()
    if (jobIds.length) {
      const { data: filesData, error: filesError } = await supabase
        .from('job_files')
        .select('id, job_id, kind, bucket, path, original_name, created_at')
        .in('job_id', jobIds)
        .eq('kind', 'image')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
      if (filesError) {
        console.warn('[auftraege] job_files lookup failed:', filesError)
      } else {
        for (const file of filesData ?? []) {
          if (titleImgByJob.has(file.job_id)) continue
          const { data } = supabase.storage
            .from(file.bucket)
            .getPublicUrl(file.path)
          titleImgByJob.set(file.job_id, data.publicUrl)
        }
      }
    }
    const items = jobs.map((job: any) => {
      const verfahrenList: { name: string; felder: Record<string, never> }[] = []
      if (job.verfahren_1) {
        verfahrenList.push({ name: job.verfahren_1, felder: {} })
      }
      if (job.verfahren_2) {
        verfahrenList.push({ name: job.verfahren_2, felder: {} })
      }
      const material =
        job.material_guete === 'Andere' && job.material_guete_custom
          ? `Andere (${job.material_guete_custom})`
          : job.material_guete ?? null
      const profile = profileById.get(job.user_id) ?? null
      const zip = profile?.address?.zip ?? ''
      const city = profile?.address?.city ?? ''
      const standort = zip || city ? `${zip} ${city}`.trim() : null
      const accountType = profile?.account_type ?? 'business'
      const titelbild = titleImgByJob.get(job.id)
      return {
        id: job.id,
        verfahren: verfahrenList,
        material,
        length: job.laenge_mm ?? 0,
        width: job.breite_mm ?? 0,
        height: job.hoehe_mm ?? 0,
        masse: job.masse_kg != null ? String(job.masse_kg) : '0',
        warenausgabeDatum: job.liefer_datum_utc,
        warenannahmeDatum: job.rueck_datum_utc,
        warenausgabeArt: job.liefer_art ?? null,
        warenannahmeArt: job.rueck_art ?? null,
        bilder: titelbild ? [titelbild] : [],
        standort,
        gesponsert: Number(job.promo_score ?? 0) > 0,
        promoScore: Number(job.promo_score ?? 0),
        gewerblich: accountType === 'business',
        privat: accountType === 'private',
        beschreibung: job.description ?? null,
        dateien: [],
        user: null,
      }
    })
    // 5) Slider-Maxima serverseitig ermitteln.
    const [maxL, maxW, maxH, maxM] = await Promise.all([
      getNumericMaximum(supabase, 'laenge_mm', DEFAULT_LIMITS.length),
      getNumericMaximum(supabase, 'breite_mm', DEFAULT_LIMITS.width),
      getNumericMaximum(supabase, 'hoehe_mm', DEFAULT_LIMITS.height),
      getNumericMaximum(supabase, 'masse_kg', DEFAULT_LIMITS.masse),
    ])
    // 6) Verfahren-Zähler: wie vorher mit allen aktiven Filtern außer
    // Verfahren selbst und Suchbegriff.
    const verfahrenCounts: Record<string, number> = Object.fromEntries(
      VERFAHREN.map((v) => [v, 0])
    )
    const countChunk = 1000
    let countFrom = 0
    while (true) {
      const countBaseQuery = applyFilters(
        supabase.from('jobs').select('verfahren_1, verfahren_2'),
        { includeVerfahren: false, includeSearch: false }
      ).range(countFrom, countFrom + countChunk - 1)
      const { data: countRows, error: countRowsError } = await countBaseQuery
      if (countRowsError) {
        console.warn('[auftraege] Verfahren-Zähler fehlgeschlagen:', countRowsError)
        break
      }
      const rows = countRows ?? []
      for (const row of rows) {
        for (const value of [row.verfahren_1, row.verfahren_2]) {
          if (value && value in verfahrenCounts) {
            verfahrenCounts[value] += 1
          }
        }
      }
      if (rows.length < countChunk) break
      countFrom += countChunk
    }
    return NextResponse.json(
      {
        items,
        total: total ?? 0,
        page,
        limit,
        limits: {
          length: maxL,
          width: maxW,
          height: maxH,
          masse: maxM,
        },
        verfahren_counts: verfahrenCounts,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[auftraege] GET crashed:', error)
    return NextResponse.json(
      { error: error?.message ?? 'Aufträge konnten nicht geladen werden.' },
      { status: 500 }
    )
  }
}
