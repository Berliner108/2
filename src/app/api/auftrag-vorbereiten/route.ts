import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const JOB_FILES_BUCKET = 'job-files'
const USER_NDAS_BUCKET = 'user-ndas'

type CustomNdaSnapshot = {
  path: string
  fileName: string | null
  fileSize: number | null
  version: string
}

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
    const ndaRequired = body.ndaRequired === true

    if (!agbAccepted) {
      return NextResponse.json(
        { error: 'agb_not_accepted' },
        { status: 400 },
      )
    }

    const ndaType =
      ndaRequired && body.ndaType === 'custom' ? 'custom' : 'standard'

    let customNda: CustomNdaSnapshot | null = null

    if (ndaRequired && ndaType === 'custom') {
      const admin = supabaseAdmin()

      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .select(`
          id,
          account_type,
          custom_nda_file_path,
          custom_nda_file_name,
          custom_nda_file_size,
          custom_nda_version
        `)
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) {
        return NextResponse.json(
          { error: 'profile_check_failed', details: profileError.message },
          { status: 500 },
        )
      }

      if (!profile || profile.account_type !== 'business') {
        return NextResponse.json(
          { error: 'custom_nda_only_for_business_users' },
          { status: 403 },
        )
      }

      if (!profile.custom_nda_file_path || !profile.custom_nda_version) {
        return NextResponse.json(
          { error: 'custom_nda_missing' },
          { status: 400 },
        )
      }

      customNda = {
        path: profile.custom_nda_file_path,
        fileName: profile.custom_nda_file_name ?? 'nda.pdf',
        fileSize:
          typeof profile.custom_nda_file_size === 'number'
            ? profile.custom_nda_file_size
            : null,
        version: profile.custom_nda_version,
      }
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
        nda_required: ndaRequired,
        nda_type: ndaRequired ? ndaType : 'standard',
        nda_version:
          ndaRequired && ndaType === 'custom' && customNda
            ? customNda.version
            : 'v1',

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

    if (ndaRequired && ndaType === 'custom' && customNda) {
      const admin = supabaseAdmin()
      const frozenNdaPath = `jobs/${jobId}/nda.pdf`

      const { error: copyError } = await admin.storage
        .from(USER_NDAS_BUCKET)
        .copy(customNda.path, frozenNdaPath)

      if (copyError) {
        console.error('Fehler beim Konservieren der Custom-NDA:', copyError)

        await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId)
          .eq('user_id', user.id)

        return NextResponse.json(
          {
            error: 'custom_nda_copy_failed',
            details: copyError.message,
          },
          { status: 500 },
        )
      }

      const { error: ndaUpdateError } = await supabase
        .from('jobs')
        .update({
          nda_file_bucket: USER_NDAS_BUCKET,
          nda_file_path: frozenNdaPath,
          nda_file_name: customNda.fileName,
          nda_file_size: customNda.fileSize,
        })
        .eq('id', jobId)
        .eq('user_id', user.id)

      if (ndaUpdateError) {
        console.error(
          'Fehler beim Speichern der Custom-NDA-Metadaten:',
          ndaUpdateError,
        )

        await supabase
          .from('jobs')
          .delete()
          .eq('id', jobId)
          .eq('user_id', user.id)

        return NextResponse.json(
          {
            error: 'custom_nda_metadata_failed',
            details: ndaUpdateError.message,
          },
          { status: 500 },
        )
      }
    }

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