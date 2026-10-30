import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasPremiumAccess } from '@/lib/premium'

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
    // 2) Premium prüfen
    // =====================================================

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
        '[messages/start] premium lookup failed:',
        premiumError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'premium_check_failed',
          message: 'Premium-Status konnte nicht geprüft werden.',
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
            'Zum Starten eines Chats benötigst du eine aktive Premium Mitgliedschaft.',
        },
        { status: 403 }
      )
    }

    // =====================================================
    // 3) Request lesen
    // =====================================================

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

    // =====================================================
    // 4) Basisvalidierung
    // =====================================================

    if (!recipientId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'recipient_required',
          message: 'Empfänger fehlt.',
        },
        { status: 400 }
      )
    }

    if (recipientId === userId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'cannot_message_self',
          message: 'Du kannst dir nicht selbst schreiben.',
        },
        { status: 400 }
      )
    }

    /*
     * Neue Direktchats dürfen nur aus einer echten
     * Plattformoberfläche gestartet werden.
     */
    if (
      !sourceType ||
      !CHAT_SOURCE_TYPES.has(sourceType as ChatSourceType)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'source_required',
          message: 'Chat-Ursprung fehlt oder ist ungültig.',
        },
        { status: 400 }
      )
    }

    if (!sourceId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'source_id_required',
          message: 'ID des Chat-Ursprungs fehlt.',
        },
        { status: 400 }
      )
    }

    // =====================================================
    // 5) Sender + Empfänger laden
    // =====================================================

    const {
      data: profiles,
      error: profilesError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        username,
        company_name
      `)
      .in('id', [userId, recipientId])

    if (profilesError) {
      console.error(
        '[messages/start] profile lookup failed:',
        profilesError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'profile_lookup_failed',
          message: 'Profile konnten nicht geprüft werden.',
        },
        { status: 500 }
      )
    }

    const me = profiles?.find(
      (profile) => profile.id === userId
    )

    const recipient = profiles?.find(
      (profile) => profile.id === recipientId
    )

    if (!me) {
      return NextResponse.json(
        {
          ok: false,
          error: 'profile_not_found',
          message: 'Eigenes Profil wurde nicht gefunden.',
        },
        { status: 404 }
      )
    }

    if (!recipient) {
      return NextResponse.json(
        {
          ok: false,
          error: 'recipient_not_found',
          message: 'Empfänger wurde nicht gefunden.',
        },
        { status: 404 }
      )
    }

    // =====================================================
    // 6) Blockierung prüfen
    // =====================================================

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

    // =====================================================
    // 7) Chat-Ursprung prüfen
    // =====================================================

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

    // =====================================================
    // 8) Chat atomar erstellen oder vorhandenen verwenden
    // =====================================================

    const {
      data: conversationId,
      error: rpcError,
    } = await admin.rpc(
      'chat_get_or_create_direct',
      {
        p_user_a: userId,
        p_user_b: recipientId,

        p_user_a_name: getChatDisplayName(me),
        p_user_b_name: getChatDisplayName(recipient),

        p_source_type: sourceType,
        p_source_id: sourceId,
        p_source_snapshot: sourceCheck.snapshot,
      }
    )

    if (rpcError || !conversationId) {
      console.error(
        '[messages/start] chat_get_or_create_direct failed:',
        rpcError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'conversation_create_failed',
          message: 'Chat konnte nicht gestartet werden.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 9) Erfolg
    // =====================================================

    return NextResponse.json(
      {
        ok: true,
        conversationId,
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
      '[messages/start] unexpected error:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: 'Chat konnte nicht gestartet werden.',
      },
      { status: 500 }
    )
  }
}