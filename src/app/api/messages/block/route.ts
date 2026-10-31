import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getChatParticipant } from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

async function getOtherUser(
  conversationId: string,
  userId: string
) {
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
    return {
      ok: false as const,
      status: 404,
      error: 'conversation_not_found',
    }
  }

  if (conversation.type !== 'user') {
    return {
      ok: false as const,
      status: 400,
      error: 'blocking_not_available',
    }
  }

  const myParticipant =
    await getChatParticipant(
      conversationId,
      userId
    )

  if (!myParticipant) {
    return {
      ok: false as const,
      status: 403,
      error: 'not_participant',
    }
  }

  const {
    data: others,
    error: participantError,
  } = await admin
    .from('conversation_participants')
    .select('user_id')
    .eq(
      'conversation_id',
      conversationId
    )
    .is('left_at', null)
    .neq('id', myParticipant.id)

  if (
    participantError ||
    !others ||
    others.length !== 1
  ) {
    return {
      ok: false as const,
      status: 500,
      error: 'recipient_lookup_failed',
    }
  }

  const otherUserId =
    others[0].user_id

  if (!otherUserId) {
    return {
      ok: false as const,
      status: 410,
      error: 'recipient_deleted',
    }
  }

  return {
    ok: true as const,
    otherUserId,
  }
}


async function getBlockState(
  userId: string,
  otherUserId: string
) {
  const admin = supabaseAdmin()

  const [
    blockedByMeResult,
    blockedByOtherResult,
  ] = await Promise.all([
    admin
      .from('user_blocks')
      .select('id')
      .eq('blocker_user_id', userId)
      .eq('blocked_user_id', otherUserId)
      .maybeSingle(),

    admin
      .from('user_blocks')
      .select('id')
      .eq('blocker_user_id', otherUserId)
      .eq('blocked_user_id', userId)
      .maybeSingle(),
  ])

  if (
    blockedByMeResult.error ||
    blockedByOtherResult.error
  ) {
    console.error(
      '[messages/block] status:',
      blockedByMeResult.error ||
        blockedByOtherResult.error
    )

    return {
      ok: false as const,
      error: 'block_status_failed',
    }
  }

  const blockedByMe =
    Boolean(blockedByMeResult.data)

  const blockedByOther =
    Boolean(blockedByOtherResult.data)

  return {
    ok: true as const,
    blockedByMe,
    blockedByOther,
    blocked:
      blockedByMe ||
      blockedByOther,
  }
}

// =====================================================
// STATUS
// =====================================================

export async function GET(req: Request) {
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

    const url = new URL(req.url)

    const conversationId =
      url.searchParams
        .get('conversationId')
        ?.trim() ?? ''

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

    const target =
      await getOtherUser(
        conversationId,
        user.id
      )

    if (!target.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: target.error,
        },
        { status: target.status }
      )
    }

    const blockState =
      await getBlockState(
        user.id,
        target.otherUserId
      )

    if (!blockState.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: blockState.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      blocked:
        blockState.blocked,
      blockedByMe:
        blockState.blockedByMe,
      blockedByOther:
        blockState.blockedByOther,
    })
  } catch (error) {
    console.error(
      '[messages/block] GET unexpected:',
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

// =====================================================
// BLOCKIEREN / ENTSPERREN
// =====================================================

type Body = {
  conversationId?: string
  blocked?: boolean
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

    const target =
      await getOtherUser(
        conversationId,
        user.id
      )

    if (!target.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: target.error,
        },
        { status: target.status }
      )
    }

    const admin = supabaseAdmin()

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
          target.otherUserId
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

      const blockState =
        await getBlockState(
          user.id,
          target.otherUserId
        )

      if (!blockState.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: blockState.error,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        ok: true,
        blocked:
          blockState.blocked,
        blockedByMe:
          blockState.blockedByMe,
        blockedByOther:
          blockState.blockedByOther,
      })
    }

    const { error } = await admin
      .from('user_blocks')
      .upsert(
        {
          blocker_user_id: user.id,
          blocked_user_id:
            target.otherUserId,
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

    const blockState =
      await getBlockState(
        user.id,
        target.otherUserId
      )

    if (!blockState.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: blockState.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      blocked:
        blockState.blocked,
      blockedByMe:
        blockState.blockedByMe,
      blockedByOther:
        blockState.blockedByOther,
    })
  } catch (error) {
    console.error(
      '[messages/block] POST unexpected:',
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