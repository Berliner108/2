import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    const { reason } = await req.json().catch(() => ({}))

    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const nowIso = new Date().toISOString()

    const payload: Record<string, any> = { dispute_opened_at: nowIso }
    // nur setzen, wenn die Spalte existiert – harmless, falls sie fehlt.
    if (typeof reason === 'string' && reason.trim()) {
      payload.dispute_reason = reason.trim()
    }

    const { data, error } = await sb
      .from('orders')
      .update(payload)
      .eq('id', id)
      .eq('kind', 'lack')
      .eq('buyer_id', user.id)
      .is('released_at', null)
      .select('id')
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Reklamation unzulässig (evtl. schon freigegeben?)' }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
