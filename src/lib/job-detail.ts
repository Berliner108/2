// src/lib/job-detail.ts
import 'server-only'
import { supabaseServer } from '@/lib/supabase-server'
import type { Auftrag } from '@/lib/types/auftrag'

type JobFileRow = {
  job_id: string
  kind: 'image' | 'document'
  bucket: string
  path: string
  original_name: string | null
}

export async function fetchJobDetail(jobId: string): Promise<Auftrag | null> {
  const supabase = await supabaseServer()

  // 1️⃣ Job + Profil holen
  const { data: row, error } = await supabase
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
      profiles (
        account_type,
        address
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

  const job = row as any

  // 2️⃣ Alle Dateien für diesen Job holen (Schema: kind/bucket/path)
  const { data: fileRows, error: filesError } = await supabase
    .from('job_files')
    .select('job_id, kind, bucket, path, original_name')
    .eq('job_id', job.id)

  if (filesError) {
    console.error('fetchJobDetail job_files error', filesError)
  }

  const files = (fileRows ?? []) as unknown as JobFileRow[]
  const imageFiles = files.filter((f) => f.kind === 'image')
  const docFiles = files.filter((f) => f.kind === 'document')

  // ✅ Bilder-URLs
  const bilder: string[] =
    imageFiles.length > 0
      ? imageFiles.map((f) => {
          const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
          return data.publicUrl
        })
      : []

  // ✅ Dokumente
  const dateien =
    docFiles.length > 0
      ? docFiles.map((f) => {
          const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
          return {
            name: f.original_name ?? 'Datei',
            url: data.publicUrl,
          }
        })
      : []

  // 3️⃣ Materialgüte
  const material =
    job.material_guete === 'Andere' && job.material_guete_custom
      ? `Andere (${job.material_guete_custom})`
      : job.material_guete ?? 'k. A.'

  // 4️⃣ Maße & Masse
  const length = job.laenge_mm ?? 0
  const width = job.breite_mm ?? 0
  const height = job.hoehe_mm ?? 0
  const masse = job.masse_kg != null ? String(job.masse_kg) : '0'

  // 5️⃣ Logistikdaten
  const warenausgabeDatum = new Date(job.liefer_datum_utc)
  const warenannahmeDatum = new Date(job.rueck_datum_utc)

  // Hier nutzt du aktuell "selbst" in DB → in UI passt "selbst" auch (du filterst inzwischen so)
  const warenausgabeArt = job.liefer_art ?? ''
  const warenannahmeArt = job.rueck_art ?? ''

  // 6️⃣ Specs → felder je Verfahren (wie bei dir)
  const felder1: Record<string, any> = {}
  const felder2: Record<string, any> = {}

  if (job.specs && typeof job.specs === 'object') {
    const specsObj = job.specs as Record<string, any>

    Object.entries(specsObj).forEach(([key, value]) => {
      const prefixMatch = key.match(/^v(\d+)__/)
      const verfahrenIndex = prefixMatch ? Number(prefixMatch[1]) - 1 : 0

      const withoutPrefix = key.replace(/^v\d+__/, '')
      const parts = withoutPrefix.split('__')
      const fieldKey = parts.length > 1 ? parts[1] : parts[0]

      const target = verfahrenIndex === 1 ? felder2 : felder1
      target[fieldKey] = value
    })
  }

  const verfahren: Auftrag['verfahren'] = []
  if (job.verfahren_1) verfahren.push({ name: job.verfahren_1, felder: felder1 })
  if (job.verfahren_2) verfahren.push({ name: job.verfahren_2, felder: felder2 })

  // 7️⃣ Standort + Typ aus profiles.address/account_type
  const profile = job.profiles?.[0] ?? null
  const zip = profile?.address?.zip ?? ''
  const city = profile?.address?.city ?? ''
  const standort = (zip || city) ? `${zip} ${city}`.trim() : 'Österreich'

  const accountType = profile?.account_type ?? 'business'
  const gewerblich = accountType === 'business'
  const privat = accountType === 'private'

  const beschreibung = job.description ?? ''
  const gesponsert = (job.promo_score ?? 0) > 0

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
}
