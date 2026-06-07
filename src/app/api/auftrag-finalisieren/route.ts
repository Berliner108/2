import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const JOB_FILES_BUCKET = 'job-files'

type UploadedFile = {
  kind: 'image' | 'document'
  path: string
  originalName?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const admin = supabaseAdmin()

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

    const jobId = body.jobId as string | undefined
    const uploads: UploadedFile[] = Array.isArray(body.uploads)
      ? body.uploads
      : []

    if (!jobId) {
      return NextResponse.json(
        { error: 'missing_job_id' },
        { status: 400 },
      )
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id,user_id,published,status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'job_not_found', details: jobError?.message },
        { status: 404 },
      )
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403 },
      )
    }

const validKinds = ['image', 'document'] as const

const invalidUploads = uploads.filter((file) => {
  if (!file.path) return true
  if (!validKinds.includes(file.kind)) return true

  const expectedFolder = file.kind === 'image' ? 'images' : 'files'
  const expectedPrefix = `${jobId}/${expectedFolder}/`

  return !file.path.startsWith(expectedPrefix)
})

if (invalidUploads.length > 0) {
  return NextResponse.json(
    {
      error: 'invalid_upload_paths',
      invalid: invalidUploads.map((file) => file.path),
    },
    { status: 400 },
  )
}

const cleanUploads = uploads.filter((file) => {
  if (!file.path) return false
  if (file.kind !== 'image' && file.kind !== 'document') return false

  const expectedFolder = file.kind === 'image' ? 'images' : 'files'
  const expectedPrefix = `${jobId}/${expectedFolder}/`

  return file.path.startsWith(expectedPrefix)
})

const paths = cleanUploads.map((file) => file.path)

const { data: existingObjects, error: objectsErr } = paths.length
  ? await admin
      .schema('storage')
      .from('objects')
      .select('name')
      .eq('bucket_id', JOB_FILES_BUCKET)
      .in('name', paths)
  : { data: [], error: null }

if (objectsErr) {
  console.error('Fehler beim Prüfen der Storage-Dateien:', objectsErr)

  return NextResponse.json(
    {
      error: 'storage_check_failed',
      details: objectsErr.message,
    },
    { status: 500 },
  )
}

const existingPathSet = new Set(
  (existingObjects ?? []).map((o: any) => String(o.name)),
)

const missingUploads = cleanUploads.filter(
  (file) => !existingPathSet.has(file.path),
)

if (missingUploads.length > 0) {
  return NextResponse.json(
    {
      error: 'uploaded_files_missing_in_storage',
      missing: missingUploads.map((file) => file.path),
    },
    { status: 400 },
  )
}

const fileRows = cleanUploads.map((file) => ({
  job_id: jobId,
  kind: file.kind,
  bucket: JOB_FILES_BUCKET,
  path: file.path,
  original_name: file.originalName || null,
  mime_type: file.mimeType || null,
  size_bytes:
    typeof file.sizeBytes === 'number' ? file.sizeBytes : null,
}))

    if (fileRows.length > 0) {
      const { error: filesErr } = await supabase
        .from('job_files')
        .insert(fileRows)

      if (filesErr) {
        console.error('Fehler beim Speichern der job_files:', filesErr)

        return NextResponse.json(
          {
            error: 'job_files_insert_failed',
            details: filesErr.message,
          },
          { status: 500 },
        )
      }
    }

    const imagesCount = fileRows.filter((f) => f.kind === 'image').length
    const filesCount = fileRows.filter((f) => f.kind === 'document').length

    const { error: updateErr } = await supabase
      .from('jobs')
      .update({
        images_count: imagesCount,
        files_count: filesCount,
        published: true,
        status: 'open',
      })
      .eq('id', jobId)

    if (updateErr) {
      console.error('Fehler beim Finalisieren des Jobs:', updateErr)

      return NextResponse.json(
        {
          error: 'job_update_failed',
          details: updateErr.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      jobId,
      imagesCount,
      filesCount,
    })
  } catch (err: any) {
    console.error('Fehler in /api/auftrag-finalisieren:', err)

    return NextResponse.json(
      {
        error: 'internal_error',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    )
  }
}