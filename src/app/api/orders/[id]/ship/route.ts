import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const DAYS = 28

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const now = new Date()
    const autoRelease = new Date(now.getTime() + DAYS * 86400_000)

    const { data, error } = await sb
      .from('orders')
      .update({
        shipped_at: now.toISOString(),
        reported_at: now.toISOString(),
        auto_release_at: autoRelease.toISOString(),
      })
      .eq('id', id)
      .eq('kind', 'lack')
      .eq('supplier_id', user.id)
      .is('released_at', null)
      .is('reported_at', null)
      .select('id')   // <- damit sehen wir, ob was geändert wurde
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Bereits gemeldet oder unzulässig' }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
