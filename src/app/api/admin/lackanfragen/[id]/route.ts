// /src/app/api/admin/lackanfragen/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // <- Promise
) {
  const { id } = await params // <- zwingend in Next 15

  const userClient = await supabaseServer()
  const { data: auth } = await userClient.auth.getUser()
  const user = auth?.user
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim()).filter(Boolean)

  if (!user || !allow.includes((user.email || '').toLowerCase())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = supabaseAdmin()

  // Owner für Storage-Pfad ermitteln
  const { data: row, error: selErr } = await admin
    .from('lack_requests')
    .select('owner_id')
    .eq('id', id)
    .maybeSingle()

  if (selErr) return NextResponse.json({ error: 'db error' }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const ownerId = row.owner_id as string
  const bucket = 'lack-requests'
  const prefix = `${ownerId}/${id}/`

  // Alle Dateien unter dem Prefix entfernen (rekursiv)
  async function removePrefix(pfx: string) {
    const { data: list, error: lerr } = await admin.storage.from(bucket).list(pfx, { limit: 1000, offset: 0 })
    if (lerr) console.warn('[admin delete] list failed', lerr.message)
    const paths = (list || []).map(e => `${pfx}${e.name}`)
    if (paths.length) {
      const { error: remErr } = await admin.storage.from(bucket).remove(paths)
      if (remErr) console.warn('[admin delete] remove failed', remErr.message)
    }
    for (const entry of list || []) {
      if (entry.name?.endsWith('/')) await removePrefix(`${pfx}${entry.name}`)
    }
  }
  await removePrefix(prefix)

  const { error: delErr } = await admin.from('lack_requests').delete().eq('id', id)
  if (delErr) return NextResponse.json({ error: 'db delete failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
