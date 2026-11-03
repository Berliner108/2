import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  getChatDisplayName,
  hasSupportAccess,
} from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  create?: boolean
}

export async function POST(
  req: Request
) {
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

    const raw =
      (await req
        .json()
        .catch(() => ({}))) as Body

    const create =
      raw.create === true

    // =====================================================
    // 2) Support-Zugang prüfen
    // Kein Premium notwendig
    // =====================================================

    const allowed =
      await hasSupportAccess(userId)

    if (!allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: 'support_access_denied',
          message:
            'Der Support-Chat ist für diesen Account derzeit nicht freigeschaltet.',
        },
        { status: 403 }
      )
    }

    // =====================================================
    // 3) Bestehenden Support-Chat suchen
    // =====================================================

    const {
      data: existingParticipation,
      error: existingError,
    } = await admin
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner (
          id,
          type
        )
      `)
      .eq('user_id', userId)
      .is('left_at', null)
      .eq(
        'conversations.type',
        'support'
      )
      .limit(1)
      .maybeSingle()

    if (existingError) {
      console.error(
        '[messages/support/start] existing support lookup failed:',
        existingError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'support_chat_lookup_failed',
          message:
            'Support-Chat konnte nicht geöffnet werden.',
        },
        { status: 500 }
      )
    }

    if (
      existingParticipation
        ?.conversation_id
    ) {
      return NextResponse.json(
        {
          ok: true,
          conversationId:
            existingParticipation
              .conversation_id,
        },
        {
          status: 200,
          headers: {
            'Cache-Control':
              'no-store',
          },
        }
      )
    }

    if (!create) {
      return NextResponse.json(
        {
          ok: true,
          ready: true,
          conversationId: null,
        },
        {
          status: 200,
          headers: {
            'Cache-Control':
              'no-store',
          },
        }
      )
    }

    // =====================================================
    // 4) Profil laden
    // =====================================================

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from('profiles')
      .select(`
        id,
        username,
        company_name
      `)
      .eq('id', userId)
      .maybeSingle()

    if (
      profileError ||
      !profile
    ) {
      console.error(
        '[messages/support/start] profile lookup failed:',
        profileError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'profile_lookup_failed',
          message:
            'Profil konnte nicht geladen werden.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 4) Anzeigename
    // =====================================================

    const displayName =
      getChatDisplayName(profile)

    // =====================================================
    // 5) Supportchat holen oder erstellen
    // WICHTIG:
    // bestehender SQL-Parameter heißt p_user_name
    // =====================================================

    const {
      data: conversationId,
      error: rpcError,
    } = await admin.rpc(
      'chat_get_or_create_support',
      {
        p_user_id: userId,
        p_user_name: displayName,
      }
    )

    if (
      rpcError ||
      !conversationId
    ) {
      console.error(
        '[messages/support/start] chat_get_or_create_support failed:',
        rpcError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'support_chat_create_failed',
          message:
            'Support-Chat konnte nicht geöffnet werden.',
        },
        { status: 500 }
      )
    }

    // =====================================================
    // 6) Erfolg
    // =====================================================

    return NextResponse.json(
      {
        ok: true,
        conversationId,
      },
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[messages/support/start] unexpected error:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message:
          'Support-Chat konnte nicht geöffnet werden.',
      },
      { status: 500 }
    )
  }
}