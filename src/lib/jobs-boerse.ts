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

  // 3) job_files holen (Bilder + Dokumente)
  const jobIds = jobs.map((j) => j.id)
  const { data: filesData, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, kind, bucket, path, original_name')
    .in('job_id', jobIds)

  if (filesError) {
    console.error('fetchBoersenJobs job_files error:', filesError)
  }

  const filesByJob = new Map<string, JobFileRow[]>()
  for (const f of ((filesData ?? []) as unknown as JobFileRow[])) {
    const arr = filesByJob.get(f.job_id) ?? []
    arr.push(f)
    filesByJob.set(f.job_id, arr)
  }

  // 4) Mapping → Auftrag[]
  return jobs.map((job) => {
    const verfahren: Auftrag['verfahren'] = []
    if (job.verfahren_1) verfahren.push({ name: job.verfahren_1, felder: {} })
    if (job.verfahren_2) verfahren.push({ name: job.verfahren_2, felder: {} })

    const material =
      job.material_guete === 'Andere' && job.material_guete_custom
        ? `Andere (${job.material_guete_custom})`
        : job.material_guete ?? 'k. A.'

    const length = job.laenge_mm ?? 0
    const width = job.breite_mm ?? 0
    const height = job.hoehe_mm ?? 0
    const masse = job.masse_kg != null ? String(job.masse_kg) : '0'

    const warenausgabeDatum = new Date(job.liefer_datum_utc)
    const warenannahmeDatum = new Date(job.rueck_datum_utc)

    const profile = profileById.get(job.user_id) ?? null
    const zip = profile?.address?.zip ?? ''
    const city = profile?.address?.city ?? ''
    const standort = zip || city ? `${zip} ${city}`.trim() : 'Österreich'

    const accountType = profile?.account_type ?? 'business'
    const gewerblich = accountType === 'business'
    const privat = accountType === 'private'

    const gesponsert = (job.promo_score ?? 0) > 0

    const jobFiles = filesByJob.get(job.id) ?? []
    const imageFiles = jobFiles.filter((f) => f.kind === 'image')
    const docFiles = jobFiles.filter((f) => f.kind === 'document')

    // ✅ Bilder aus Storage
    const bilder = imageFiles.map((f) => {
      const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
      return data.publicUrl
    })

    // ✅ Dokumente (optional)
    const dateien = docFiles.map((f) => {
      const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
      return { name: f.original_name ?? 'Datei', url: data.publicUrl }
    })

    return {
      id: job.id,
      verfahren,
      material,
      length,
      width,
      height,
      masse,
      warenausgabeDatum,
      warenannahmeDatum,
      warenausgabeArt: job.liefer_art ?? '',
      warenannahmeArt: job.rueck_art ?? '',
      bilder, // ✅ echte Bilder aus dem Formular
      standort,
      gesponsert,
      gewerblich,
      privat,
      beschreibung: job.description ?? '',
      dateien,
      user: undefined,
    }
  })
}
