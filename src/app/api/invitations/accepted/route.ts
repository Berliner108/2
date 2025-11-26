import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitedBy = (user.user_metadata as any)?.invited_by as string | undefined
    if (!invitedBy) {
      // User wurde nicht über eine Einladung angelegt → nichts zu tun
      return NextResponse.json({ updated: 0 })
    }

    const email = user.email.toLowerCase()
    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invited_user_id: user.id,
        error: null,
      })
      .eq('inviter_id', invitedBy)
      .eq('invitee_email', email)
      .in('status', ['sent', 'failed']) // nur sinnvolle Stati
      .select('id')

    if (error) {
      console.error('[invitations/accept] update error', error)
      return NextResponse.json(
        { error: 'Einladung konnte nicht aktualisiert werden.' },
        { status: 500 }
      )
    }

    const updated = data?.length ?? 0
    return NextResponse.json({ updated })
  } catch (e) {
    console.error('[invitations/accept] fatal', e)
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Akzeptieren der Einladung.' },
      { status: 500 }
    )
  }
}
