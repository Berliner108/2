import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isSupportAgent } from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
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

    const agent =
      await isSupportAgent(user.id)

    if (
      !agent ||
      agent.can_view_all_support !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'not_support_agent',
        },
        { status: 403 }
      )
    }

    const admin = supabaseAdmin()

    // =====================================================
    // 1) Support-Unterhaltungen
    // =====================================================

    const {
      data: conversations,
      error: conversationsError,
    } = await admin
      .from('conversations')
      .select(`
        id,
        created_at,
        last_message_at,
        last_message_id,
        closed_at
      `)
      .eq('type', 'support')
      .order(
        'last_message_at',
        {
          ascending: false,
          nullsFirst: false,
        }
      )

    if (conversationsError) {
      console.error(
        '[support/messages] conversations:',
        conversationsError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'conversations_load_failed',
        },
        { status: 500 }
      )
    }

    const rows =
      conversations ?? []

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        conversations: [],
      })
    }

    const conversationIds =
      rows.map(
        (conversation) =>
          conversation.id
      )

    // =====================================================
    // 2) Eigentliche Nutzer der Supportchats
    // =====================================================

    const {
      data: participants,
      error: participantsError,
    } = await admin
      .from('conversation_participants')
      .select(`
        conversation_id,
        user_id,
        display_name_snapshot,
        role,
        left_at
      `)
      .in(
        'conversation_id',
        conversationIds
      )
      .eq('role', 'member')
      .is('left_at', null)

    if (participantsError) {
      console.error(
        '[support/messages] participants:',
        participantsError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'participants_load_failed',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 3) Letzte Nachrichten
    // =====================================================

    const lastMessageIds =
      rows
        .map(
          (conversation) =>
            conversation.last_message_id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        )

    let lastMessages:
      Array<{
        id: string
        content: string | null
        message_type: string
        created_at: string
      }> = []

    if (
      lastMessageIds.length >
      0
    ) {
      const {
        data,
        error,
      } = await admin
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          created_at
        `)
        .in(
          'id',
          lastMessageIds
        )

      if (error) {
        console.error(
          '[support/messages] last messages:',
          error
        )
      } else {
        lastMessages =
          data ?? []
      }
    }

    const participantMap =
      new Map(
        (participants ?? []).map(
          (participant) => [
            participant.conversation_id,
            participant,
          ]
        )
      )

    const messageMap =
      new Map(
        lastMessages.map(
          (message) => [
            message.id,
            message,
          ]
        )
      )

    // =====================================================
    // 4) Response
    // =====================================================

    const result =
      rows.map(
        (conversation) => {
          const member =
            participantMap.get(
              conversation.id
            )

          const lastMessage =
            conversation.last_message_id
              ? messageMap.get(
                  conversation.last_message_id
                )
              : undefined

          let preview =
            'Noch keine Nachricht'

          if (lastMessage) {
            if (
              lastMessage.message_type ===
              'file'
            ) {
              preview =
                'Dateianhang'
            } else if (
              lastMessage.content
            ) {
              preview =
                lastMessage.content
            }
          }

          return {
            id:
              conversation.id,

            displayName:
              member
                ?.display_name_snapshot ||
              'Nutzer',

            userId:
              member?.user_id ??
              null,

            preview,

            lastMessageAt:
              conversation.last_message_at ??
              conversation.created_at,

            closed:
              Boolean(
                conversation.closed_at
              ),
          }
        }
      )

    return NextResponse.json(
      {
        ok: true,
        conversations:
          result,
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
      '[support/messages] unexpected:',
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