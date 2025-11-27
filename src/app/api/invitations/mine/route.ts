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



// /src/app/api/invitations/mine/route.ts
export async function GET(req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 🔢 Pagination-Parameter aus Query
    const url = new URL(req.url)
    const sp = url.searchParams

    const pageParam  = Number(sp.get('page')  ?? '1')
    const limitParam = Number(sp.get('limit') ?? '5')

    const page  = Number.isFinite(pageParam)  && pageParam  > 0 ? pageParam  : 1
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 5

    const offset = (page - 1) * limit
    const to     = offset + limit - 1

    const admin = supabaseAdmin()

    const { data, error, count } = await admin
      .from('invitations')
      .select('id, inviter_id, invitee_email, status, invited_user_id, created_at, accepted_at, error', {
        count: 'exact',
      })
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, to)

    if (error) {
      console.error('[GET /api/invitations/mine] db error', error)
      return NextResponse.json(
        { error: 'Einladungen konnten nicht geladen werden.' },
        { status: 500 }
      )
    }

    const rows = (data || []) as InvitationRow[]
    const total = count ?? 0

    const items = rows.map(row => {
      const { status_label, status_detail } = mapStatus(row)
      return {
        id: row.id,
        invitee_email: row.invitee_email,
        status: row.status,
        status_label,
        status_detail,
        created_at: row.created_at,
        accepted_at: row.accepted_at,
        error_code: row.error,
      }
    })

    const hasMore = offset + items.length < total

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      hasMore,
    })
  } catch (e) {
    console.error('[GET /api/invitations/mine] fatal', e)
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Laden der Einladungen.' },
      { status: 500 }
    )
  }
}

