import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SEVEN_D = 7*24*60*60*1000

export async function POST() {
  const admin = supabaseAdmin()
  const nowISO = new Date().toISOString()

  // 1) Auto-Refund: funds_held, kein „shipped_at“, älter als 7 Tage
  const { data: toRefund } = await admin
    .from('orders')
    .select('id, created_at, request_id, status')
    .eq('status', 'funds_held')

  const refundCandidates = (toRefund || []).filter(o => {
    const age = Date.now() - new Date(o.created_at).getTime()
    return age >= SEVEN_D
  })

  for (const o of refundCandidates) {
    // check shipped flag im Request
    const { data: req } = await admin
      .from('lack_requests')
      .select('id, data, status')
      .eq('id', o.request_id).maybeSingle()
    const shippedAt = (req?.data as any)?.shipped_at
    if (!shippedAt) {
      // auto refund
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/orders/refund`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: o.id, reason: 'no_shipment' }),
      }).catch(()=>{})
      // reopen request
      await admin.from('lack_requests').update({ status: 'open', published: true, updated_at: nowISO }).eq('id', o.request_id)
    }
  }

  // 2) Auto-Release: funds_held, auto_release_at <= now, nicht disputed
  const { data: toRelease } = await admin
    .from('orders')
    .select('id, auto_release_at, request_id, status')
    .eq('status', 'funds_held')

  for (const o of (toRelease || [])) {
    if (!o.auto_release_at) continue
    if (new Date(o.auto_release_at).getTime() > Date.now()) continue

    const { data: req } = await admin
      .from('lack_requests')
      .select('data')
      .eq('id', o.request_id).maybeSingle()
    const disputedAt = (req?.data as any)?.disputed_at
    if (disputedAt) continue

    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/orders/release`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: o.id }),
    }).catch(()=>{})
  }

  return NextResponse.json({ ok: true })
}
