// /src/app/api/orders/[id]/ship/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Auto-Release Frist (28 Tage) */
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
    const nowIso = now.toISOString()
    const autoRelease = new Date(now.getTime() + DAYS * 86400_000).toISOString()

    // Verkäufer markiert „Versandt“
    const { data: updated, error } = await sb
      .from('orders')
      .update({
        shipped_at: nowIso,
        reported_at: nowIso,
        auto_release_at: autoRelease,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('kind', 'lack')
      .eq('supplier_id', user.id)      // nur der Verkäufer selbst
      .eq('status', 'funds_held')      // nur solange Gelder gehalten werden
      .is('released_at', null)         // nicht schon freigegeben
      .is('refunded_at', null)         // nicht schon erstattet
      .is('reported_at', null)         // nicht bereits gemeldet
      .select('id, request_id')
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Bereits gemeldet oder unzulässig' }, { status: 409 })
    }

    // ---- lack_requests.data.{shipped_at,reported_at} setzen (idempotent) ----
    const admin = supabaseAdmin()
    const reqId = updated[0].request_id

    let rpcWorked = false
    try {
      const { error: rpcErr } = await admin.rpc('jsonb_set_deep', {
        table_name: 'lack_requests',
        row_id: reqId,
        path: ['data', 'shipped_at'],
        value: nowIso,
      })
      if (rpcErr) throw rpcErr
      const { error: rpcErr2 } = await admin.rpc('jsonb_set_deep', {
        table_name: 'lack_requests',
        row_id: reqId,
        path: ['data', 'reported_at'],
        value: nowIso,
      })
      if (rpcErr2) throw rpcErr2
      rpcWorked = true
    } catch {
      try {
        const { data: reqRow, error: readErr } = await admin
          .from('lack_requests')
          .select('data')
          .eq('id', reqId)
          .maybeSingle()
        if (readErr) throw readErr

        const nextData = { ...(reqRow?.data || {}), shipped_at: nowIso, reported_at: nowIso }
        const { error: upErr } = await admin
          .from('lack_requests')
          .update({ data: nextData, updated_at: nowIso })
          .eq('id', reqId)
        if (upErr) throw upErr
      } catch (mergeErr) {
        console.error('[orders/ship] lack_requests.data Merge fehlgeschlagen:', (mergeErr as any)?.message)
      }
    }

    return NextResponse.json({ ok: true, metaUpdatedVia: rpcWorked ? 'rpc' : 'merge' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
