import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  CHAT_ATTACHMENT_BUCKET,
} from '@/lib/chat/constants'

import {
  getChatParticipant,
  isSupportAgent,
} from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      attachmentId: string
    }>
  }
) {
  try {
    const {
      attachmentId,
    } = await params

    if (
      !attachmentId ||
      !isUuid(attachmentId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_attachment_id',
        },
        { status: 400 }
      )
    }

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

    const admin = supabaseAdmin()

    const {
      data: attachment,
      error: attachmentError,
    } = await admin
      .from('message_attachments')
      .select(`
        id,
        message_id,
        storage_path,
        original_filename
      `)
      .eq('id', attachmentId)
      .maybeSingle()

    if (
      attachmentError ||
      !attachment
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'attachment_not_found',
        },
        { status: 404 }
      )
    }

    const {
      data: message,
      error: messageError,
    } = await admin
      .from('messages')
      .select(`
        id,
        conversation_id
      `)
      .eq(
        'id',
        attachment.message_id
      )
      .maybeSingle()

    if (
      messageError ||
      !message
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'message_not_found',
        },
        { status: 404 }
      )
    }

    const {
      data: conversation,
      error: conversationError,
    } = await admin
      .from('conversations')
      .select('id, type')
      .eq(
        'id',
        message.conversation_id
      )
      .maybeSingle()

    if (
      conversationError ||
      !conversation
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_not_found',
        },
        { status: 404 }
      )
    }

    const participant =
      await getChatParticipant(
        conversation.id,
        user.id
      )

    let allowed =
      Boolean(participant)

    if (
      !allowed &&
      conversation.type === 'support'
    ) {
      const agent =
        await isSupportAgent(user.id)

      allowed =
        Boolean(
          agent &&
          agent.can_view_all_support === true
        )
    }

    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'not_authorized',
        },
        { status: 403 }
      )
    }

    const {
      data: signed,
      error: signedError,
    } = await admin.storage
      .from(CHAT_ATTACHMENT_BUCKET)
      .createSignedUrl(
        attachment.storage_path,
        60,
        {
          download:
            attachment.original_filename,
        }
      )

    if (
      signedError ||
      !signed?.signedUrl
    ) {
      console.error(
        '[attachment/download] signed URL:',
        signedError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'download_failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.redirect(
      signed.signedUrl,
      {
        status: 302,
      }
    )
  } catch (error) {
    console.error(
      '[attachment/download] unexpected:',
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