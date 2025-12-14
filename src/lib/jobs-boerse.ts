// src/lib/jobs-boerse.ts
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

type JobRow = {
  id: string
  user_id: string
  description: string | null
  material_guete: string | null
  material_guete_custom: string | null
  materialguete: string | null
  materialguete_custom: string | null
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
  images_count: number | null
}

type ProfileRow = {
  id: string
  plz: string | null
  ort: string | null
  account_type: string | null
}

type JobFileRow = {
  job_id: string
  storage_path: string
  file_name: string
  file_type: 'image' | 'attachment'
}

export async function fetchBoersenJobs(): Promise<Auftrag[]> {
  const supabase = await supabaseServer()

 const { data: jobData, error: jobError } = await supabase
  .from('jobs')
  .select(`
    id,
    user_id,
    description,
    material_guete,
    material_guete_custom,
    materialguete,
    materialguete_custom,
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
    images_count
  `)
    .eq('published', true)
    .eq('status', 'open')
    .order('promo_score', { ascending: false })
    .order('rueck_datum_utc', { ascending: true })

  if (jobError || !jobData) {
    console.error('fetchBoersenJobs jobs error', jobError)
    return []
  }

  const jobs = jobData as unknown as JobRow[]

  if (jobs.length === 0) return []

  // 2) Profile zu den Usern holen (PLZ/Ort, account_type)
  const userIds = Array.from(new Set(jobs.map((j) => j.user_id)))
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, plz, ort, account_type')
    .in('id', userIds)

  if (profileError) {
    console.error('fetchBoersenJobs profiles error', profileError)
  }

  const profiles = (profileData ?? []) as ProfileRow[]
  const profileByUser = new Map<string, ProfileRow>()
  for (const p of profiles) {
    profileByUser.set(p.id, p)
  }

  // 3) Dateien für alle Jobs holen
  const jobIds = jobs.map((j) => j.id)
  let filesByJob = new Map<string, JobFileRow[]>()

  const { data: fileData, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, storage_path, file_name, file_type')
    .in('job_id', jobIds)

  if (filesError) {
    console.error('fetchBoersenJobs job_files error', filesError)
  } else if (fileData) {
    const files = fileData as unknown as JobFileRow[]
    filesByJob = new Map<string, JobFileRow[]>()
    for (const f of files) {
      const arr = filesByJob.get(f.job_id) ?? []
      arr.push(f)
      filesByJob.set(f.job_id, arr)
    }
  }

  // 4) Mapping DB → Auftrag[]
  const result: Auftrag[] = jobs.map((job) => {
    const jobFiles = filesByJob.get(job.id) ?? []
    const imageFiles = jobFiles.filter((f) => f.file_type === 'image')
    const attachFiles = jobFiles.filter((f) => f.file_type === 'attachment')

    const bilder =
      imageFiles.length > 0
        ? imageFiles.map((f) => {
            const { data } = supabase.storage
              .from('job-files')
              .getPublicUrl(f.storage_path)
            return data.publicUrl
          })
        : ['/images/platzhalter.jpg']

    const dateien =
      attachFiles.length > 0
        ? attachFiles.map((f) => {
            const { data } = supabase.storage
              .from('job-files')
              .getPublicUrl(f.storage_path)
            return {
              name: f.file_name,
              url: data.publicUrl,
            }
          })
        : []

    // Verfahren 1 & 2
    const verfahren: Auftrag['verfahren'] = []
    if (job.verfahren_1) verfahren.push({ name: job.verfahren_1, felder: {} })
    if (job.verfahren_2) verfahren.push({ name: job.verfahren_2, felder: {} })

    // Material aus material_guete / materialguete + *_custom
    const rawMaterial =
      job.material_guete ??
      job.materialguete ??
      null

    const material =
      rawMaterial === 'Andere' &&
      (job.material_guete_custom ?? job.materialguete_custom)
        ? `Andere (${job.material_guete_custom ?? job.materialguete_custom})`
        : rawMaterial ?? 'k. A.'

    const length = job.laenge_mm ?? 0
    const width = job.breite_mm ?? 0
    const height = job.hoehe_mm ?? 0
    const masse =
      job.masse_kg !== null && job.masse_kg !== undefined
        ? String(job.masse_kg)
        : '0'

    const warenausgabeDatum = new Date(job.liefer_datum_utc)
    const warenannahmeDatum = new Date(job.rueck_datum_utc)
    const warenausgabeArt = job.liefer_art ?? ''
    const warenannahmeArt = job.rueck_art ?? ''

    const profile = profileByUser.get(job.user_id)
    const standort =
      profile && (profile.plz || profile.ort)
        ? `${profile.plz ?? ''} ${profile.ort ?? ''}`.trim()
        : 'k. A.'

    const accountType = profile?.account_type ?? 'gewerblich'
    const gewerblich = accountType === 'gewerblich'
    const privat = accountType === 'privat'

    const gesponsert = (job.promo_score ?? 0) > 0
    const beschreibung = job.description ?? ''

    const auftrag: Auftrag = {
      id: job.id,
      verfahren,
      material,
      length,
      width,
      height,
      masse,
      warenausgabeDatum,
      warenannahmeDatum,
      warenausgabeArt,
      warenannahmeArt,
      bilder,
      standort,
      gesponsert,
      gewerblich,
      privat,
      beschreibung,
      dateien,
      user: undefined,
    }

    return auftrag
  })

  return result
}
