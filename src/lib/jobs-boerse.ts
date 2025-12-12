// src/lib/jobs-boerse.ts
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

type JobRow = {
  id: string
  user_id: string
  description: string | null
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
}

type JobFileRow = {
  job_id: string
  storage_path: string
  file_name: string
  file_type: 'image' | 'attachment'
}

type ProfileRow = {
  id: string
  plz: string | null
  ort: string | null
}

// 🔹 dieser Name wird in page.tsx importiert
export async function fetchBoersenJobs(): Promise<Auftrag[]> {
  const supabase = await supabaseServer()

  // 1) Jobs holen
  const { data: rows, error } = await supabase
    .from('jobs')
    .select(`
      id,
      user_id,
      description,
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
      specs
    `)
    .eq('published', true)
    .eq('status', 'open')
    .order('promo_score', { ascending: false })
    .order('rueck_datum_utc', { ascending: true })

  if (error || !rows) {
    console.error('fetchBoersenJobs jobs error', error)
    return []
  }

  const jobs = rows as JobRow[]
  if (jobs.length === 0) return []

  const jobIds = jobs.map((j) => j.id)
  const userIds = [...new Set(jobs.map((j) => j.user_id))]

  // 2) Dateien holen
  const { data: fileRows, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, storage_path, file_name, file_type')
    .in('job_id', jobIds)

  if (filesError) {
    console.error('fetchBoersenJobs job_files error', filesError)
  }

  const files = (fileRows ?? []) as JobFileRow[]
  const filesByJob = new Map<string, JobFileRow[]>()
  for (const f of files) {
    const arr = filesByJob.get(f.job_id) ?? []
    arr.push(f)
    filesByJob.set(f.job_id, arr)
  }

  // 3) Profile holen → PLZ + Ort
  const { data: profileRows, error: profilesError } = await supabase
    .from('profiles')
    .select('id, plz, ort')
    .in('id', userIds)

  if (profilesError) {
    console.error('fetchBoersenJobs profiles error', profilesError)
  }

  const profilesMap = new Map<string, ProfileRow>()
  for (const p of profileRows ?? []) {
    profilesMap.set(p.id, p as ProfileRow)
  }

  const storage = supabase.storage.from('job-files')

  // 4) Mapping → Auftrag[]
  const auftraege: Auftrag[] = jobs.map((job) => {
    const jobFiles = filesByJob.get(job.id) ?? []
    const imageFiles = jobFiles.filter((f) => f.file_type === 'image')
    const attachFiles = jobFiles.filter((f) => f.file_type === 'attachment')

    const bilder =
      imageFiles.length > 0
        ? imageFiles.map(
            (f) => storage.getPublicUrl(f.storage_path).data.publicUrl
          )
        : ['/images/platzhalter.jpg']

    const dateien =
      attachFiles.length > 0
        ? attachFiles.map((f) => ({
            name: f.file_name,
            url: storage.getPublicUrl(f.storage_path).data.publicUrl,
          }))
        : []

    // 🔹 Verfahren 1 + 2 – in der Karte mit " & " verbunden
    const verfahren: Auftrag['verfahren'] = []
    if (job.verfahren_1) verfahren.push({ name: job.verfahren_1, felder: {} })
    if (job.verfahren_2) verfahren.push({ name: job.verfahren_2, felder: {} })

    const material =
      job.materialguete === 'Andere' && job.materialguete_custom
        ? `Andere (${job.materialguete_custom})`
        : job.materialguete ?? 'k. A.'

    // Standort aus profiles
    const prof = profilesMap.get(job.user_id)
    const plz = prof?.plz?.trim() ?? ''
    const ort = prof?.ort?.trim() ?? ''
    const standort = (plz || ort) ? `${plz} ${ort}`.trim() : '–'

    const auftrag: Auftrag = {
      id: job.id,
      verfahren,
      material,
      length: job.laenge_mm ?? 0,
      width: job.breite_mm ?? 0,
      height: job.hoehe_mm ?? 0,
      masse: job.masse_kg != null ? String(job.masse_kg) : '0',
      warenausgabeDatum: new Date(job.liefer_datum_utc),
      warenannahmeDatum: new Date(job.rueck_datum_utc),
      warenausgabeArt: job.liefer_art ?? '',
      warenannahmeArt: job.rueck_art ?? '',
      bilder,
      standort,
      gesponsert: (job.promo_score ?? 0) > 0,
      gewerblich: true,
      privat: false,
      beschreibung: job.description ?? '',
      dateien,
      user: undefined,
    }

    return auftrag
  })

  return auftraege
}
