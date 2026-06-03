import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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

    const fileRows = uploads
      .filter((file) => file.path && (file.kind === 'image' || file.kind === 'document'))
      .map((file) => ({
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