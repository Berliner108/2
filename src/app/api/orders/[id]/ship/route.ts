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
    const autoRelease = new Date(now.getTime() + DAYS * 86400_000)

    // Verkäufer markiert „Versandt“ (nur wenn noch nicht gemeldet & nicht freigegeben)
    const { data: updated, error } = await sb
      .from('orders')
      .update({
        shipped_at: now.toISOString(),
        reported_at: now.toISOString(),
        auto_release_at: autoRelease.toISOString(),
      })
      .eq('id', id)
      .eq('kind', 'lack')
      .eq('supplier_id', user.id)      // nur der Verkäufer
      .is('released_at', null)
      .is('reported_at', null)
      .select('id, request_id')
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Bereits gemeldet oder unzulässig' }, { status: 409 })
    }

    // ---- lack_requests.data.shipped_at setzen (idempotent) ----
    const admin = supabaseAdmin()
    const reqId = updated[0].request_id
    const shippedIso = now.toISOString()

    // A) Versuche RPC (falls du die Funktion jsonb_set_deep bereitgestellt hast)
    let rpcWorked = false
    try {
      const { error: rpcErr } = await admin.rpc('jsonb_set_deep', {
        table_name: 'lack_requests',
        row_id: reqId,
        path: ['data', 'shipped_at'],
        value: shippedIso,
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

        const nextData = { ...(reqRow?.data || {}), shipped_at: shippedIso }
        const { error: upErr } = await admin
          .from('lack_requests')
          .update({ data: nextData })
          .eq('id', reqId)
        if (upErr) throw upErr
      } catch (mergeErr) {
        // Fehler hier blockiert die Antwort nicht mehr (Versandmeldung ist schon gesetzt)
        console.error('[orders/ship] lack_requests.data Merge fehlgeschlagen:', (mergeErr as any)?.message)
      }
    }

    return NextResponse.json({ ok: true, metaUpdatedVia: rpcWorked ? 'rpc' : 'merge' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
