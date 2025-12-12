// src/lib/job-detail.ts
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

type JobRow = {
  id: string
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
}


type JobFileRow = {
  job_id: string
  storage_path: string
  file_name: string
  file_type: 'image' | 'attachment'
}

export async function fetchJobDetail(jobId: string): Promise<Auftrag | null> {
  const supabase = await supabaseServer()

  // 1️⃣ Job holen
  const { data: row, error } = await supabase
    .from('jobs')
    .select(
      `
      id,
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
      specs
    `,
    )
    .eq('id', jobId)
    .eq('published', true)
    .eq('status', 'open')
    .single()

  if (error) {
    console.error('fetchJobDetail job error', error)
    return null
  }
  if (!row) return null

  const job = row as JobRow

  // 2️⃣ Dateien holen (Bilder + Attachments)
  const { data: fileRows, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, storage_path, file_name, file_type')
    .eq('job_id', job.id)

  if (filesError) {
    console.error('fetchJobDetail job_files error', filesError)
  }

  const files = (fileRows ?? []) as JobFileRow[]

  const imageFiles = files.filter((f) => f.file_type === 'image')
  const attachFiles = files.filter((f) => f.file_type === 'attachment')

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

  // 3️⃣ Mapping DB → dein Auftrag-Typ

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
  const masse =
    job.masse_kg !== null && job.masse_kg !== undefined
      ? String(job.masse_kg)
      : '0'

  const warenausgabeDatum = new Date(job.liefer_datum_utc)
  const warenannahmeDatum = new Date(job.rueck_datum_utc)
  const warenausgabeArt = job.liefer_art ?? ''
  const warenannahmeArt = job.rueck_art ?? ''

  // TODO: später aus profiles ziehen
  const standort = 'Österreich'
  const user = undefined // oder Username aus profiles

  const gesponsert = (job.promo_score ?? 0) > 0
  const gewerblich = true
  const privat = false

  const beschreibung = job.description ?? ''

  // Spezifikationen: erstmal noch nicht zurückmappen → felder bleiben leer,
  // dein Detail-UI zeigt dann einfach „keine Spezifikationen“.
  // (Das können wir später aus job.specs → verfahren[].felder füllen.)

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
    user, // optional in deinem Typ, sonst als any casten
  } as Auftrag

  return auftrag
}
