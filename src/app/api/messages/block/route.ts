import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getChatParticipant } from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  conversationId?: string
  blocked?: boolean
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

    const body =
      (await req.json().catch(() => ({}))) as Body

    const conversationId =
      typeof body.conversationId === 'string'
        ? body.conversationId.trim()
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

    const admin = supabaseAdmin()

    const {
      data: conversation,
      error: conversationError,
    } = await admin
      .from('conversations')
      .select('id, type')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_not_found',
        },
        { status: 404 }
      )
    }

    /*
     * Blockieren gilt nur für User-zu-User-Chats.
     * Support kann nicht blockiert werden.
     */
    if (conversation.type !== 'user') {
      return NextResponse.json(
        {
          ok: false,
          error: 'blocking_not_available',
        },
        { status: 400 }
      )
    }

    const myParticipant =
      await getChatParticipant(
        conversationId,
        user.id
      )

    if (!myParticipant) {
      return NextResponse.json(
        {
          ok: false,
          error: 'not_participant',
        },
        { status: 403 }
      )
    }

    const {
      data: others,
      error: participantError,
    } = await admin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .is('left_at', null)
      .neq('id', myParticipant.id)

    if (
      participantError ||
      !others ||
      others.length !== 1
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'recipient_lookup_failed',
        },
        { status: 500 }
      )
    }

    const otherUserId =
      others[0].user_id

    if (!otherUserId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'recipient_deleted',
        },
        { status: 410 }
      )
    }

    if (body.blocked === false) {
      const { error } = await admin
        .from('user_blocks')
        .delete()
        .eq(
          'blocker_user_id',
          user.id
        )
        .eq(
          'blocked_user_id',
          otherUserId
        )

      if (error) {
        console.error(
          '[messages/block] unblock:',
          error
        )

        return NextResponse.json(
          {
            ok: false,
            error: 'unblock_failed',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        ok: true,
        blocked: false,
      })
    }

    const { error } = await admin
      .from('user_blocks')
      .upsert(
        {
          blocker_user_id: user.id,
          blocked_user_id: otherUserId,
        },
        {
          onConflict:
            'blocker_user_id,blocked_user_id',
          ignoreDuplicates: true,
        }
      )

    if (error) {
      console.error(
        '[messages/block] block:',
        error
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'block_failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      blocked: true,
    })
  } catch (error) {
    console.error(
      '[messages/block] unexpected:',
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