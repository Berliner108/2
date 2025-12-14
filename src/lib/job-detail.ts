// src/lib/job-detail.ts
import 'server-only'
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

type JobRow = {
  id: string
  user_id: string
  description: string | null
  material_guete: string | null
  material_guete_custom: string | null
  laenge_mm: number | null
  breite_mm: number | null
  hoehe_mm: number | null
  masse_kg: number | null
  liefer_datum_utc: string
  rueck_datum_utc: string
  liefer_art: string | null
  rueck_art: string | null
  promo_score: number | null
  verfahren_1: string | null
  verfahren_2: string | null
  specs: any | null
  published: boolean | null
  status: string | null
}

type ProfileRow = {
  id: string
  username: string | null
  rating_avg: number | string | null
  rating_count: number | string | null
  account_type: string | null
  address: { zip?: string; city?: string } | null
}

type JobFileRow = {
  job_id: string
  kind: 'image' | 'document'
  bucket: string
  path: string
  original_name: string | null
}

export async function fetchJobDetail(jobId: string): Promise<Auftrag | null> {
  const supabase = await supabaseServer()

  // 1) Job holen (OHNE profiles-embed)
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
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
    `)
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    console.error('fetchJobDetail jobs error:', jobError, 'jobId:', jobId)
    return null
  }

  const j = job as unknown as JobRow

  // Optional: wenn du NUR published+open anzeigen willst, hier prüfen:
  if (!j.published || j.status !== 'open') {
    return null
  }

  // 2) Profile separat holen
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, username, rating_avg, rating_count, account_type, address')
  .eq('id', j.user_id)
  .maybeSingle()

  if (profileError) {
    console.error('fetchJobDetail profiles error:', profileError)
  }

  const p = (profile ?? null) as ProfileRow | null

  // 3) Files separat holen
  const { data: fileRows, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, kind, bucket, path, original_name')
    .eq('job_id', j.id)

  if (filesError) {
    console.error('fetchJobDetail job_files error:', filesError)
  }

  const files = (fileRows ?? []) as unknown as JobFileRow[]
  const imageFiles = files.filter(f => f.kind === 'image')
  const docFiles = files.filter(f => f.kind === 'document')

  // alle Bilder
  const bilder = imageFiles.map(f => {
    const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
    return data.publicUrl
  })

  // alle Dokumente
  const dateien = docFiles.map(f => {
    const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
    return { name: f.original_name ?? 'Datei', url: data.publicUrl }
  })

  // Specs -> felder je Verfahren (wie gehabt)
  const felder1: Record<string, any> = {}
  const felder2: Record<string, any> = {}

  if (j.specs && typeof j.specs === 'object') {
    for (const [key, value] of Object.entries(j.specs as Record<string, any>)) {
      const prefixMatch = key.match(/^v(\d+)__/)
      const verfahrenIndex = prefixMatch ? Number(prefixMatch[1]) - 1 : 0
      const withoutPrefix = key.replace(/^v\d+__/, '')
      const parts = withoutPrefix.split('__')
      const fieldKey = parts.length > 1 ? parts[1] : parts[0]
      ;(verfahrenIndex === 1 ? felder2 : felder1)[fieldKey] = value
    }
  }

  const verfahren: Auftrag['verfahren'] = []
  if (j.verfahren_1) verfahren.push({ name: j.verfahren_1, felder: felder1 })
  if (j.verfahren_2) verfahren.push({ name: j.verfahren_2, felder: felder2 })

  const material =
    j.material_guete === 'Andere' && j.material_guete_custom
      ? `Andere (${j.material_guete_custom})`
      : j.material_guete ?? 'k. A.'

  const length = j.laenge_mm ?? 0
  const width = j.breite_mm ?? 0
  const height = j.hoehe_mm ?? 0
  const masse = j.masse_kg != null ? String(j.masse_kg) : '0'

  const warenausgabeDatum = new Date(j.liefer_datum_utc)
  const warenannahmeDatum = new Date(j.rueck_datum_utc)

  const zip = p?.address?.zip ?? ''
  const city = p?.address?.city ?? ''
  const standort = (zip || city) ? `${zip} ${city}`.trim() : 'Österreich'

  const accountType = p?.account_type ?? 'business'
  const gewerblich = accountType === 'business'
  const privat = accountType === 'private'

  const gesponsert = (j.promo_score ?? 0) > 0
  const username = p?.username ?? null

  const ratingAvg =
  p?.rating_avg == null ? null : Number(p.rating_avg)

const ratingCount =
  p?.rating_count == null ? null : Number(p.rating_count)

  return {
    id: j.id,
    verfahren,
    material,
    length,
    width,
    height,
    masse,
    warenausgabeDatum,
    warenannahmeDatum,
    warenausgabeArt: j.liefer_art ?? '',
    warenannahmeArt: j.rueck_art ?? '',
    bilder,
    dateien,
    standort,
    gesponsert,
    gewerblich,
    privat,
    beschreibung: j.description ?? '',
    user: username,
    userRatingAvg: Number.isFinite(ratingAvg) ? ratingAvg : null,
  userRatingCount: Number.isFinite(ratingCount) ? ratingCount : null,
  }
}
