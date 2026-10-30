import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

import {
  getChatDisplayName,
  hasSupportAccess,
} from '@/lib/chat/helpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
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
    // 3) Profil laden
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