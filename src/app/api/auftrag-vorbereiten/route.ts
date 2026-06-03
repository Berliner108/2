import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
const JOB_FILES_BUCKET = 'job-files'

function safeExtFromName(name: string) {
  const ext = name.includes('.') ? name.split('.').pop() : 'bin'

  return (
    String(ext || 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin'
  )
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: 401 },
      )
    }

    const body = await req.json()

    const agbAccepted = body.agbAccepted === true

    if (!agbAccepted) {
      return NextResponse.json(
        { error: 'agb_not_accepted' },
        { status: 400 },
      )
    }

    const materialGuete = String(body.materialguete ?? '')
    const andereMaterialguete = String(body.andereMaterialguete ?? '').trim()

    const { data: jobInsert, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,

        description: body.beschreibung
          ? String(body.beschreibung).trim()
          : null,

        material_guete: materialGuete || null,
        material_guete_custom:
          materialGuete === 'Andere' && andereMaterialguete
            ? andereMaterialguete
            : null,

        laenge_mm: body.laenge ? String(body.laenge) : null,
        breite_mm: body.breite ? String(body.breite) : null,
        hoehe_mm: body.hoehe ? String(body.hoehe) : null,
        masse_kg: body.masse ? String(body.masse) : null,

        liefer_datum_utc: body.lieferDatum
          ? new Date(body.lieferDatum).toISOString()
          : null,

        rueck_datum_utc: body.abholDatum
          ? new Date(body.abholDatum).toISOString()
          : null,

        liefer_art: body.lieferArt || null,
        rueck_art: body.abholArt || null,

        serienauftrag_aktiv: body.serienauftragAktiv === true,
        serien_rhythmus: body.serienRhythmus || null,
        serien_termine: body.serienTermine || null,

        specs: body.specSelections || {},

        verfahren_1: body.verfahren1 || null,
        verfahren_2: body.verfahren2 || null,

        agb_accepted: true,

        published: false,
        status: 'open',

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
        {
          error: 'job_insert_failed',
          details: jobError?.message,
        },
        { status: 500 },
      )
    }

    const jobId = jobInsert.id as string

const bilder = Array.isArray(body.bilder) ? body.bilder : []
const dateien = Array.isArray(body.dateien) ? body.dateien : []

const uploadItems = [
  ...bilder.map((file: any) => ({
    kind: 'image' as const,
    originalName: file.name,
    mimeType: file.type || null,
    sizeBytes: typeof file.size === 'number' ? file.size : null,
  })),
  ...dateien.map((file: any) => ({
    kind: 'document' as const,
    originalName: file.name,
    mimeType: file.type || null,
    sizeBytes: typeof file.size === 'number' ? file.size : null,
  })),
]

const uploads = []

for (const item of uploadItems) {
  const folder = item.kind === 'image' ? 'images' : 'files'
  const ext = safeExtFromName(item.originalName)

  const path = `${jobId}/${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from(JOB_FILES_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    console.error('Fehler beim Erzeugen der Upload-URL:', error)

    return NextResponse.json(
      {
        error: 'signed_url_failed',
        details: error?.message,
      },
      { status: 500 },
    )
  }

  uploads.push({
    kind: item.kind,
    path,
    token: data.token,
    originalName: item.originalName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
  })
}

return NextResponse.json({
  ok: true,
  jobId,
  bucket: JOB_FILES_BUCKET,
  uploads,
})
  } catch (err: any) {
    console.error('Fehler in /api/auftrag-vorbereiten:', err)

    return NextResponse.json(
      {
        error: 'internal_error',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    )
  }
}