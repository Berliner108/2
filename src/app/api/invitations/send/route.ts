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

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      { status: 429 }
    )
  }

  const h = await headers()
  const origin = (h.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectTo = `${origin}/auth/callback?redirect=/`

  const admin = supabaseAdmin()
  const results: Array<{ email: string; ok: boolean; error?: string; reason?: string }> = []

  for (const email of emails) {
    const baseRow = { inviter_id: user.id, invitee_email: email }

    try {
      // 1) Prüfen, ob E-Mail schon als User existiert
      const { data: existsData, error: existsErr } = await admin
        .rpc('user_exists_by_email', { p_email: email })

      if (!existsErr && existsData === true) {
        // Bereits registriert -> keine neue Einladung, Status = failed/ already_registered
        await admin
          .from('invitations')
          .upsert(
            {
              ...baseRow,
              status: 'failed',
              error: 'already_registered',
              invited_user_id: null,
              accepted_at: null,
            },
            { onConflict: 'inviter_id,invitee_email' }
          )

        results.push({
          email,
          ok: false,
          error: 'already_registered',
          reason: 'already_registered',
        })
        continue
      }

      // 2) Einladung normal senden
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_by: user.id }, // wichtig: Einlader merken
      } as any)

      if (error) throw new Error(error.message)

      await admin
        .from('invitations')
        .upsert(
          {
            ...baseRow,
            status: 'sent',
            invited_user_id: data?.user?.id ?? null,
            error: null,
            accepted_at: null,
          },
          { onConflict: 'inviter_id,invitee_email' }
        )

      results.push({ email, ok: true })
    } catch (e: any) {
      const msg = String(e?.message || 'unknown error')

      await admin
        .from('invitations')
        .upsert(
          {
            ...baseRow,
            status: 'failed',
            error: msg,
            invited_user_id: null,
            accepted_at: null,
          },
          { onConflict: 'inviter_id,invitee_email' }
        )

      results.push({ email, ok: false, error: msg })
    }
  }

  return NextResponse.json({ results })
}
