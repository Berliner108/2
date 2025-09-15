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
    const { data: order } = await admin
      .from('orders')
      .select('id, supplier_id, request_id, status')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.supplier_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (order.status !== 'funds_held') return NextResponse.json({ error: 'Order not in funds_held' }, { status: 400 })

    // auto_release in 28 Tagen
    const autoReleaseAt = new Date(Date.now() + 28*24*60*60*1000).toISOString()

    await admin.from('orders').update({
      auto_release_at: autoReleaseAt,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId)

    // Markierung in Request.data (kein Enum-Wechsel nötig)
    // jsonb_set(data,'{shipped_at}','"2025-...Z"', true)
    await admin.rpc('jsonb_set_now_if_table_has_data', {  // Fallback ohne SQL-Fn:
      // wenn du keine RPC hast, einfache UPDATE:
    }).catch(async () => {
      await admin.from('lack_requests').update({
        data: { shipped_at: new Date().toISOString() } as any,
        updated_at: new Date().toISOString(),
      }).eq('id', order.request_id)
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
