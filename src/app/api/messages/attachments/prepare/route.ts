import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  CHAT_ATTACHMENT_BUCKET,
} from '@/lib/chat/constants'

import {
  validateChatFile,
} from '@/lib/chat/files'

import {
  ensureChatSendAccess,
} from '@/lib/chat/send-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  conversationId?: string
  filename?: string
  size?: number
  mimeType?: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer()

    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'not_authenticated',
        },
        { status: 401 }
      )
    }

    const raw =
      (await req.json().catch(() => ({}))) as Body

    const conversationId =
      typeof raw.conversationId === 'string'
        ? raw.conversationId.trim()
        : ''

    if (
      !conversationId ||
      !isUuid(conversationId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_conversation_id',
        },
        { status: 400 }
      )
    }

    const fileCheck = validateChatFile({
      filename:
        typeof raw.filename === 'string'
          ? raw.filename
          : '',

      size:
        typeof raw.size === 'number'
          ? raw.size
          : NaN,

      mimeType:
        typeof raw.mimeType === 'string'
          ? raw.mimeType
          : null,
    })

    if (!fileCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: fileCheck.error,
          message: fileCheck.message,
        },
        { status: 400 }
      )
    }

    const permission =
      await ensureChatSendAccess(
        conversationId,
        user.id
      )

    if (!permission.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: permission.error,
          message: permission.message,
        },
        { status: permission.status }
      )
    }

    const storagePath = [
      conversationId,
      permission.participant.id,
      `${randomUUID()}.${fileCheck.extension}`,
    ].join('/')

    const admin = supabaseAdmin()

    const {
      data,
      error,
    } = await admin.storage
      .from(CHAT_ATTACHMENT_BUCKET)
      .createSignedUploadUrl(
        storagePath,
        {
          upsert: false,
        }
      )

    if (error || !data?.token) {
      console.error(
        '[attachments/prepare] signed upload:',
        error
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'upload_prepare_failed',
          message:
            'Datei-Upload konnte nicht vorbereitet werden.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,

        upload: {
          path: storagePath,
          token: data.token,

          originalFilename:
            fileCheck.originalFilename,

          mimeType:
            fileCheck.mimeType,

          fileSize:
            fileCheck.fileSize,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[attachments/prepare] unexpected:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
      },
      { status: 500 }
    )
  }
}