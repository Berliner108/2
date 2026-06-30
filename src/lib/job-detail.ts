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

  serienauftrag: boolean | null
  serienauftrag_rhythmus: string | null
  serienauftrag_aktiv: boolean | null
  serien_rhythmus: string | null
  serien_termine: any[] | null

    nda_required: boolean | null
  nda_type: string | null
  nda_version: string | null
  nda_file_bucket: string | null
  nda_file_path: string | null
  nda_file_name: string | null
  nda_file_size: number | null
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
  id: string
  job_id: string
  kind: 'image' | 'document'
  bucket: string
  path: string
  original_name: string | null
  created_at?: string | null
}

export async function fetchJobDetail(jobId: string): Promise<Auftrag | null> {
  const supabase = await supabaseServer()

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
      status,
      serienauftrag,
      serienauftrag_rhythmus,
      serienauftrag_aktiv,
      serien_rhythmus,
      serien_termine,
      nda_required,
      nda_type,
      nda_version,
      nda_file_bucket,
      nda_file_path,
      nda_file_name,
      nda_file_size
    `)
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    console.error('fetchJobDetail jobs error:', jobError, 'jobId:', jobId)
    return null
  }

  const j = job as unknown as JobRow

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth?.user?.id ?? null

  if ((!j.published || j.status !== 'open') && !uid) {
    return null
  }

  const isOwner = uid === j.user_id

  let hasAcceptedNda = false

  if (uid && j.nda_required && !isOwner) {
    const { data: ndaAcceptance, error: ndaError } = await supabase
      .from('job_nda_acceptances')
      .select('id')
      .eq('job_id', j.id)
      .eq('user_id', uid)
      .maybeSingle()

    if (ndaError) {
      console.error('fetchJobDetail nda acceptance error:', ndaError)
    }

    hasAcceptedNda = !!ndaAcceptance
  }

  if (isOwner) {
    hasAcceptedNda = true
  }

  const ndaRequired = Boolean(j.nda_required)
  const ndaLocked = ndaRequired && !hasAcceptedNda

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, rating_avg, rating_count, account_type, address')
    .eq('id', j.user_id)
    .maybeSingle()

  if (profileError) {
    console.error('fetchJobDetail profiles error:', profileError)
  }

  const p = (profile ?? null) as ProfileRow | null

  let bilder: string[] = []
  let dateien: { name: string; url: string }[] = []

  if (!ndaLocked) {
    const { data: fileRows, error: filesError } = await supabase
      .from('job_files')
      .select('id, job_id, kind, bucket, path, original_name, created_at')
      .eq('job_id', j.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (filesError) {
      console.error('fetchJobDetail job_files error:', filesError)
    }

    const files = (fileRows ?? []) as unknown as JobFileRow[]

    const imageFiles = files
      .filter((f) => f.kind === 'image')
      .sort((a: any, b: any) => {
        const ta = new Date(a.created_at ?? 0).getTime()
        const tb = new Date(b.created_at ?? 0).getTime()
        return ta - tb
      })

    const docFiles = files
      .filter((f) => f.kind === 'document')
      .sort((a: any, b: any) => {
        const ta = new Date(a.created_at ?? 0).getTime()
        const tb = new Date(b.created_at ?? 0).getTime()
        return ta - tb
      })

    bilder = imageFiles.map((f) => {
      const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
      return data.publicUrl
    })

    dateien = docFiles.map((f) => {
      const { data } = supabase.storage.from(f.bucket).getPublicUrl(f.path)
      return { name: f.original_name ?? 'Datei', url: data.publicUrl }
    })
  }

  const felder1: Record<string, any> = {}
  const felder2: Record<string, any> = {}

  if (!ndaLocked && j.specs && typeof j.specs === 'object') {
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
  if (j.verfahren_1) verfahren.push({ name: j.verfahren_1, felder: ndaLocked ? {} : felder1 })
  if (j.verfahren_2) verfahren.push({ name: j.verfahren_2, felder: ndaLocked ? {} : felder2 })

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
  const standort = zip || city ? `${zip} ${city}`.trim() : 'Österreich'

  const accountType = p?.account_type ?? 'business'
  const gewerblich = accountType === 'business'
  const privat = accountType === 'private'

  const gesponsert = (j.promo_score ?? 0) > 0
  const username = p?.username ?? null

  const ratingAvg = p?.rating_avg == null ? null : Number(p.rating_avg)
  const ratingCount = p?.rating_count == null ? null : Number(p.rating_count)

  return {
    id: j.id,
    published: j.published ?? true,

    serienauftrag: j.serienauftrag ?? false,
    serienauftrag_rhythmus: j.serienauftrag_rhythmus ?? null,
    serienauftrag_aktiv: j.serienauftrag_aktiv ?? false,
    serien_rhythmus: j.serien_rhythmus ?? null,
    serien_termine: Array.isArray(j.serien_termine) ? j.serien_termine : [],

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

    beschreibung: ndaLocked ? '' : j.description ?? '',

    user: username,
    userRatingAvg: Number.isFinite(ratingAvg) ? ratingAvg : null,
    userRatingCount: Number.isFinite(ratingCount) ? ratingCount : null,

    ndaRequired,
    ndaAccepted: hasAcceptedNda,
    ndaLocked,
    ndaType: j.nda_type ?? 'standard',
    ndaVersion: j.nda_version ?? 'v1',
    ndaFileBucket: j.nda_file_bucket ?? null,
    ndaFilePath: j.nda_file_path ?? null,
    ndaFileName: j.nda_file_name ?? null,
    ndaFileSize: j.nda_file_size ?? null,
  } as Auftrag
}