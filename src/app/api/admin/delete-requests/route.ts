// /src/app/api/admin/delete-requests/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type DeleteStatus = 'open' | 'rejected' | 'done'

type DbRow = {
  id: string
  status: DeleteStatus
  reason: string | null
  admin_note: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export async function GET() {
  // 1) Auth + Admin prüfen (wie im Admin-Dashboard)
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

  // 2) Löschanfragen laden (ohne Join)
  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('account_delete_requests') // <- Tabellenname wie bei dir
    .select('id,status,reason,admin_note,created_at,updated_at,user_id')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: 'Query failed', details: error.message },
      { status: 500 },
    )
  }

  const rows = (data || []) as DbRow[]

  // 3) User-E-Mails über Admin-API holen
  const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)))
  const emailById = new Map<string, string | null>()

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const { data: userRes } = await admin.auth.admin.getUserById(uid)
        const email = userRes?.user?.email ?? null
        emailById.set(uid, email)
      } catch {
        emailById.set(uid, null)
      }
    }),
  )

  const items = rows.map(r => ({
    ...r,
    user_email: r.user_id ? (emailById.get(r.user_id) ?? null) : null,
  }))

  return NextResponse.json({ items }, { status: 200 })
}
