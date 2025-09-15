import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()

    const { data: order, error: oErr } = await admin
      .from('orders')
      .select('id, supplier_id, request_id, status')
      .eq('id', orderId)
      .maybeSingle()
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 400 })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.supplier_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'funds_held') {
      return NextResponse.json({ error: 'Order not in funds_held' }, { status: 400 })
    }

    // auto_release in 28 Tagen
    const now = Date.now()
    const autoReleaseAt = new Date(now + 28 * 24 * 60 * 60 * 1000).toISOString()
    const isoNow = new Date(now).toISOString()

    // Order markieren
    const upd = await admin
      .from('orders')
      .update({ auto_release_at: autoReleaseAt, updated_at: isoNow })
      .eq('id', orderId)
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 })

    // Versuche optionales RPC (falls vorhanden), sonst Fallback
    // HINWEIS: rpc() ist ein Builder – kein .catch() daran!
    const rpcRes = await admin.rpc('jsonb_set_now_if_table_has_data', {
      // falls deine Funktion Parameter erwartet, hier einsetzen
      // z.B.: request_id: order.request_id
    })

    if (rpcRes.error) {
      // Fallback: JSON spalten-sicher updaten (vorher lesen, dann mergen)
      const { data: reqRow, error: rErr } = await admin
        .from('lack_requests')
        .select('data')
        .eq('id', order.request_id)
        .maybeSingle()

      if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 })

      const mergedData = { ...(reqRow?.data ?? {}), shipped_at: isoNow }

      const upReq = await admin
        .from('lack_requests')
        .update({ data: mergedData as any, updated_at: isoNow })
        .eq('id', order.request_id)

      if (upReq.error) return NextResponse.json({ error: upReq.error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
