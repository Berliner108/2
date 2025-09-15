import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request) {
  try {
    const { searchParams } = new URL(_req.url)
    const orderId = searchParams.get('id')
    if (!orderId) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const admin = supabaseAdmin()
    const { data: o, error } = await admin
      .from('orders')
      .select('id,buyer_id,supplier_id,amount_cents,fee_cents,currency,status,created_at,request_id,auto_release_at,released_at,refunded_at,transfer_id,charge_id')
      .eq('id', orderId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!o)    return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isBuyer    = o.buyer_id === user.id
    const isSupplier = o.supplier_id === user.id
    if (!isBuyer && !isSupplier) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ order: o, isBuyer, isSupplier })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
