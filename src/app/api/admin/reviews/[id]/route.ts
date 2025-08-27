// src/app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sb = await supabaseServer()

    // 1) Auth
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // 2) Admin-Check (RLS-Policy rev_delete_admin greift zusätzlich)
    const { data: prof, error: pErr } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 })
    if (!prof || (prof.role !== 'admin' && prof.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3) Löschen
    const { data, error } = await sb
      .from('reviews')
      .delete()
      .eq('id', params.id)
      .select('id') // returning
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, deleted: data?.length ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete review' }, { status: 500 })
  }
}
