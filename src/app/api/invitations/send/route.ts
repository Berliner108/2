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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const emails = normalizeEmails(body.emails)
  if (emails.length === 0) {
    return NextResponse.json({ error: 'Keine gültigen E-Mails.' }, { status: 400 })
  }

  // Rate-Limit (optional): 20 / 24h
  const { count } = await sb
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_id', user.id)
    .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
  if ((count ?? 0) + emails.length > 20) {
    return NextResponse.json({ error: 'Limit erreicht (max. 20 Einladungen pro 24h).' }, { status: 429 })
  }

  const h = await headers()
  const origin = (h.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const redirectTo = `${origin}/auth/callback?redirect=/`

  const admin = supabaseAdmin()
  const results: Array<{ email: string; ok: boolean; error?: string }> = []

  for (const email of emails) {
    try {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_by: user.id },
      } as any)
      if (error) throw new Error(error.message)

      await admin.from('invitations').insert({
        inviter_id: user.id,
        invitee_email: email,
        status: 'sent',
        invited_user_id: data?.user?.id ?? null,
      })

      results.push({ email, ok: true })
    } catch (e: any) {
      await admin.from('invitations').insert({
        inviter_id: user.id,
        invitee_email: email,
        status: 'failed',
        error: String(e?.message || 'unknown error'),
      })
      results.push({ email, ok: false, error: String(e?.message || 'unknown error') })
    }
  }

  return NextResponse.json({ results })
}
