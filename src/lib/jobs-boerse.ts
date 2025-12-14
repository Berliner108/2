// src/lib/jobs-boerse.ts
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

/**
 * Holt alle sichtbaren Jobs aus der jobs-Tabelle + Dateien aus job_files
 * und mappt sie auf deinen Auftrag-Typ für Auftragsbörse & Detailseite.
 */
export async function fetchBoersenJobs(): Promise<Auftrag[]> {
  const supabase = await supabaseServer()

  // 1️⃣ Jobs + Profile holen
  const { data: rows, error } = await supabase
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
      specs,
      profiles (
        plz,
        ort,
        account_type
      )
    `,
    )
    .eq('published', true)
    .eq('status', 'open')
    .order('promo_score', { ascending: false })
    .order('rueck_datum_utc', { ascending: true })

  if (error || !rows) {
    console.error('fetchBoersenJobs error', error)
    return []
  }

  // Wir tippen rows bewusst als any[], um keinen Stress mit Supabase-Typen zu haben
  const jobs = rows as any[]

  const jobIds = jobs.map((j) => j.id as string)

  // 2️⃣ Alle Dateien zu diesen Jobs holen
  const { data: fileRows, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, storage_path, file_name, file_type')
    .in('job_id', jobIds)

  if (filesError) {
    console.error('fetchBoersenJobs job_files error', filesError)
  }

  const files = (fileRows ?? []) as any[]

  const filesByJob = new Map<string, any[]>()
  for (const f of files) {
    const arr = filesByJob.get(f.job_id) ?? []
    arr.push(f)
    filesByJob.set(f.job_id, arr)
  }

  const storage = supabase.storage.from('job-files')

  // 3️⃣ Mapping DB → dein Frontend-Typ Auftrag
  const result: Auftrag[] = jobs.map((job) => {
    const fileList = filesByJob.get(job.id as string) ?? []
    const imageFiles = fileList.filter((f) => f.file_type === 'image')
    const attachFiles = fileList.filter((f) => f.file_type === 'attachment')

    // Bilder-URLs aus dem Storage, sonst Platzhalter
    const bilder: string[] =
      imageFiles.length > 0
        ? imageFiles.map((f) => {
            const { data } = storage.getPublicUrl(f.storage_path as string)
            return data.publicUrl
          })
        : ['/images/platzhalter.jpg']

    // Attachments (PDF etc.)
    const dateien =
      attachFiles.length > 0
        ? attachFiles.map((f) => {
            const { data } = storage.getPublicUrl(f.storage_path as string)
            return {
              name: f.file_name as string,
              url: data.publicUrl,
            }
          })
        : []

    // Material (Materialgüte)
    const material =
      job.material_guete === 'Andere' && job.material_guete_custom
        ? `Andere (${job.material_guete_custom})`
        : (job.material_guete as string | null) ?? 'k. A.'

    const length = (job.laenge_mm as number | null) ?? 0
    const width = (job.breite_mm as number | null) ?? 0
    const height = (job.hoehe_mm as number | null) ?? 0
    const masse =
      job.masse_kg !== null && job.masse_kg !== undefined
        ? String(job.masse_kg)
        : '0'

    // Datum + Logistikarten
    const warenausgabeDatum = new Date(job.liefer_datum_utc as string)
    const warenannahmeDatum = new Date(job.rueck_datum_utc as string)

    const rawLieferArt = (job.liefer_art as string | null) ?? ''
    const rawRueckArt = (job.rueck_art as string | null) ?? ''

    // Mapping auf deine Filter-Werte
    const warenausgabeArt =
      rawLieferArt === 'selbst'
        ? 'selbstanlieferung'
        : rawLieferArt || ''

    const warenannahmeArt =
      rawRueckArt === 'selbst'
        ? 'selbstabholung'
        : rawRueckArt || ''

    // Verfahren 1 & 2 → wie bei deinen Dummy-Aufträgen
    const verfahren: Auftrag['verfahren'] = []
    if (job.verfahren_1) {
      verfahren.push({ name: job.verfahren_1 as string, felder: {} })
    }
    if (job.verfahren_2) {
      verfahren.push({ name: job.verfahren_2 as string, felder: {} })
    }

    // Standort aus profiles (PLZ + Ort)
    const profile = job.profiles?.[0] as
      | { plz?: string | null; ort?: string | null; account_type?: string | null }
      | undefined

    const plz = profile?.plz ?? ''
    const ort = profile?.ort ?? ''
    const standort =
      plz || ort ? `${plz}${plz && ort ? ' ' : ''}${ort}` : 'k. A.'

    const accountType = (profile?.account_type || '').toLowerCase()
    const gewerblich = accountType === 'gewerblich' || !accountType
    const privat = accountType === 'privat'

    const beschreibung = (job.description as string | null) ?? ''

    const gesponsert = (job.promo_score as number | null) && job.promo_score > 0

    const auftrag: Auftrag = {
      id: job.id as string,
      verfahren,                         // → in der Karte z.B. "Nasslackieren & Folieren"
      material,                          // → Materialgüte aus DB
      length,
      width,
      height,
      masse,
      warenausgabeDatum,
      warenannahmeDatum,
      warenausgabeArt,
      warenannahmeArt,
      bilder,                            // → erstes Bild für die Karte, alle für Detailseite
      standort,                          // → "PLZ Ort" aus profiles
      gesponsert: !!gesponsert,
      gewerblich,
      privat,
      beschreibung,
      dateien,
      user: undefined,                   // später aus profiles.username o.ä.
    }

    return auftrag
  })

  return result
}
