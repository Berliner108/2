import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  CHAT_MAX_MESSAGE_LENGTH,
} from '@/lib/chat/constants'

import {
  getChatParticipant,
} from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  messageId?: string
  content?: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

async function getOwnedMessage(
  messageId: string,
  userId: string
) {
  const admin = supabaseAdmin()

  const {
    data: message,
    error,
  } = await admin
    .from('messages')
    .select(`
      id,
      conversation_id,
      sender_participant_id,
      message_type,
      content,
      edited_at,
      deleted_at
    `)
    .eq('id', messageId)
    .maybeSingle()

  if (error || !message) {
    return {
      ok: false as const,
      status: 404,
      error:
        'message_not_found',
      message:
        'Nachricht wurde nicht gefunden.',
    }
  }

  const participant =
    await getChatParticipant(
      message.conversation_id,
      userId
    )

  if (
    !participant ||
    participant.id !==
      message.sender_participant_id
  ) {
    return {
      ok: false as const,
      status: 403,
      error:
        'not_message_owner',
      message:
        'Du kannst nur eigene Nachrichten ändern.',
    }
  }

  return {
    ok: true as const,
    admin,
    message,
  }
}

export async function PATCH(
  req: Request
) {
  try {
    const sb =
      await supabaseServer()

    const {
      data: { user },
      error: authError,
    } =
      await sb.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'not_authenticated',
        },
        { status: 401 }
      )
    }

    const raw =
      (await req
        .json()
        .catch(
          () => ({})
        )) as Body

    const messageId =
      typeof raw.messageId ===
      'string'
        ? raw.messageId.trim()
        : ''

    const content =
      typeof raw.content ===
      'string'
        ? raw.content.trim()
        : ''

    if (
      !messageId ||
      !isUuid(messageId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'invalid_message_id',
        },
        { status: 400 }
      )
    }

    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'empty_message',
          message:
            'Die Nachricht darf nicht leer sein.',
        },
        { status: 400 }
      )
    }

    if (
      content.length >
      CHAT_MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'message_too_long',
          message:
            `Die Nachricht darf höchstens ${CHAT_MAX_MESSAGE_LENGTH} Zeichen enthalten.`,
        },
        { status: 400 }
      )
    }

    const owned =
      await getOwnedMessage(
        messageId,
        user.id
      )

    if (!owned.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            owned.error,
          message:
            owned.message,
        },
        {
          status:
            owned.status,
        }
      )
    }

    if (
      owned.message.deleted_at
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'message_deleted',
          message:
            'Gelöschte Nachrichten können nicht bearbeitet werden.',
        },
        { status: 400 }
      )
    }

    if (
      owned.message.message_type !==
      'text'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'message_not_editable',
          message:
            'Nur Textnachrichten können bearbeitet werden.',
        },
        { status: 400 }
      )
    }

    const editedAt =
      new Date().toISOString()

    const {
      data: message,
      error: updateError,
    } =
      await owned.admin
        .from('messages')
        .update({
          content,
          edited_at:
            editedAt,
        })
        .eq(
          'id',
          messageId
        )
        .select(`
          id,
          content,
          edited_at,
          deleted_at
        `)
        .single()

    if (
      updateError ||
      !message
    ) {
      console.error(
        '[messages/message] edit failed:',
        updateError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'message_edit_failed',
          message:
            'Nachricht konnte nicht bearbeitet werden.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        message,
      },
      {
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[messages/message] patch unexpected:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          'internal_error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request
) {
  try {
    const sb =
      await supabaseServer()

    const {
      data: { user },
      error: authError,
    } =
      await sb.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'not_authenticated',
        },
        { status: 401 }
      )
    }

    const raw =
      (await req
        .json()
        .catch(
          () => ({})
        )) as Body

    const messageId =
      typeof raw.messageId ===
      'string'
        ? raw.messageId.trim()
        : ''

    if (
      !messageId ||
      !isUuid(messageId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'invalid_message_id',
        },
        { status: 400 }
      )
    }

    const owned =
      await getOwnedMessage(
        messageId,
        user.id
      )

    if (!owned.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            owned.error,
          message:
            owned.message,
        },
        {
          status:
            owned.status,
        }
      )
    }

    if (
      owned.message.deleted_at
    ) {
      return NextResponse.json(
        {
          ok: true,
          message: {
            id:
              owned.message.id,
            deleted_at:
              owned.message
                .deleted_at,
          },
        }
      )
    }

    const deletedAt =
      new Date().toISOString()

    const {
      data: message,
      error: updateError,
    } =
      await owned.admin
        .from('messages')
        .update({
          deleted_at:
            deletedAt,
        })
        .eq(
          'id',
          messageId
        )
        .select(`
          id,
          deleted_at
        `)
        .single()

    if (
      updateError ||
      !message
    ) {
      console.error(
        '[messages/message] delete failed:',
        updateError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'message_delete_failed',
          message:
            'Nachricht konnte nicht gelöscht werden.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        message,
      },
      {
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[messages/message] delete unexpected:',
      error
    )
    

    return NextResponse.json(
      {
        ok: false,
        error:
          'internal_error',
      },
      { status: 500 }
    )
  }
}
