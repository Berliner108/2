// src/lib/jobs-boerse.ts
import 'server-only'
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

type ProfileRow = {
  plz: string | null
  ort: string | null
  account_type: string | null
}

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
  published: boolean | null
  status: string | null
  images_count: number | null
  files_count: number | null
  serienauftrag_aktiv: boolean | null
  serien_rhythmus: string | null
  serien_termine: any | null
  profiles: ProfileRow[] | null
}

export async function fetchBoersenJobs(): Promise<Auftrag[]> {
  const supabase = await supabaseServer()

  const { data, error } = await supabase
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
      published,
      status,
      images_count,
      files_count,
      serienauftrag_aktiv,
      serien_rhythmus,
      serien_termine,
      profiles (
        plz,
        ort,
        account_type
      )
    `
    )
    .eq('published', true)
    .eq('status', 'open')
    // 🔥 Kein Datums-Filter – sonst würden ältere Jobs verschwinden
    .order('promo_score', { ascending: false })
    .order('rueck_datum_utc', { ascending: true })

  if (error) {
    console.error('fetchBoersenJobs error:', error)
    return []
  }

  const rows = (data ?? []) as unknown as JobRow[]

  // Debug: siehst du im Server-Log, wie viele Jobs es wirklich sind
  console.log('fetchBoersenJobs: rows from DB =', rows.length)

  const jobs: Auftrag[] = rows.map((job) => {
    // 1) Verfahren 1 & 2 → Überschrift in Karte
    const verfahren: Auftrag['verfahren'] = []
    if (job.verfahren_1) verfahren.push({ name: job.verfahren_1, felder: {} })
    if (job.verfahren_2) verfahren.push({ name: job.verfahren_2, felder: {} })

    // 2) Materialgüte → Feld "material"
    const material =
      job.material_guete === 'Andere' && job.material_guete_custom
        ? `Andere (${job.material_guete_custom})`
        : job.material_guete ?? 'k. A.'

    // 3) Maße & Masse
    const length = job.laenge_mm ?? 0
    const width = job.breite_mm ?? 0
    const height = job.hoehe_mm ?? 0
    const masse =
      job.masse_kg !== null && job.masse_kg !== undefined
        ? String(job.masse_kg)
        : '0'

    // 4) Warenausgabe / Warenrückgabe
    const warenausgabeDatum = new Date(job.liefer_datum_utc)
    const warenannahmeDatum = new Date(job.rueck_datum_utc)
    const warenausgabeArt = job.liefer_art ?? ''
    const warenannahmeArt = job.rueck_art ?? ''

    // 5) Standort aus profiles (PLZ + Ort)
    const profile = job.profiles?.[0] ?? null
    const plz = profile?.plz ?? ''
    const ort = profile?.ort ?? ''
    const standort =
      plz && ort ? `${plz} ${ort}` : plz || ort || 'Österreich'

    // 6) Gewerblich / Privat aus account_type
    const accountType = profile?.account_type ?? ''
    const gewerblich = accountType === 'gewerblich'
    const privat = accountType === 'privat'

    // 7) Promo / gesponsert
    const gesponsert = (job.promo_score ?? 0) > 0

    // 8) Bilder / Dateien – erstmal leer; Karte nimmt Platzhalterbild
    const bilder: string[] = []
    const dateien: { name: string; url: string }[] = []

    const beschreibung = job.description ?? ''

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
      warenausgabeArt,
      warenannahmeArt,
      bilder,
      standort,
      gesponsert,
      gewerblich,
      privat,
      beschreibung,
      dateien,
      user: null,
    }
  })

  console.log('fetchBoersenJobs: mapped jobs =', jobs.length)
  return jobs
}
