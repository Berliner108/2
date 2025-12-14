// src/lib/jobs-boerse.ts
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
  account_type: string | null
  address: { zip?: string; city?: string } | null
}

type JobFileRow = {
  job_id: string
  kind: 'image' | 'document'
  bucket: string
  path: string
  original_name: string | null
  created_at?: string
}

export async function fetchBoersenJobs(): Promise<Auftrag[]> {
  const supabase = await supabaseServer()

  // 1) Jobs holen
  const { data: jobData, error: jobError } = await supabase
    .from('jobs')
    .select(
      `
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
    `,
    )
    .eq('published', true)
    .eq('status', 'open')
    .order('promo_score', { ascending: false })
    .order('rueck_datum_utc', { ascending: true })

  if (jobError) {
    console.error('fetchBoersenJobs jobs error:', jobError)
    return []
  }

  const jobs = (jobData ?? []) as unknown as JobRow[]
  if (jobs.length === 0) return []

  // 2) Profiles separat holen
  const userIds = Array.from(new Set(jobs.map((j) => j.user_id)))
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, account_type, address')
    .in('id', userIds)

  if (profileError) {
    console.error('fetchBoersenJobs profiles error:', profileError)
  }

  const profileById = new Map<string, ProfileRow>()
  for (const p of (profileData ?? []) as ProfileRow[]) profileById.set(p.id, p)

  // 3) job_files holen (für Titelbild reicht: nur images!)
  const jobIds = jobs.map((j) => j.id)
  const { data: filesData, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, kind, bucket, path, original_name, created_at')
    .in('job_id', jobIds)
    .eq('kind', 'image') // ✅ Börse: nur Bilder
    .order('created_at', { ascending: true }) // ✅ erstes Bild = Titelbild

  if (filesError) {
    console.error('fetchBoersenJobs job_files error:', filesError)
  }

  // Map: job_id -> erstes Bild
  const titleImgByJob = new Map<string, string>()
  for (const f of ((filesData ?? []) as unknown as JobFileRow[])) {
    if (titleImgByJob.has(f.job_id)) continue
    const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
    titleImgByJob.set(f.job_id, data.publicUrl)
  }

  // 4) Mapping → Auftrag[]
  return jobs.map((job) => {
    const verfahren: Auftrag['verfahren'] = []
    if (job.verfahren_1) verfahren.push({ name: job.verfahren_1, felder: {} })
    if (job.verfahren_2) verfahren.push({ name: job.verfahren_2, felder: {} })

    const material: Auftrag['material'] =
      job.material_guete === 'Andere' && job.material_guete_custom
        ? `Andere (${job.material_guete_custom})`
        : (job.material_guete ?? null)

    const profile = profileById.get(job.user_id) ?? null
    const zip = profile?.address?.zip ?? ''
    const city = profile?.address?.city ?? ''
    const standort: Auftrag['standort'] =
      zip || city ? `${zip} ${city}`.trim() : null

    const accountType = profile?.account_type ?? 'business'
    const gewerblich = accountType === 'business'
    const privat = accountType === 'private'

    const gesponsert = (job.promo_score ?? 0) > 0

    const titelbild = titleImgByJob.get(job.id)
    const bilder = titelbild ? [titelbild] : [] // ✅ genau 1 Bild

    return {
      id: job.id,
      verfahren,
      material,
      length: job.laenge_mm ?? 0,
      width: job.breite_mm ?? 0,
      height: job.hoehe_mm ?? 0,
      masse: job.masse_kg != null ? String(job.masse_kg) : '0',
      warenausgabeDatum: new Date(job.liefer_datum_utc),
      warenannahmeDatum: new Date(job.rueck_datum_utc),
      warenausgabeArt: job.liefer_art ?? null,
      warenannahmeArt: job.rueck_art ?? null,
      bilder,
      standort,
      gesponsert,
      gewerblich,
      privat,
      beschreibung: job.description ?? null,
      dateien: [], // ✅ Börse: keine Dokumente laden
      user: null,
    }
  })
}
