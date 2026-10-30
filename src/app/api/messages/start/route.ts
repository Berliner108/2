import { NextResponse } from 'next/server'

import { requirePremiumAccess } from '@/lib/require-premium'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  CHAT_SOURCE_TYPES,
  type ChatSourceType,
} from '@/lib/chat/constants'

import {
  getChatDisplayName,
  isBlockedBetweenUsers,
} from '@/lib/chat/helpers'

import { validateChatSource } from '@/lib/chat/source-validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  recipientId?: string
  sourceType?: string
  sourceId?: string
}

export async function POST(req: Request) {
  try {
    /*
     * Auth + Premium werden zentral über deinen
     * bestehenden Guard geprüft.
     */
    const premium = await requirePremiumAccess()

    if (!premium.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: premium.reason,
          message: premium.error,
        },
        { status: premium.status }
      )
    }

    const userId = premium.userId

    const raw = (await req.json().catch(() => ({}))) as Body

    const recipientId =
      typeof raw.recipientId === 'string'
        ? raw.recipientId.trim()
        : ''

    const sourceType =
      typeof raw.sourceType === 'string'
        ? raw.sourceType.trim()
        : ''

    const sourceId =
      typeof raw.sourceId === 'string'
        ? raw.sourceId.trim()
        : ''

    if (!recipientId) {
      return NextResponse.json(
        { ok: false, error: 'recipient_required' },
        { status: 400 }
      )
    }

    if (recipientId === userId) {
      return NextResponse.json(
        { ok: false, error: 'cannot_message_self' },
        { status: 400 }
      )
    }

    /*
     * Neue Direktchats dürfen nur von einer echten
     * Plattformoberfläche gestartet werden.
     */
    if (
      !sourceType ||
      !CHAT_SOURCE_TYPES.has(sourceType as ChatSourceType)
    ) {
      return NextResponse.json(
        { ok: false, error: 'source_required' },
        { status: 400 }
      )
    }

    if (!sourceId) {
      return NextResponse.json(
        { ok: false, error: 'source_id_required' },
        { status: 400 }
      )
    }

    const admin = supabaseAdmin()

    const { data: profiles, error: profilesError } =
      await admin
        .from('profiles')
        .select('id, username, company_name')
        .in('id', [userId, recipientId])

    if (profilesError) {
      console.error(
        '[messages/start] profile lookup:',
        profilesError
      )

      return NextResponse.json(
        { ok: false, error: 'profile_lookup_failed' },
        { status: 500 }
      )
    }

    const me = profiles?.find((p) => p.id === userId)
    const recipient = profiles?.find(
      (p) => p.id === recipientId
    )

    if (!me) {
      return NextResponse.json(
        { ok: false, error: 'profile_not_found' },
        { status: 404 }
      )
    }

    if (!recipient) {
      return NextResponse.json(
        { ok: false, error: 'recipient_not_found' },
        { status: 404 }
      )
    }

    const blocked = await isBlockedBetweenUsers(
      userId,
      recipientId
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

    const sourceCheck = await validateChatSource({
      sourceType: sourceType as ChatSourceType,
      sourceId,
      senderId: userId,
      recipientId,
    })

    if (!sourceCheck.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: sourceCheck.error,
          message: sourceCheck.message,
        },
        { status: sourceCheck.status }
      )
    }

    /*
     * Atomar:
     * bestehender Chat wird zurückgegeben oder neuer erstellt.
     */
    const { data: conversationId, error: rpcError } =
      await admin.rpc('chat_get_or_create_direct', {
        p_user_a: userId,
        p_user_b: recipientId,

        p_user_a_name: getChatDisplayName(me),
        p_user_b_name: getChatDisplayName(recipient),

        p_source_type: sourceType,
        p_source_id: sourceId,
        p_source_snapshot: sourceCheck.snapshot,
      })

    if (rpcError || !conversationId) {
      console.error(
        '[messages/start] rpc failed:',
        rpcError
      )

      return NextResponse.json(
        { ok: false, error: 'conversation_create_failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      conversationId,
    })
  } catch (error) {
    console.error('[messages/start] fatal:', error)

    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}