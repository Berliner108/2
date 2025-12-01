import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type DeleteStatus = 'open' | 'rejected' | 'done'

export async function PATCH(req: Request, context: any) {
  const id = context?.params?.id as string | undefined

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as {
    status?: DeleteStatus
    admin_note?: string | null
  } | null

  if (!body || !body.status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 })
  }

  const allowed: DeleteStatus[] = ['open', 'rejected', 'done']
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('account_delete_requests')
    .update({
      status: body.status,
      admin_note: body.admin_note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: 'Update failed', details: error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ request: data }, { status: 200 })
}
