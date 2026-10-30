import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getChatParticipant } from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_REASONS = new Set([
  'spam',
  'beleidigung',
  'betrug',
  'unangemessene_inhalte',
  'sonstiges',
])

type Body = {
  conversationId?: string
  reason?: string
  details?: string
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

    const reason =
      typeof body.reason === 'string'
        ? body.reason.trim()
        : ''

    const details =
      typeof body.details === 'string'
        ? body.details.trim()
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

    if (!ALLOWED_REASONS.has(reason)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_reason',
        },
        { status: 400 }
      )
    }

    if (details.length > 2000) {
      return NextResponse.json(
        {
          ok: false,
          error: 'details_too_long',
          message:
            'Die Beschreibung darf höchstens 2.000 Zeichen enthalten.',
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

    if (
      conversationError ||
      !conversation
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_not_found',
        },
        { status: 404 }
      )
    }

    const participant =
      await getChatParticipant(
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

    let reportedUserId:
      | string
      | null = null

    if (
      conversation.type === 'user'
    ) {
      const {
        data: others,
        error: othersError,
      } = await admin
        .from(
          'conversation_participants'
        )
        .select('user_id')
        .eq(
          'conversation_id',
          conversationId
        )
        .is('left_at', null)
        .neq('id', participant.id)

      if (
        othersError ||
        !others ||
        others.length !== 1
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'recipient_lookup_failed',
          },
          { status: 500 }
        )
      }

      reportedUserId =
        others[0].user_id ?? null
    }

    const {
      data: report,
      error: reportError,
    } = await admin
      .from('chat_reports')
      .insert({
        conversation_id:
          conversationId,

        reporter_user_id:
          user.id,

        reported_user_id:
          reportedUserId,

        reason,

        details:
          details || null,

        status: 'open',
      })
      .select('id, created_at')
      .single()

    if (reportError) {
      console.error(
        '[messages/report] insert:',
        reportError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'report_create_failed',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      report,
    })
  } catch (error) {
    console.error(
      '[messages/report] unexpected:',
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