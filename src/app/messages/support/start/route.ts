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

    /*
     * Support ist unabhängig von Premium.
     */
    const allowed =
      await hasSupportAccess(user.id)

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

    const admin = supabaseAdmin()

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from('profiles')
      .select(`
        username,
        company_name
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (
      profileError ||
      !profile
    ) {
      console.error(
        '[support/start] profile:',
        profileError
      )

      return NextResponse.json(
        {
          ok: false,
          error: 'profile_lookup_failed',
        },
        { status: 500 }
      )
    }

    const displayName =
      getChatDisplayName(profile)

    const {
      data: conversationId,
      error: rpcError,
    } = await admin.rpc(
      'chat_get_or_create_support',
      {
        p_user_id: user.id,
        p_display_name:
          displayName,
      }
    )

    if (
      rpcError ||
      !conversationId
    ) {
      console.error(
        '[support/start] rpc:',
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

    return NextResponse.json(
      {
        ok: true,
        conversationId,
      },
      {
        headers: {
          'Cache-Control':
            'no-store',
        },
      }
    )
  } catch (error) {
    console.error(
      '[support/start] unexpected:',
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