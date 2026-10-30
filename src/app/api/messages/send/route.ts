import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasPremiumAccess } from '@/lib/premium'

import {
  CHAT_MAX_MESSAGE_LENGTH,
} from '@/lib/chat/constants'

import {
  getChatDisplayName,
  getChatParticipant,
  hasSupportAccess,
  isBlockedBetweenUsers,
  isSupportAgent,
} from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  conversationId?: string
  content?: string
  clientMessageId?: string
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function POST(req: Request) {
  try {
    // =====================================================
    // 1) Auth
    // =====================================================

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
          message: 'Nicht eingeloggt.',
        },
        { status: 401 }
      )
    }

    const userId = user.id
    const admin = supabaseAdmin()

    // =====================================================
    // 2) Request lesen
    // =====================================================

    const raw = (await req.json().catch(() => ({}))) as Body

    const conversationId =
      typeof raw.conversationId === 'string'
        ? raw.conversationId.trim()
        : ''

    const content =
      typeof raw.content === 'string'
        ? raw.content.trim()
        : ''

    const clientMessageId =
      typeof raw.clientMessageId === 'string'
        ? raw.clientMessageId.trim()
        : ''

    if (!conversationId || !isUuid(conversationId)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_conversation_id',
          message: 'Ungültiger Chat.',
        },
        { status: 400 }
      )
    }

    if (!clientMessageId || !isUuid(clientMessageId)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_client_message_id',
          message: 'Ungültige Nachrichten-ID.',
        },
        { status: 400 }
      )
    }

    if (!content) {
      return NextResponse.json(
        {
          ok: false,
          error: 'empty_message',
          message: 'Die Nachricht darf nicht leer sein.',
        },
        { status: 400 }
      )
    }

    if (content.length > CHAT_MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: 'message_too_long',
          message: `Die Nachricht darf höchstens ${CHAT_MAX_MESSAGE_LENGTH} Zeichen enthalten.`,
        },
        { status: 400 }
      )
    }

    // =====================================================
    // 3) Conversation laden
    // =====================================================

    const {
      data: conversation,
      error: conversationError,
    } = await admin
      .from('conversations')
      .select(`
        id,
        type,
        closed_at
      `)
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError) {
      console.error(
        '[messages/send] conversation lookup failed:',
        conversationError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_lookup_failed',
        },
        { status: 500 }
      )
    }

    if (!conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_not_found',
          message: 'Chat wurde nicht gefunden.',
        },
        { status: 404 }
      )
    }

    if (conversation.closed_at) {
      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_closed',
          message: 'Dieser Chat ist geschlossen.',
        },
        { status: 403 }
      )
    }

    // =====================================================
    // 4) Eigenen Participant suchen
    // =====================================================

    let myParticipant = await getChatParticipant(
      conversationId,
      userId
    )

    // =====================================================
    // 5) NORMALER USERCHAT
    // =====================================================

    if (conversation.type === 'user') {
      /*
       * Admin-Mitleserecht bedeutet NICHT:
       * Admin darf unsichtbar in fremden Chats schreiben.
       *
       * Zum Senden muss man echter Teilnehmer sein.
       */
      if (!myParticipant) {
        return NextResponse.json(
          {
            ok: false,
            error: 'not_participant',
            message: 'Kein Zugriff auf diesen Chat.',
          },
          { status: 403 }
        )
      }

      // -----------------------------------------------------
      // Premium beim SENDEN erneut prüfen.
      //
      // Ein Nutzer kann den Chat weiterhin lesen,
      // wenn Premium später abläuft.
      // Schreiben geht dann nicht mehr.
      // -----------------------------------------------------

      const {
        data: premiumProfile,
        error: premiumError,
      } = await admin
        .from('profiles')
        .select(`
          premium_exempt,
          premium_trial_ends_at,
          premium_until
        `)
        .eq('id', userId)
        .maybeSingle()

      if (premiumError || !premiumProfile) {
        console.error(
          '[messages/send] premium lookup failed:',
          premiumError
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'premium_check_failed',
            message:
              'Premium-Status konnte nicht geprüft werden.',
          },
          { status: 500 }
        )
      }

      if (!hasPremiumAccess(premiumProfile)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'premium_required',
            reason: 'premium_required',
            message:
              'Zum Schreiben von Nachrichten benötigst du eine aktive Premium Mitgliedschaft.',
          },
          { status: 403 }
        )
      }

      // -----------------------------------------------------
      // Anderen User bestimmen
      // -----------------------------------------------------

      const {
        data: otherParticipants,
        error: otherParticipantsError,
      } = await admin
        .from('conversation_participants')
        .select(`
          id,
          user_id
        `)
        .eq('conversation_id', conversationId)
        .is('left_at', null)
        .neq('id', myParticipant.id)

      if (otherParticipantsError) {
        console.error(
          '[messages/send] participant lookup failed:',
          otherParticipantsError
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'participant_lookup_failed',
          },
          { status: 500 }
        )
      }

      /*
       * Ein Direktchat darf genau zwei aktive
       * Teilnehmer besitzen.
       */
      if (
        !otherParticipants ||
        otherParticipants.length !== 1
      ) {
        console.error(
          '[messages/send] invalid direct conversation:',
          conversationId
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'invalid_direct_conversation',
          },
          { status: 500 }
        )
      }

      const otherUserId =
        otherParticipants[0].user_id

      /*
       * Wenn der andere Account inzwischen gelöscht wurde,
       * bleibt der Verlauf erhalten, aber es kann natürlich
       * niemand mehr angeschrieben werden.
       */
      if (!otherUserId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'recipient_deleted',
            message:
              'Dieser Nutzer ist nicht mehr verfügbar.',
          },
          { status: 410 }
        )
      }

      // -----------------------------------------------------
      // Blockierung in BEIDE Richtungen
      // -----------------------------------------------------

      const blocked =
        await isBlockedBetweenUsers(
          userId,
          otherUserId
        )

      if (blocked) {
        return NextResponse.json(
          {
            ok: false,
            error: 'chat_blocked',
            message:
              'Zwischen diesen Nutzern können keine Nachrichten gesendet werden.',
          },
          { status: 403 }
        )
      }
    }

    // =====================================================
    // 6) SUPPORTCHAT
    // =====================================================

    else if (conversation.type === 'support') {
      /*
       * Fall A:
       * normaler Nutzer ist bereits Participant.
       */
      if (
        myParticipant &&
        myParticipant.role === 'member'
      ) {
        const allowed =
          await hasSupportAccess(userId)

        if (!allowed) {
          return NextResponse.json(
            {
              ok: false,
              error: 'support_access_denied',
              message:
                'Der Support-Chat ist für diesen Account derzeit nicht freigeschaltet.',
            },
            { status: 403 }
          )
        }
      }

      /*
       * Fall B:
       * Support-Mitarbeiter.
       *
       * Er darf einen Supportchat sehen, auch bevor er
       * Participant ist. Beim ersten Antworten wird er
       * sauber als Support-Participant eingetragen.
       */
      else {
        const agent =
          await isSupportAgent(userId)

        if (!agent) {
          return NextResponse.json(
            {
              ok: false,
              error: 'not_support_agent',
              message: 'Kein Zugriff auf diesen Support-Chat.',
            },
            { status: 403 }
          )
        }

        if (!myParticipant) {
          const {
            data: profile,
            error: profileError,
          } = await admin
            .from('profiles')
            .select(`
              username,
              company_name
            `)
            .eq('id', userId)
            .maybeSingle()

          if (profileError || !profile) {
            console.error(
              '[messages/send] support profile lookup:',
              profileError
            )

            return NextResponse.json(
              {
                ok: false,
                error: 'profile_lookup_failed',
              },
              { status: 500 }
            )
          }

          const {
            data: participantId,
            error: joinError,
          } = await admin.rpc(
            'chat_join_support_agent',
            {
              p_conversation_id: conversationId,
              p_user_id: userId,
              p_display_name:
                getChatDisplayName(profile),
            }
          )

          if (joinError || !participantId) {
            console.error(
              '[messages/send] join support failed:',
              joinError
            )

            return NextResponse.json(
              {
                ok: false,
                error: 'support_join_failed',
              },
              { status: 500 }
            )
          }

          myParticipant = await getChatParticipant(
            conversationId,
            userId
          )

          if (!myParticipant) {
            return NextResponse.json(
              {
                ok: false,
                error: 'support_join_failed',
              },
              { status: 500 }
            )
          }
        }

        if (myParticipant.role !== 'support') {
          return NextResponse.json(
            {
              ok: false,
              error: 'invalid_support_role',
            },
            { status: 403 }
          )
        }
      }
    }

    // =====================================================
    // 7) Ungültiger Conversation-Typ
    // =====================================================

    else {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_conversation_type',
        },
        { status: 500 }
      )
    }

    if (!myParticipant) {
      return NextResponse.json(
        {
          ok: false,
          error: 'participant_missing',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 8) Nachricht speichern
    // =====================================================

    const {
      data: message,
      error: messageError,
    } = await admin
      .from('messages')
      .insert({
        conversation_id: conversationId,

        sender_participant_id:
          myParticipant.id,

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

    // =====================================================
    // 9) Idempotenz
    //
    // Falls derselbe clientMessageId durch Retry erneut
    // geschickt wird, geben wir die bereits existierende
    // Nachricht zurück statt einen Fehler zu zeigen.
    // =====================================================

    if (messageError) {
      if (messageError.code === '23505') {
        const {
          data: existingMessage,
          error: existingError,
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
            myParticipant.id
          )
          .eq(
            'client_message_id',
            clientMessageId
          )
          .maybeSingle()

        if (
          !existingError &&
          existingMessage
        ) {
          return NextResponse.json(
            {
              ok: true,
              message: existingMessage,
              duplicate: true,
            },
            {
              status: 200,
              headers: {
                'Cache-Control': 'no-store',
              },
            }
          )
        }
      }

      console.error(
        '[messages/send] insert failed:',
        messageError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'message_create_failed',
          message: 'Nachricht konnte nicht gesendet werden.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 10) Erfolg
    //
    // conversation.last_message_at
    // unread_count
    // Realtime Broadcast
    //
    // macht unser PostgreSQL-Trigger automatisch.
    // =====================================================

    return NextResponse.json(
      {
        ok: true,
        message,
        duplicate: false,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[messages/send] unexpected error:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: 'Nachricht konnte nicht gesendet werden.',
      },
      { status: 500 }
    )
  }
}