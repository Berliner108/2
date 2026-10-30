import { supabaseAdmin } from '@/lib/supabase-admin'

export function getChatDisplayName(profile: {
  username?: string | null
  company_name?: string | null
}) {
  return (
    profile.company_name?.trim() ||
    profile.username?.trim() ||
    'Nutzer'
  )
}

export function getFileExtension(filename: string) {
  const clean = filename.trim().toLowerCase()
  const index = clean.lastIndexOf('.')

  if (index <= 0 || index === clean.length - 1) {
    return ''
  }

  return clean.slice(index + 1)
}

export async function getChatParticipant(
  conversationId: string,
  userId: string
) {
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('conversation_participants')
    .select(`
      id,
      conversation_id,
      user_id,
      role,
      unread_count,
      last_read_at,
      left_at
    `)
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(
      `CHAT_PARTICIPANT_LOOKUP_FAILED: ${error.message}`
    )
  }

  return data ?? null
}

export async function isBlockedBetweenUsers(
  userA: string,
  userB: string
) {
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('user_blocks')
    .select('blocker_user_id, blocked_user_id')
    .or(
      `and(blocker_user_id.eq.${userA},blocked_user_id.eq.${userB}),and(blocker_user_id.eq.${userB},blocked_user_id.eq.${userA})`
    )
    .limit(1)

  if (error) {
    throw new Error(
      `CHAT_BLOCK_LOOKUP_FAILED: ${error.message}`
    )
  }

  return Boolean(data?.length)
}

export async function hasSupportAccess(userId: string) {
  const admin = supabaseAdmin()

  const { data, error } = await admin.rpc(
    'chat_has_support_access',
    {
      p_user_id: userId,
    }
  )

  if (error) {
    throw new Error(
      `CHAT_SUPPORT_ACCESS_FAILED: ${error.message}`
    )
  }

  return data === true
}

export async function isSupportAgent(userId: string) {
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('support_agents')
    .select('user_id, enabled, can_view_all_support')
    .eq('user_id', userId)
    .eq('enabled', true)
    .maybeSingle()

  if (error) {
    throw new Error(
      `CHAT_SUPPORT_AGENT_LOOKUP_FAILED: ${error.message}`
    )
  }

  return data ?? null
}