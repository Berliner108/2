import { supabaseAdmin } from '@/lib/supabase-admin'
import { hasPremiumAccess } from '@/lib/premium'

import {
  getChatDisplayName,
  getChatParticipant,
  hasSupportAccess,
  isBlockedBetweenUsers,
  isSupportAgent,
} from '@/lib/chat/helpers'

type Success = {
  ok: true
  participant: {
    id: string
    conversation_id: string
    user_id: string | null
    role: string
    unread_count: number
    last_read_at: string | null
    left_at: string | null
  }
  conversation: {
    id: string
    type: 'user' | 'support'
    closed_at: string | null
  }
}

type Failure = {
  ok: false
  status: number
  error: string
  message: string
}

export type ChatSendPermissionResult =
  | Success
  | Failure

export async function ensureChatSendAccess(
  conversationId: string,
  userId: string
): Promise<ChatSendPermissionResult> {
  const admin = supabaseAdmin()

  const {
    data: conversation,
    error: conversationError,
  } = await admin
    .from('conversations')
    .select(`
      id,
      type,
      closed_at
    `)
    .eq('id', conversationId)
    .maybeSingle()

  if (conversationError) {
    console.error(
      '[chat/send-permission] conversation:',
      conversationError
    )

    return {
      ok: false,
      status: 500,
      error: 'conversation_lookup_failed',
      message: 'Chat konnte nicht geprüft werden.',
    }
  }

  if (!conversation) {
    return {
      ok: false,
      status: 404,
      error: 'conversation_not_found',
      message: 'Chat wurde nicht gefunden.',
    }
  }

  if (
    conversation.type !== 'user' &&
    conversation.type !== 'support'
  ) {
    return {
      ok: false,
      status: 500,
      error: 'invalid_conversation_type',
      message: 'Ungültiger Chat-Typ.',
    }
  }

  if (conversation.closed_at) {
    return {
      ok: false,
      status: 403,
      error: 'conversation_closed',
      message: 'Dieser Chat ist geschlossen.',
    }
  }

  let participant = await getChatParticipant(
    conversationId,
    userId
  )

  // =====================================================
  // DIREKTCHAT
  // =====================================================

  if (conversation.type === 'user') {
    if (!participant) {
      return {
        ok: false,
        status: 403,
        error: 'not_participant',
        message: 'Kein Zugriff auf diesen Chat.',
      }
    }

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
        '[chat/send-permission] premium:',
        premiumError
      )

      return {
        ok: false,
        status: 500,
        error: 'premium_check_failed',
        message:
          'Premium-Status konnte nicht geprüft werden.',
      }
    }

    if (!hasPremiumAccess(premiumProfile)) {
      return {
        ok: false,
        status: 403,
        error: 'premium_required',
        message:
          'Zum Schreiben von Nachrichten benötigst du eine aktive Premium Mitgliedschaft.',
      }
    }

    const {
      data: others,
      error: othersError,
    } = await admin
      .from('conversation_participants')
      .select('id, user_id')
      .eq('conversation_id', conversationId)
      .is('left_at', null)
      .neq('id', participant.id)

    if (othersError) {
      console.error(
        '[chat/send-permission] recipients:',
        othersError
      )

      return {
        ok: false,
        status: 500,
        error: 'participant_lookup_failed',
        message: 'Empfänger konnte nicht geprüft werden.',
      }
    }

    if (!others || others.length !== 1) {
      return {
        ok: false,
        status: 500,
        error: 'invalid_direct_conversation',
        message: 'Ungültiger Direktchat.',
      }
    }

    const recipientId = others[0].user_id

    if (!recipientId) {
      return {
        ok: false,
        status: 410,
        error: 'recipient_deleted',
        message:
          'Dieser Nutzer ist nicht mehr verfügbar.',
      }
    }

    const blocked = await isBlockedBetweenUsers(
      userId,
      recipientId
    )

    if (blocked) {
      return {
        ok: false,
        status: 403,
        error: 'chat_blocked',
        message:
          'Zwischen diesen Nutzern können keine Nachrichten gesendet werden.',
      }
    }

    return {
      ok: true,
      participant,
      conversation: {
        id: conversation.id,
        type: 'user',
        closed_at: conversation.closed_at,
      },
    }
  }

  // =====================================================
  // SUPPORT – normaler Kunde
  // =====================================================

  if (
    participant &&
    participant.role === 'member'
  ) {
    const allowed =
      await hasSupportAccess(userId)

    if (!allowed) {
      return {
        ok: false,
        status: 403,
        error: 'support_access_denied',
        message:
          'Der Support-Chat ist für diesen Account derzeit nicht freigeschaltet.',
      }
    }

    return {
      ok: true,
      participant,
      conversation: {
        id: conversation.id,
        type: 'support',
        closed_at: conversation.closed_at,
      },
    }
  }

  // =====================================================
  // SUPPORT – Support-Mitarbeiter
  // =====================================================

  const agent = await isSupportAgent(userId)

  if (!agent) {
    return {
      ok: false,
      status: 403,
      error: 'not_support_agent',
      message:
        'Kein Zugriff auf diesen Support-Chat.',
    }
  }

  if (!participant) {
    const {
      data: profile,
      error: profileError,
    } = await admin
      .from('profiles')
      .select(`
        username,
        company_name
      `)
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      return {
        ok: false,
        status: 500,
        error: 'profile_lookup_failed',
        message:
          'Support-Profil konnte nicht geprüft werden.',
      }
    }

    const {
      error: joinError,
    } = await admin.rpc(
      'chat_join_support_agent',
      {
        p_conversation_id: conversationId,
        p_user_id: userId,
        p_display_name:
          getChatDisplayName(profile),
      }
    )

    if (joinError) {
      console.error(
        '[chat/send-permission] join support:',
        joinError
      )

      return {
        ok: false,
        status: 500,
        error: 'support_join_failed',
        message:
          'Support-Chat konnte nicht geöffnet werden.',
      }
    }

    participant = await getChatParticipant(
      conversationId,
      userId
    )
  }

  if (
    !participant ||
    participant.role !== 'support'
  ) {
    return {
      ok: false,
      status: 403,
      error: 'invalid_support_role',
      message:
        'Keine Berechtigung zum Antworten.',
    }
  }

  return {
    ok: true,
    participant,
    conversation: {
      id: conversation.id,
      type: 'support',
      closed_at: conversation.closed_at,
    },
  }
}