import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  CHAT_MESSAGE_PAGE_SIZE,
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

type Cursor = {
  createdAt: string
  id: string
}

function encodeCursor(cursor: Cursor) {
  return Buffer.from(
    JSON.stringify(cursor),
    'utf8'
  ).toString('base64url')
}

function decodeCursor(
  value: string
): Cursor | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(
        value,
        'base64url'
      ).toString('utf8')
    )

    if (
      typeof decoded?.createdAt !== 'string' ||
      typeof decoded?.id !== 'string' ||
      !isUuid(decoded.id)
    ) {
      return null
    }

    const date =
      new Date(
        decoded.createdAt
      )

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null
    }

    return {
      createdAt:
        date.toISOString(),

      id:
        decoded.id,
    }
  } catch {
    return null
  }
}

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      conversationId: string
    }>
  }
) {
  try {
    // =====================================================
    // 1) CONVERSATION-ID
    // =====================================================

    const {
      conversationId,
    } = await params

    if (
      !conversationId ||
      !isUuid(
        conversationId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'invalid_conversation_id',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 2) AUTH
    // =====================================================

    const sb =
      await supabaseServer()

    const {
      data: {
        user,
      },
      error:
        authError,
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
        {
          status: 401,
        }
      )
    }

    const admin =
      supabaseAdmin()

    // =====================================================
    // 3) CONVERSATION LADEN
    // =====================================================

    const {
      data:
        conversation,
      error:
        conversationError,
    } =
      await admin
        .from(
          'conversations'
        )
        .select(`
          id,
          type,
          closed_at
        `)
        .eq(
          'id',
          conversationId
        )
        .maybeSingle()

    if (
      conversationError
    ) {
      console.error(
        '[messages/detail] conversation lookup failed:',
        conversationError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'conversation_lookup_failed',
        },
        {
          status: 500,
        }
      )
    }

    if (
      !conversation
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'conversation_not_found',
        },
        {
          status: 404,
        }
      )
    }

    // =====================================================
    // 4) ZUGRIFF PRÜFEN
    // =====================================================

    const participant =
      await getChatParticipant(
        conversationId,
        user.id
      )

    /*
     * Direktchat:
     * nur echte Teilnehmer dürfen lesen.
     *
     * Supportchat:
     * Teilnehmer oder freigeschalteter Support-Agent.
     */
    if (
      !participant
    ) {
      if (
        conversation.type !==
        'support'
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'not_participant',
          },
          {
            status: 403,
          }
        )
      }

      const supportAgent =
        await isSupportAgent(
          user.id
        )

      if (
        !supportAgent ||
        supportAgent
          .can_view_all_support !==
          true
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'not_authorized',
          },
          {
            status: 403,
          }
        )
      }
    }

    // =====================================================
    // 5) ANZEIGENAME BESTIMMEN
    // =====================================================

    let displayName =
      'Unterhaltung'

    if (
      conversation.type ===
      'support'
    ) {
      if (
        participant?.role ===
        'member'
      ) {
        /*
         * Der normale Nutzer sieht
         * "Beschichter Scout Support".
         */
        displayName =
          'Beschichter Scout Support'
      } else {
        /*
         * Support-Mitarbeiter sieht
         * den eigentlichen Nutzer.
         */
        const {
          data: member,
          error:
            memberError,
        } =
          await admin
            .from(
              'conversation_participants'
            )
            .select(
              'user_id'
            )
            .eq(
              'conversation_id',
              conversationId
            )
            .eq(
              'role',
              'member'
            )
            .is(
              'left_at',
              null
            )
            .maybeSingle()

        if (
          memberError
        ) {
          console.error(
            '[messages/detail] support member lookup failed:',
            memberError
          )
        }

        if (
          member?.user_id
        ) {
          const {
            data:
              memberProfile,
            error:
              memberProfileError,
          } =
            await admin
              .from(
                'profiles'
              )
              .select(
                'username'
              )
              .eq(
                'id',
                member.user_id
              )
              .maybeSingle()

          if (
            memberProfileError
          ) {
            console.error(
              '[messages/detail] support member profile lookup failed:',
              memberProfileError
            )
          }

          displayName =
            memberProfile
              ?.username
              ?.trim() ||
            'Nutzer'
        } else {
          displayName =
            'Gelöschter Nutzer'
        }
      }
    } else if (
      participant?.id
    ) {
      /*
       * Normaler Direktchat:
       * Name des anderen Teilnehmers.
       */
      const {
        data:
          otherParticipant,
        error:
          otherParticipantError,
      } =
        await admin
          .from(
            'conversation_participants'
          )
          .select(
            'user_id'
          )
          .eq(
            'conversation_id',
            conversationId
          )
          .neq(
            'id',
            participant.id
          )
          .is(
            'left_at',
            null
          )
          .maybeSingle()

      if (
        otherParticipantError
      ) {
        console.error(
          '[messages/detail] direct participant lookup failed:',
          otherParticipantError
        )
      }

      if (
        otherParticipant?.user_id
      ) {
        const {
          data:
            otherProfile,
          error:
            otherProfileError,
        } =
          await admin
            .from(
              'profiles'
            )
            .select(
              'username'
            )
            .eq(
              'id',
              otherParticipant.user_id
            )
            .maybeSingle()

        if (
          otherProfileError
        ) {
          console.error(
            '[messages/detail] direct profile lookup failed:',
            otherProfileError
          )
        }

        displayName =
          otherProfile
            ?.username
            ?.trim() ||
          'Nutzer'
      } else {
        displayName =
          'Gelöschter Nutzer'
      }
    }

    // =====================================================
    // 6) CURSOR LESEN
    // =====================================================

    const url =
      new URL(req.url)

    const cursorRaw =
      url.searchParams.get(
        'before'
      )

    let cursor:
      | Cursor
      | null = null

    if (
      cursorRaw
    ) {
      cursor =
        decodeCursor(
          cursorRaw
        )

      if (
        !cursor
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'invalid_cursor',
          },
          {
            status: 400,
          }
        )
      }
    }

    // =====================================================
    // 7) NACHRICHTEN LADEN
    // =====================================================

    let query =
      admin
        .from(
          'messages'
        )
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
            storage_path,
            created_at
          )
        `)
        .eq(
          'conversation_id',
          conversationId
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          }
        )
        .order(
          'id',
          {
            ascending:
              false,
          }
        )
        .limit(
          CHAT_MESSAGE_PAGE_SIZE +
            1
        )

    // =====================================================
    // 8) INFINITE-SCROLL-CURSOR
    // =====================================================

    if (
      cursor
    ) {
      query =
        query.or(
          [
            `created_at.lt.${cursor.createdAt}`,
            `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
          ].join(',')
        )
    }

    const {
      data: rows,
      error:
        messageError,
    } =
      await query

    if (
      messageError
    ) {
      console.error(
        '[messages/detail] messages load failed:',
        messageError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'messages_load_failed',
        },
        {
          status: 500,
        }
      )
    }

    const result =
      rows ?? []

    // =====================================================
    // 9) PAGINATION
    // =====================================================

    const hasMore =
      result.length >
      CHAT_MESSAGE_PAGE_SIZE

    const page =
      hasMore
        ? result.slice(
            0,
            CHAT_MESSAGE_PAGE_SIZE
          )
        : result

    const oldest =
      page.length >
      0
        ? page[
            page.length -
              1
          ]
        : null

    const nextBefore =
      hasMore &&
      oldest
        ? encodeCursor({
            createdAt:
              oldest.created_at,

            id:
              oldest.id,
          })
        : null

    /*
     * DB:
     * newest -> oldest
     *
     * UI:
     * oldest -> newest
     */
    const messages =
      [
        ...page,
      ].reverse()

    // =====================================================
    // 10) RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        ok: true,

        myParticipantId:
          participant?.id ??
          null,

        conversation: {
          id:
            conversation.id,

          type:
            conversation.type,

          closed:
            Boolean(
              conversation.closed_at
            ),

          displayName,
        },

        messages,

        hasMore,

        nextBefore,
      },
      {
        status: 200,

        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    )
  } catch (
    error
  ) {
    console.error(
      '[messages/detail] unexpected error:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          'internal_error',
      },
      {
        status: 500,
      }
    )
  }
}