// /api/orders/[id]/dispute/route.ts  (kurz gehärtet)
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime  = 'nodejs'

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

    // nur Käufer, nur solange funds_held, nicht released/refunded
    const { data: updated, error } = await sb
      .from('orders')
      .update({ dispute_opened_at: nowIso, updated_at: nowIso /* dispute_reason nur wenn Spalte existiert */ })
      .eq('id', id)
      .eq('kind', 'lack')
      .eq('buyer_id', user.id)
      .eq('status', 'funds_held')
      .is('released_at', null)
      .is('refunded_at', null)
      .select('id, request_id')
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: 'Reklamation unzulässig' }, { status: 409 })
    }

    const admin = supabaseAdmin()
    const reqId = updated[0].request_id

    // Flag, damit cron/auto-release aussetzt
    try {
      const { data: reqRow } = await admin.from('lack_requests').select('data').eq('id', reqId).maybeSingle()
      const nextData = { ...(reqRow?.data || {}), disputed_at: nowIso, dispute_reason: (reason || undefined) }
      await admin.from('lack_requests').update({ data: nextData, status: 'mediated', updated_at: nowIso }).eq('id', reqId)
    } catch (e) {
      console.error('[orders/dispute] meta update failed', (e as any)?.message)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
