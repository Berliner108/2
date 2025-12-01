import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type DeleteStatus = 'open' | 'rejected' | 'done'

/**
 * GET  /api/account/delete-request
 * -> letzte Löschanfrage + Info, ob der User eine neue stellen darf
 */
export async function GET() {
  const sb = await supabaseServer()
  const { data: { user }, error: userErr } = await sb.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await sb
    .from('account_delete_requests')
    .select('id, status, reason, admin_note, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const request = data as {
    id: string
    status: DeleteStatus
    reason: string | null
    admin_note: string | null
    created_at: string
    updated_at: string
  } | null

  const canRequest = !request || request.status !== 'open'

  return NextResponse.json({ request, canRequest })
}

/**
 * POST /api/account/delete-request
 * -> neue Löschanfrage anlegen (falls keine offene existiert)
 * Body: { reason?: string }
 */
export async function POST(req: Request) {
  const sb = await supabaseServer()
  const { data: { user }, error: userErr } = await sb.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1) Prüfen, ob schon eine offene Anfrage existiert
  const { data: existing, error: existingErr } = await sb
    .from('account_delete_requests')
    .select('id, status, reason, admin_note, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 400 })
  }

  if (existing && existing.status === 'open') {
    return NextResponse.json(
      {
        error: 'already-open',
        message: 'Es besteht bereits eine offene Löschanfrage.',
        request: existing,
      },
      { status: 409 },
    )
  }

  // 2) Optionalen Grund aus dem Body holen
  let reason: string | null = null
  try {
    const body = await req.json().catch(() => ({} as any))
    if (typeof body.reason === 'string') {
      const trimmed = body.reason.trim()
      reason = trimmed ? trimmed.slice(0, 1000) : null
    }
  } catch {
    // ignorieren -> reason bleibt null
  }

  // 3) Neue Anfrage anlegen
  const { data, error } = await sb
    .from('account_delete_requests')
    .insert({
      user_id: user.id,
      status: 'open',
      reason,
    })
    .select('id, status, reason, admin_note, created_at, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, request: data })
}
