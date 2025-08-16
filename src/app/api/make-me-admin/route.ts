// app/api/make-me-admin/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST() {
  // ❗ In Production deaktivieren (nur lokal/Preview nutzbar)
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ ok:false, error:'unauthenticated' }, { status: 401 })

  // Nur Mails aus ENV dürfen sich selbst hochstufen
  const whitelist = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const myEmail = (user.email ?? '').toLowerCase()
  if (!whitelist.includes(myEmail)) {
    return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 })
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from('profiles')
    .update({ role: 'admin', updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ ok:false, error:'db' }, { status: 500 })
  return NextResponse.json({ ok:true })
}
