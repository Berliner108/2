import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const LACK_FILES_BUCKET = 'lack-requests'

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

    const requestId = body.requestId as string | undefined
    const uploads: UploadedFile[] = Array.isArray(body.uploads)
      ? body.uploads
      : []

    if (!requestId) {
      return NextResponse.json(
        { error: 'missing_request_id' },
        { status: 400 },
      )
    }

    const { data: lackRequest, error: requestError } = await supabase
      .from('lack_requests')
      .select('id,owner_id,published,status,data')
      .eq('id', requestId)
      .single()

    if (requestError || !lackRequest) {
      return NextResponse.json(
        {
          error: 'lack_request_not_found',
          details: requestError?.message,
        },
        { status: 404 },
      )
    }

    if (lackRequest.owner_id !== user.id) {
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
      const expectedPrefix = `${requestId}/${expectedFolder}/`

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
      const expectedPrefix = `${requestId}/${expectedFolder}/`

      return file.path.startsWith(expectedPrefix)
    })

    const imagesCount = cleanUploads.filter((file) => file.kind === 'image').length

    if (imagesCount === 0) {
      return NextResponse.json(
        { error: 'missing_images' },
        { status: 400 },
      )
    }

    const existingPathSet = new Set<string>()

    for (const file of cleanUploads) {
      const lastSlashIndex = file.path.lastIndexOf('/')

      if (lastSlashIndex === -1) {
        return NextResponse.json(
          {
            error: 'invalid_upload_paths',
            invalid: [file.path],
          },
          { status: 400 },
        )
      }

      const folderPath = file.path.slice(0, lastSlashIndex)
      const fileName = file.path.slice(lastSlashIndex + 1)

      const { data: objects, error: listErr } = await admin.storage
        .from(LACK_FILES_BUCKET)
        .list(folderPath, {
          limit: 100,
          search: fileName,
        })

      if (listErr) {
        console.error('Fehler beim Prüfen der Storage-Datei:', listErr)

        return NextResponse.json(
          {
            error: 'storage_check_failed',
            details: listErr.message,
          },
          { status: 500 },
        )
      }

      const exists = (objects ?? []).some((obj) => obj.name === fileName)

      if (exists) {
        existingPathSet.add(file.path)
      }
    }

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

    const bilder = cleanUploads
      .filter((file) => file.kind === 'image')
      .map((file) => {
        const { data } = admin.storage
          .from(LACK_FILES_BUCKET)
          .getPublicUrl(file.path)

        return data.publicUrl
      })

    const dateien = cleanUploads
      .filter((file) => file.kind === 'document')
      .map((file) => {
        const { data } = admin.storage
          .from(LACK_FILES_BUCKET)
          .getPublicUrl(file.path)

        return {
          name: file.originalName || 'Datei',
          url: data.publicUrl,
        }
      })

    const oldData = lackRequest.data || {}

    const { error: updateErr } = await supabase
      .from('lack_requests')
      .update({
        data: {
          ...oldData,
          bilder,
          dateien,
        },
        published: true,
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('owner_id', user.id)

    if (updateErr) {
      console.error('Fehler beim Finalisieren der Lackanfrage:', updateErr)

      return NextResponse.json(
        {
          error: 'lack_request_update_failed',
          details: updateErr.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      requestId,
      imagesCount: bilder.length,
      filesCount: dateien.length,
    })
  } catch (err: any) {
    console.error('Fehler in /api/lackanfrage-finalisieren:', err)

    return NextResponse.json(
      {
        error: 'internal_error',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    )
  }
}