import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('invitations')
      .select('id, invitee_email, status, created_at, accepted_at, error')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Einladungen konnten nicht geladen werden.' },
        { status: 500 }
      )
    }

    const items = (data ?? []).map(row => {
      const status = row.status as string
      const err = (row.error ?? '') as string

      let status_label = status
      let status_detail: string | null = null

      if (status === 'accepted') {
        status_label = 'akzeptiert'
      } else if (status === 'sent') {
        status_label = 'versendet'
      } else if (status === 'failed') {
        if (err === 'already_registered') {
          status_label = 'bereits registriert'
          status_detail = 'Die E-Mail-Adresse ist bereits als Nutzer registriert.'
        } else {
          status_label = 'fehlgeschlagen'
          status_detail = err || 'Versand der Einladung ist fehlgeschlagen.'
        }
      } else if (status === 'revoked') {
        status_label = 'zurückgezogen'
      }

      return {
        id: row.id,
        invitee_email: row.invitee_email,
        status,
        status_label,
        status_detail,
        created_at: row.created_at,
        accepted_at: row.accepted_at,
        error: row.error,
      }
    })

    return NextResponse.json({ items })
  } catch (e) {
    console.error('[GET /api/invitations/mine] fatal', e)
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Laden der Einladungen.' },
      { status: 500 }
    )
  }
}
