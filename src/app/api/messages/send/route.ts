import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  CHAT_ATTACHMENT_BUCKET,
  CHAT_MAX_MESSAGE_LENGTH,
} from '@/lib/chat/constants'

import {
  getFileExtension,
} from '@/lib/chat/helpers'

import {
  validateChatFile,
} from '@/lib/chat/files'

import {
  ensureChatSendAccess,
} from '@/lib/chat/send-permission'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AttachmentBody = {
  storagePath?: string
  originalFilename?: string
  mimeType?: string
  fileSize?: number
}

type Body = {
  conversationId?: string
  content?: string
  clientMessageId?: string
  attachment?: AttachmentBody | null
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

    const clientMessageId =
      typeof raw.clientMessageId === 'string'
        ? raw.clientMessageId.trim()
        : ''

    const content =
      typeof raw.content === 'string'
        ? raw.content.trim()
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

    if (
      !clientMessageId ||
      !isUuid(clientMessageId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_client_message_id',
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
          error: 'message_too_long',
          message:
            `Die Nachricht darf höchstens ${CHAT_MAX_MESSAGE_LENGTH} Zeichen enthalten.`,
        },
        { status: 400 }
      )
    }

    const hasAttachment =
      Boolean(raw.attachment)

    if (!content && !hasAttachment) {
      return NextResponse.json(
        {
          ok: false,
          error: 'empty_message',
          message:
            'Die Nachricht darf nicht leer sein.',
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
          reason:
            permission.error ===
            'premium_required'
              ? 'premium_required'
              : undefined,
          message: permission.message,
        },
        { status: permission.status }
      )
    }

    const admin = supabaseAdmin()

    // =====================================================
    // NORMALE TEXTNACHRICHT
    // =====================================================

    if (!raw.attachment) {
      const {
        data: message,
        error,
      } = await admin
        .from('messages')
        .insert({
          conversation_id:
            conversationId,

          sender_participant_id:
            permission.participant.id,

          message_type: 'text',

          content,

          client_message_id:
            clientMessageId,
        })
        .select(`
          id,
          conversation_id,
          sender_participant_id,
          message_type,
          content,
          client_message_id,
          created_at
        `)
        .single()

      if (error) {
        if (error.code === '23505') {
          const {
            data: existing,
          } = await admin
            .from('messages')
            .select(`
              id,
              conversation_id,
              sender_participant_id,
              message_type,
              content,
              client_message_id,
              created_at
            `)
            .eq(
              'conversation_id',
              conversationId
            )
            .eq(
              'sender_participant_id',
              permission.participant.id
            )
            .eq(
              'client_message_id',
              clientMessageId
            )
            .maybeSingle()

          if (existing) {
            return NextResponse.json({
              ok: true,
              duplicate: true,
              message: existing,
            })
          }
        }

        console.error(
          '[messages/send] text insert:',
          error
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'message_create_failed',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          ok: true,
          duplicate: false,
          message,
        },
        {
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // =====================================================
    // DATEINACHRICHT
    // =====================================================

    const attachment = raw.attachment

    const storagePath =
      typeof attachment.storagePath === 'string'
        ? attachment.storagePath.trim()
        : ''

    const originalFilename =
      typeof attachment.originalFilename ===
      'string'
        ? attachment.originalFilename
        : ''

    const mimeType =
      typeof attachment.mimeType === 'string'
        ? attachment.mimeType
        : ''

    const fileSize =
      typeof attachment.fileSize === 'number'
        ? attachment.fileSize
        : NaN

    const fileCheck = validateChatFile({
      filename: originalFilename,
      size: fileSize,
      mimeType,
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

    const expectedPrefix =
      `${conversationId}/${permission.participant.id}/`

    if (
      !storagePath ||
      !storagePath.startsWith(
        expectedPrefix
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_storage_path',
        },
        { status: 403 }
      )
    }

    const filenameInStorage =
      storagePath.slice(
        expectedPrefix.length
      )

    const storageExtension =
      getFileExtension(
        filenameInStorage
      )

    if (
      storageExtension !==
      fileCheck.extension
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'file_extension_mismatch',
        },
        { status: 400 }
      )
    }

    /*
     * Es darf nur exakt eine UUID-Datei in diesem
     * Ordner sein, z.B.
     *
     * conversation/participant/uuid.pdf
     */
    const storageBaseName =
      filenameInStorage.slice(
        0,
        -(
          storageExtension.length +
          1
        )
      )

    if (!isUuid(storageBaseName)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_storage_filename',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // Prüfen, ob Datei wirklich hochgeladen wurde
    // =====================================================

    const folder =
      `${conversationId}/${permission.participant.id}`

    const {
      data: storedFiles,
      error: storageError,
    } = await admin.storage
      .from(CHAT_ATTACHMENT_BUCKET)
      .list(folder, {
        limit: 10,
        search: filenameInStorage,
      })

    if (storageError) {
      console.error(
        '[messages/send] storage verify:',
        storageError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'storage_verify_failed',
        },
        { status: 500 }
      )
    }

    const storedFile =
      storedFiles?.find(
        (file) =>
          file.name ===
          filenameInStorage
      )

    if (!storedFile?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'uploaded_file_not_found',
          message:
            'Die hochgeladene Datei wurde nicht gefunden.',
        },
        { status: 400 }
      )
    }

    const realSize =
      Number(
        storedFile.metadata?.size ??
        0
      )

    if (
      !realSize ||
      realSize !== fileCheck.fileSize
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'file_size_mismatch',
          message:
            'Die Dateigröße stimmt nicht mit dem Upload überein.',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // Atomar Nachricht + Attachment speichern
    // =====================================================

    const {
      data: messageId,
      error: insertError,
    } = await admin.rpc(
      'chat_insert_file_message',
      {
        p_conversation_id:
          conversationId,

        p_sender_participant_id:
          permission.participant.id,

        p_client_message_id:
          clientMessageId,

        p_content:
          content || null,

        p_storage_path:
          storagePath,

        p_original_filename:
          fileCheck.originalFilename,

        p_mime_type:
          fileCheck.mimeType,

        p_file_extension:
          fileCheck.extension,

        p_file_size:
          fileCheck.fileSize,
      }
    )

    if (insertError) {
      if (insertError.code === '23505') {
        const {
          data: existing,
        } = await admin
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_participant_id,
            message_type,
            content,
            client_message_id,
            created_at,
            message_attachments (
              id,
              original_filename,
              mime_type,
              file_extension,
              file_size,
              storage_path
            )
          `)
          .eq(
            'conversation_id',
            conversationId
          )
          .eq(
            'sender_participant_id',
            permission.participant.id
          )
          .eq(
            'client_message_id',
            clientMessageId
          )
          .maybeSingle()

        if (existing) {
          return NextResponse.json({
            ok: true,
            duplicate: true,
            message: existing,
          })
        }
      }

      console.error(
        '[messages/send] file insert:',
        insertError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'file_message_create_failed',
          message:
            'Datei konnte nicht gesendet werden.',
        },
        { status: 500 }
      )
    }

    const {
      data: message,
      error: messageLoadError,
    } = await admin
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_participant_id,
        message_type,
        content,
        client_message_id,
        created_at,
        message_attachments (
          id,
          original_filename,
          mime_type,
          file_extension,
          file_size,
          storage_path
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageLoadError) {
      console.error(
        '[messages/send] reload file message:',
        messageLoadError
      )
    }

    return NextResponse.json(
      {
        ok: true,
        duplicate: false,
        message:
          message ?? {
            id: messageId,
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
      '[messages/send] unexpected:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message:
          'Nachricht konnte nicht gesendet werden.',
      },
      { status: 500 }
    )
  }
}