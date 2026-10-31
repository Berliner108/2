import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  isSupportAgent,
} from '@/lib/chat/helpers'

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
    const supportAgent =
      await isSupportAgent(user.id)

    const canViewAllSupport =
      Boolean(
        supportAgent &&
        supportAgent.can_view_all_support === true
      )

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
    let listRows: any[] = [
  ...(participations ?? []),
]

if (canViewAllSupport) {
  const {
    data: supportConversations,
    error: supportConversationsError,
  } = await admin
    .from('conversations')
    .select(`
      id,
      type,
      last_message_id,
      last_message_at,
      created_at,
      closed_at
    `)
    .eq('type', 'support')

  if (supportConversationsError) {
    console.error(
      '[messages/list] support conversations failed:',
      supportConversationsError
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'support_conversation_list_failed',
      },
      { status: 500 }
    )
  }

  const existingConversationIds =
    new Set(
      listRows
        .map(
          (row: any) =>
            row.conversation_id
        )
        .filter(Boolean)
    )

  for (
    const conversation
    of supportConversations ?? []
  ) {
    if (
      existingConversationIds.has(
        conversation.id
      )
    ) {
      continue
    }

    listRows.push({
      id: null,
      conversation_id:
        conversation.id,
      role: 'support',
      unread_count: 0,
      last_read_at: null,
      joined_at: null,
      conversations:
        conversation,
    })
  }
}
    if (!listRows.length) {
      return NextResponse.json({
        ok: true,
        conversations: [],
        totalUnread: 0,
      })
    }

    const conversationIds = listRows
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

    const participantUserIds = Array.from(
      new Set(
        (participants ?? [])
          .map((p: any) => p.user_id)
          .filter(
            (id: unknown): id is string =>
              typeof id === 'string' &&
              id.length > 0
          )
      )
    )

    const usernameMap =
      new Map<string, string>()

    if (participantUserIds.length) {
      const {
        data: profiles,
        error: profilesError,
      } = await admin
        .from('profiles')
        .select('id, username')
        .in('id', participantUserIds)

      if (profilesError) {
        console.error(
          '[messages/list] profiles failed:',
          profilesError
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'profile_list_failed',
          },
          { status: 500 }
        )
      }

      for (const profile of profiles ?? []) {
        const username =
          typeof profile.username === 'string'
            ? profile.username.trim()
            : ''

        if (username) {
          usernameMap.set(
            profile.id,
            username
          )
        }
      }
    }

    const lastMessageIds = listRows
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

    const conversations = listRows
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
        const supportMember =
        conversation.type === 'support'
          ? chatParticipants.find(
              (p: any) =>
                p.role === 'member'
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
                    otherParticipant?.account_deleted_at
                      ? 'Gelöschter Nutzer'
                      : otherParticipant?.user_id
                        ? usernameMap.get(
                            otherParticipant.user_id
                          ) ?? 'Nutzer'
                        : 'Gelöschter Nutzer',

                  deleted:
                    Boolean(
                      otherParticipant
                        ?.account_deleted_at
                    ),
                }
              : null,

          displayName:
          conversation.type === 'support'
            ? canViewAllSupport
              ? supportMember?.account_deleted_at
                ? 'Gelöschter Nutzer'
                : supportMember?.user_id
                  ? usernameMap.get(
                      supportMember.user_id
                    ) ?? 'Nutzer'
                  : 'Gelöschter Nutzer'
              : 'Beschichter Scout Support'
            : otherParticipant?.account_deleted_at
                ? 'Gelöschter Nutzer'
                : otherParticipant?.user_id
                  ? usernameMap.get(
                      otherParticipant.user_id
                    ) ?? 'Nutzer'
                  : 'Gelöschter Nutzer',

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

    const totalUnread = listRows.reduce(
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