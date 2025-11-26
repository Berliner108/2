// /src/app/api/invitations/mine/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type InvitationRow = {
  id: string
  inviter_id: string
  invitee_email: string
  status: 'sent' | 'accepted' | 'failed' | 'revoked'
  created_at: string
  accepted_at: string | null
  error: string | null
  invited_user_id?: string | null
}

function mapStatus(row: InvitationRow) {
  let status_label = ''
  let status_detail: string | null = null
  const err = (row.error || '').toLowerCase()

  switch (row.status) {
    case 'sent':
      status_label = 'versendet'
      status_detail = 'Die Einladung wurde per E-Mail versendet, die E-Mail ist noch nicht bestätigt.'
      break

    case 'accepted':
      status_label = 'akzeptiert'
      status_detail = 'Der/die Eingeladene hat die E-Mail bestätigt und kann sich nun anmelden.'
      break

    case 'revoked':
      status_label = 'zurückgezogen'
      status_detail = 'Die Einladung wurde zurückgezogen oder ist nicht mehr gültig.'
      break

    case 'failed':
    default:
      status_label = 'fehlgeschlagen'

      if (row.error === 'already_registered' || err.includes('already been registered')) {
        status_detail = 'Diese E-Mail-Adresse ist bereits registriert. Eine Einladung ist nicht nötig.'
      } else if (row.error === 'signups_disabled' || (err.includes('signup') && (err.includes('not allowed') || err.includes('disabled')))) {
        status_detail = 'Registrierungen sind derzeit deaktiviert. Die Einladung konnte nicht verschickt werden.'
      } else if (row.error) {
        status_detail = 'Versand der Einladung ist fehlgeschlagen.'
      } else {
        status_detail = 'Versand der Einladung ist fehlgeschlagen.'
      }
      break
  }

  return { status_label, status_detail }
}



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
      .select('id, inviter_id, invitee_email, status, invited_user_id, created_at, accepted_at, error')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[GET /api/invitations/mine] db error', error)
      return NextResponse.json(
        { error: 'Einladungen konnten nicht geladen werden.' },
        { status: 500 }
      )
    }

    const rows = (data || []) as InvitationRow[]

    const items = rows.map(row => {
      const { status_label, status_detail } = mapStatus(row)
      return {
        id: row.id,
        invitee_email: row.invitee_email,
        status: row.status,                // Rohstatus ("sent", "accepted", ...)
        status_label,                      // für UI ("versendet", "akzeptiert", ...)
        status_detail,                     // erklärender Text
        created_at: row.created_at,
        accepted_at: row.accepted_at,
        error_code: row.error,             // z. B. "already_registered"
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
