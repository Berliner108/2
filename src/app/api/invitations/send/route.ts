import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeEmails(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.join(',') : String(input || '')
  return raw
    .split(/[,\s;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e && e.includes('@'))
    .slice(0, 20)
}

function mapInviteError(msg?: string) {
  const m = (msg || '').toLowerCase()

  if (/already been registered/.test(m)) {
    return {
      code: 'already_registered',
      message: 'Diese E-Mail-Adresse ist bereits registriert.',
    }
  }

  if (/signup/i.test(m) && /(not allowed|disabled|for this instance)/i.test(m)) {
    return {
      code: 'signups_disabled',
      message: 'Neue Registrierungen sind derzeit deaktiviert.',
    }
  }

  return {
    code: 'invite_failed',
    message: 'Einladung konnte nicht versendet werden.',
  }
}

type InviteResult = { email: string; ok: boolean; code?: string }

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const emails = normalizeEmails(body.emails)
  if (emails.length === 0) {
    return NextResponse.json({ error: 'Keine gültigen E-Mails.' }, { status: 400 })
  }

  // Rate-Limit: 20 / 24h
  const { count } = await sb
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_id', user.id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  if ((count ?? 0) + emails.length > 20) {
    return NextResponse.json(
      { error: 'Limit erreicht (max. 20 Einladungen pro 24h).' },
      { status: 429 },
    )
  }

  const h = await headers()
  const origin = (h.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectTo = `${origin}/auth/callback?redirect=/`

  const admin = supabaseAdmin()
  const results: InviteResult[] = []

  for (const email of emails) {
    try {
      // Explizit als any typisieren, damit TS nicht "never" draus macht
      const resp: any = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_by: user.id },
      } as any)

      const invitedUserId = resp?.data?.user?.id ?? null
      const error = resp?.error as { message?: string } | null

      if (error) {
        const mapped = mapInviteError(error.message)

        await admin.from('invitations').insert({
          inviter_id: user.id,
          invitee_email: email,
          status: 'failed',
          invited_user_id: invitedUserId,
          error: mapped.code,
        })

        results.push({ email, ok: false, code: mapped.code })
        continue
      }

      // Erfolg
      await admin.from('invitations').insert({
        inviter_id: user.id,
        invitee_email: email,
        status: 'sent',
        invited_user_id: invitedUserId,
        error: null,
      })

      results.push({ email, ok: true })
    } catch (e: any) {
      console.error('[invitations/send] fatal for', email, e)
      const mapped = mapInviteError(String(e?.message || ''))

      await admin.from('invitations').insert({
        inviter_id: user.id,
        invitee_email: email,
        status: 'failed',
        invited_user_id: null,
        error: mapped.code,
      })

      results.push({ email, ok: false, code: mapped.code })
    }
  }

  return NextResponse.json({ results })
}
