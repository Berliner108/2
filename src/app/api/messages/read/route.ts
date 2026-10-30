import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getChatParticipant } from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  conversationId?: string
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
        { ok: false, error: 'not_authenticated' },
        { status: 401 }
      )
    }

    const raw = (await req.json().catch(() => ({}))) as Body

    const conversationId =
      typeof raw.conversationId === 'string'
        ? raw.conversationId.trim()
        : ''

    if (!conversationId || !isUuid(conversationId)) {
      return NextResponse.json(
        { ok: false, error: 'invalid_conversation_id' },
        { status: 400 }
      )
    }

    const participant = await getChatParticipant(
      conversationId,
      user.id
    )

    if (!participant) {
      return NextResponse.json(
        {
          ok: false,
          error: 'not_participant',
        },
        { status: 403 }
      )
    }

    const admin = supabaseAdmin()

    const {
      data: totalUnread,
      error: readError,
    } = await admin.rpc('chat_mark_read', {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    })

    if (readError) {
      console.error(
        '[messages/read] chat_mark_read failed:',
        readError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'read_update_failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        conversationId,
        totalUnread: Number(totalUnread ?? 0),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[messages/read] unexpected error:',
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