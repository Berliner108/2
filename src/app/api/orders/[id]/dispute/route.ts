import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    const { reason } = await req.json().catch(() => ({} as { reason?: string }))

    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const nowIso = new Date().toISOString()

    // Nur Käufer darf reklamieren; Bestellung darf noch nicht freigegeben sein
    const payload: Record<string, any> = { dispute_opened_at: nowIso }
    if (typeof reason === 'string' && reason.trim()) {
      payload.dispute_reason = reason.trim()
    }

    const { data: updated, error } = await sb
      .from('orders')
      .update(payload)
      .eq('id', id)
      .eq('kind', 'lack')
      .eq('buyer_id', user.id)    // nur der Käufer
      .is('released_at', null)
      .select('id, request_id')
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Reklamation unzulässig (evtl. schon freigegeben?)' }, { status: 409 })
    }

    // ---- lack_requests.data.disputed_at setzen (idempotent) ----
    const admin = supabaseAdmin()
    const reqId = updated[0].request_id
    let rpcWorked = false

    // A) Versuch via RPC
    try {
      const { error: rpcErr } = await admin.rpc('jsonb_set_deep', {
        table_name: 'lack_requests',
        row_id: reqId,
        path: ['data', 'disputed_at'],
        value: nowIso,
      })
      if (rpcErr) throw rpcErr
      rpcWorked = true
    } catch {
      // B) Fallback – klassisches Merge-Update
      try {
        const { data: reqRow, error: readErr } = await admin
          .from('lack_requests')
          .select('data')
          .eq('id', reqId)
          .maybeSingle()
        if (readErr) throw readErr

        const nextData = { ...(reqRow?.data || {}), disputed_at: nowIso }
        const { error: upErr } = await admin
          .from('lack_requests')
          .update({ data: nextData })
          .eq('id', reqId)
        if (upErr) throw upErr
      } catch (mergeErr) {
        console.error('[orders/dispute] lack_requests.data Merge fehlgeschlagen:', (mergeErr as any)?.message)
      }
    }

    return NextResponse.json({ ok: true, metaUpdatedVia: rpcWorked ? 'rpc' : 'merge' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
