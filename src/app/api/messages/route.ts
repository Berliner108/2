import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

    const admin = supabaseAdmin()

    const {
      data: participations,
      error: participationError,
    } = await admin
      .from('conversation_participants')
      .select(`
        id,
        conversation_id,
        role,
        unread_count,
        last_read_at,
        joined_at,
        conversations (
          id,
          type,
          last_message_id,
          last_message_at,
          created_at,
          closed_at
        )
      `)
      .eq('user_id', user.id)
      .is('left_at', null)

    if (participationError) {
      console.error(
        '[messages/list] participations failed:',
        participationError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_list_failed',
        },
        { status: 500 }
      )
    }

    if (!participations?.length) {
      return NextResponse.json({
        ok: true,
        conversations: [],
        totalUnread: 0,
      })
    }

    const conversationIds = participations
      .map((row: any) => row.conversation_id)
      .filter(Boolean)

    const {
      data: participants,
      error: participantsError,
    } = await admin
      .from('conversation_participants')
      .select(`
        id,
        conversation_id,
        user_id,
        role,
        display_name_snapshot,
        account_deleted_at
      `)
      .in('conversation_id', conversationIds)
      .is('left_at', null)

    if (participantsError) {
      console.error(
        '[messages/list] participants failed:',
        participantsError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'participant_list_failed',
        },
        { status: 500 }
      )
    }

    const lastMessageIds = participations
      .map(
        (row: any) =>
          row.conversations?.last_message_id
      )
      .filter(Boolean)

    let messages: any[] = []

    if (lastMessageIds.length) {
      const { data, error } = await admin
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_participant_id,
          message_type,
          content,
          created_at
        `)
        .in('id', lastMessageIds)

      if (error) {
        console.error(
          '[messages/list] last messages failed:',
          error
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'last_messages_failed',
          },
          { status: 500 }
        )
      }

      messages = data ?? []
    }

    const messageMap = new Map(
      messages.map((m: any) => [m.id, m])
    )

    const conversations = participations
      .map((row: any) => {
        const conversation = row.conversations

        if (!conversation) return null

        const chatParticipants = (
          participants ?? []
        ).filter(
          (p: any) =>
            p.conversation_id === conversation.id
        )

        const otherParticipant =
          conversation.type === 'user'
            ? chatParticipants.find(
                (p: any) => p.user_id !== user.id
              )
            : null

        const lastMessage =
          conversation.last_message_id
            ? messageMap.get(
                conversation.last_message_id
              ) ?? null
            : null

        return {
          id: conversation.id,
          type: conversation.type,

          unreadCount:
            Number(row.unread_count ?? 0),

          lastMessageAt:
            conversation.last_message_at,

          closed:
            Boolean(conversation.closed_at),

          otherUser:
            conversation.type === 'user'
              ? {
                  id:
                    otherParticipant?.user_id ??
                    null,

                  displayName:
                    otherParticipant
                      ?.display_name_snapshot ??
                    'Gelöschter Nutzer',

                  deleted:
                    Boolean(
                      otherParticipant
                        ?.account_deleted_at
                    ),
                }
              : null,

          displayName:
            conversation.type === 'support'
              ? 'Beschichter Scout Support'
              : otherParticipant
                  ?.display_name_snapshot ??
                'Gelöschter Nutzer',

          lastMessage,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aTime = a.lastMessageAt
          ? new Date(a.lastMessageAt).getTime()
          : 0

        const bTime = b.lastMessageAt
          ? new Date(b.lastMessageAt).getTime()
          : 0

        return bTime - aTime
      })

    const totalUnread = participations.reduce(
      (sum: number, row: any) =>
        sum + Number(row.unread_count ?? 0),
      0
    )

    return NextResponse.json(
      {
        ok: true,
        conversations,
        totalUnread,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[messages/list] unexpected error:',
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