// src/app/api/auftrag-absenden/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const JOB_FILES_BUCKET = 'job-files'

type JobFileRow = {
  job_id: string
  kind: 'image' | 'document'
  bucket: string
  path: string
  original_name: string | null
  mime_type: string | null
  size_bytes: number | null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    // 1) Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('auth error', userError)
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: 401 },
      )
    }

    const form = await req.formData()

    // 2) AGB
    const agbAccepted = form.get('agbAccepted') === 'true'
    if (!agbAccepted) {
      return NextResponse.json(
        { error: 'agb_not_accepted' },
        { status: 400 },
      )
    }

    // 3) Grunddaten aus dem Formular
    const beschreibung = String(form.get('beschreibung') ?? '').trim()

    const materialGuete = String(form.get('materialguete') ?? '')
    const andereMaterialgueteRaw = form.get('andereMaterialguete')
    const material_guete_custom =
      materialGuete === 'Andere' && andereMaterialgueteRaw
        ? String(andereMaterialgueteRaw).trim()
        : null

    const laenge_mm = form.get('laenge') ? String(form.get('laenge')) : null
    const breite_mm = form.get('breite') ? String(form.get('breite')) : null
    const hoehe_mm = form.get('hoehe') ? String(form.get('hoehe')) : null
    const masse_kg = form.get('masse') ? String(form.get('masse')) : null

    const lieferDatumStr = form.get('lieferDatum') as string | null
    const abholDatumStr = form.get('abholDatum') as string | null

    const liefer_art = (form.get('lieferArt') as string | null) ?? null
    const rueck_art = (form.get('abholArt') as string | null) ?? null

    const serienauftragAktiv = form.get('serienauftragAktiv') === 'true'
    const serienRhythmus =
      (form.get('serienRhythmus') as string | null) ?? null
    const serienTermineRaw = form.get('serienTermine') as string | null
    let serienTermine: any = null
    if (serienTermineRaw) {
      try {
        serienTermine = JSON.parse(serienTermineRaw)
      } catch {
        serienTermine = null
      }
    }

    const verfahren_1 = (form.get('verfahren1') as string | null) ?? null
    const verfahren_2 = (form.get('verfahren2') as string | null) ?? null

    const specsRaw = form.get('specSelections') as string | null
    let specs: any = {}
    if (specsRaw) {
      try {
        specs = JSON.parse(specsRaw)
      } catch {
        specs = {}
      }
    }

    // 4) Job anlegen – Promo ist hier IMMER neutral
    const { data: jobInsert, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        description: beschreibung || null,
        material_guete: materialGuete || null,
        material_guete_custom,
        laenge_mm,
        breite_mm,
        hoehe_mm,
        masse_kg,
        liefer_datum_utc: lieferDatumStr
          ? new Date(lieferDatumStr).toISOString()
          : null,
        rueck_datum_utc: abholDatumStr
          ? new Date(abholDatumStr).toISOString()
          : null,
        liefer_art,
        rueck_art,
        serienauftrag_aktiv: serienauftragAktiv,
        serien_rhythmus: serienRhythmus,
        serien_termine: serienTermine,
        specs,
        verfahren_1,
        verfahren_2,
        agb_accepted: agbAccepted,
        published: true,
        status: 'open',

        // 🔴 WICHTIG: Promo hier NICHT aus den Auswahl-Optionen berechnen!
        promo_score: 0,
        promo_options: [],
        promo_flags: [],

        images_count: 0,
        files_count: 0,
      })
      .select('id')
      .single()

    if (jobError || !jobInsert) {
      console.error('Fehler beim Anlegen des Jobs:', jobError)
      return NextResponse.json(
        { error: 'job_insert_failed', details: jobError?.message },
        { status: 500 },
      )
    }

    const jobId = jobInsert.id as string

    // 5) Dateien & Bilder nach Supabase Storage hochladen
    const fileRows: JobFileRow[] = []

    for (const [key, value] of form.entries()) {
      if (!(value instanceof File)) continue

      const isImage = key.startsWith('bilder[')

      const ext = value.name.includes('.') ? value.name.split('.').pop() : ''
      const safeExt = (ext || 'bin').toLowerCase()
      const path = `${jobId}/${isImage ? 'images' : 'files'}/${
        Date.now() // primitive, aber reicht
      }-${Math.random().toString(36).slice(2)}.${safeExt}`

      const { error: uploadError } = await supabase.storage
        .from(JOB_FILES_BUCKET)
        .upload(path, value, {
          cacheControl: '3600',
          upsert: false,
          contentType: value.type || undefined,
        })

      if (uploadError) {
        console.error('Fehler beim Upload in Storage:', uploadError)
        return NextResponse.json(
          { error: 'upload_failed', details: uploadError.message },
          { status: 500 },
        )
      }

      fileRows.push({
        job_id: jobId,
        kind: isImage ? 'image' : 'document',
        bucket: JOB_FILES_BUCKET,
        path,
        original_name: value.name || null,
        mime_type: value.type || null,
        size_bytes: typeof value.size === 'number' ? value.size : null,
      })
    }

    // 6) job_files-Einträge schreiben
    if (fileRows.length) {
      const { error: filesErr } = await supabase
        .from('job_files')
        .insert(fileRows)

      if (filesErr) {
        console.error('Fehler beim Speichern der job_files:', filesErr)
        return NextResponse.json(
          { error: 'job_files_insert_failed', details: filesErr.message },
          { status: 500 },
        )
      }
    }

    const imagesCount = fileRows.filter((f) => f.kind === 'image').length
    const filesCount = fileRows.filter((f) => f.kind === 'document').length

    if (imagesCount || filesCount) {
      await updateImagesAndFilesCountForJob(
        supabase,
        jobId,
        imagesCount,
        filesCount,
      )
    }

    // 7) Antwort – hier NUR Job, noch KEIN Promo-Checkout
    return NextResponse.json({ ok: true, jobId })
  } catch (err: any) {
    console.error('Unerwarteter Fehler in /api/auftrag-absenden:', err)
    return NextResponse.json(
      { error: 'internal_error', details: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}

async function updateImagesAndFilesCountForJob(
  supabase: any,
  jobId: string,
  imagesCount: number,
  filesCount: number,
) {
  const { error } = await supabase
    .from('jobs')
    .update({
      images_count: imagesCount,
      files_count: filesCount,
    })
    .eq('id', jobId)

  if (error) {
    console.error('Fehler beim Update von images_count/files_count:', error)
  }
}
