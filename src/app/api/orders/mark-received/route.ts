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
      .select('id, buyer_id')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.buyer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // einfach intern /release aufrufen
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/orders/release`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }),
    })
    const j = await res.json()
    if (!res.ok) return NextResponse.json(j, { status: res.status })
    return NextResponse.json(j, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
