// src/lib/job-detail.ts
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

export async function fetchJobDetail(jobId: string): Promise<Auftrag | null> {
  const supabase = await supabaseServer()

  // 1️⃣ Job + Profil holen
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
      specs,
      profiles (
        plz,
        ort,
        account_type
      )
    `,
    )
    .eq('id', jobId)
    .eq('published', true)
    .eq('status', 'open')
    .single()

  if (error || !row) {
    console.error('fetchJobDetail job error', error)
    return null
  }

  // bewusst locker typisieren, um keine Supabase-Typkonflikte zu bekommen
  const job = row as any

  // 2️⃣ Alle Dateien für diesen Job holen
  const { data: fileRows, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, storage_path, file_name, file_type')
    .eq('job_id', job.id)

  if (filesError) {
    console.error('fetchJobDetail job_files error', filesError)
  }

  const files = (fileRows ?? []) as any[]
  const imageFiles = files.filter((f) => f.file_type === 'image')
  const attachFiles = files.filter((f) => f.file_type === 'attachment')

  const storage = supabase.storage.from('job-files')

  // Bilder-URLs
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

  // 3️⃣ Materialgüte
  const material =
    job.material_guete === 'Andere' && job.material_guete_custom
      ? `Andere (${job.material_guete_custom})`
      : (job.material_guete as string | null) ?? 'k. A.'

  // 4️⃣ Maße & Masse
  const length = (job.laenge_mm as number | null) ?? 0
  const width = (job.breite_mm as number | null) ?? 0
  const height = (job.hoehe_mm as number | null) ?? 0
  const masse =
    job.masse_kg !== null && job.masse_kg !== undefined
      ? String(job.masse_kg)
      : '0'

  // 5️⃣ Logistikdaten
  const warenausgabeDatum = new Date(job.liefer_datum_utc as string)
  const warenannahmeDatum = new Date(job.rueck_datum_utc as string)

  const rawLieferArt = (job.liefer_art as string | null) ?? ''
  const rawRueckArt = (job.rueck_art as string | null) ?? ''

  // Mapping auf die Werte, die deine Filter & Detailseite erwarten
  const warenausgabeArt =
    rawLieferArt === 'selbst'
      ? 'selbstanlieferung'
      : rawLieferArt || ''

  const warenannahmeArt =
    rawRueckArt === 'selbst'
      ? 'selbstabholung'
      : rawRueckArt || ''

  // 6️⃣ Spezifikationen auf die beiden Verfahren aufteilen
  const felder1: Record<string, any> = {}
  const felder2: Record<string, any> = {}

  if (job.specs && typeof job.specs === 'object') {
    const specsObj = job.specs as Record<string, any>

    Object.entries(specsObj).forEach(([key, value]) => {
      // Beispiel-Key: "v2__Einlagern__extra"
      const prefixMatch = key.match(/^v(\d+)__/)
      const verfahrenIndex = prefixMatch ? Number(prefixMatch[1]) - 1 : 0 // v1 → 0, v2 → 1

      const withoutPrefix = key.replace(/^v\d+__/, '')
      const parts = withoutPrefix.split('__')
      const fieldKey = parts.length > 1 ? parts[1] : parts[0] // "extra", "zertifizierungen", ...

      const target = verfahrenIndex === 1 ? felder2 : felder1
      target[fieldKey] = value
    })
  }

  // 7️⃣ Verfahren 1 & 2 → wie bei deinen Dummy-Aufträgen
  const verfahren: Auftrag['verfahren'] = []
  if (job.verfahren_1) {
    verfahren.push({ name: job.verfahren_1 as string, felder: felder1 })
  }
  if (job.verfahren_2) {
    verfahren.push({ name: job.verfahren_2 as string, felder: felder2 })
  }

  // 8️⃣ Standort aus profiles (PLZ + Ort)
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
    verfahren,              // → z.B. "Nasslackieren & Folieren" in der Überschrift
    material,               // → Materialgüte
    length,
    width,
    height,
    masse,
    warenausgabeDatum,
    warenannahmeDatum,
    warenausgabeArt,
    warenannahmeArt,
    bilder,
    standort,               // → "PLZ Ort" aus profiles
    gesponsert: !!gesponsert,
    gewerblich,
    privat,
    beschreibung,
    dateien,
    user: undefined,        // später ggf. aus profiles/username
  }

  return auftrag
}
