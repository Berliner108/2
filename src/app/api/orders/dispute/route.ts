import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { orderId, reason } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: order } = await admin
      .from('orders')
      .select('id, buyer_id, request_id')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/orders/refund`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, reason }),
    })
    const j = await res.json()
    if (!res.ok) return NextResponse.json(j, { status: res.status })

    // Markierung in Request.data
    await admin.from('lack_requests').update({
      data: { disputed_at: new Date().toISOString() } as any,
      updated_at: new Date().toISOString(),
      status: 'mediated',
    }).eq('id', order.request_id)

    return NextResponse.json(j, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
