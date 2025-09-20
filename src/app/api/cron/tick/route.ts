// /src/app/api/cron/tick/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATCH = 200
const SEVEN_D_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: Request) {
  // Optional: nur von Vercel-Cron zulassen
  if (process.env.REQUIRE_CRON_HEADER === '1') {
    const isCron = req.headers.get('x-vercel-cron') === '1'
    if (!isCron) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = supabaseAdmin()
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const now = Date.now()
  const sevenDaysAgoISO = new Date(now - SEVEN_D_MS).toISOString()

  // ===== 1) AUTO-REFUND (kein Versand in 7 Tagen)
  try {
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      const { data: rows, error } = await admin
        .from('orders')
        .select('id, created_at, charge_id, request_id')
        .eq('status', 'funds_held')
        .is('shipped_at', null)
        .not('charge_id', 'is', null)
        .lt('created_at', sevenDaysAgoISO)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('[cron] auto-refund page error:', error.message)
        break
      }
      if (!rows || rows.length === 0) break

      const toCancelReqIds = new Set<string>()

      for (const r of rows) {
        try {
          await stripe.refunds.create({
            charge: r.charge_id as string,
            metadata: { order_id: String(r.id), reason: 'auto_no_shipment' },
          })

          await admin.from('orders').update({
            refunded_at: new Date().toISOString(),
            status: 'canceled',
            updated_at: new Date().toISOString(),
          }).eq('id', r.id)

          if (r.request_id) toCancelReqIds.add(String(r.request_id))
        } catch (e: any) {
          console.error('[cron] auto-refund failed', r.id, e?.message)
        }
      }

      if (toCancelReqIds.size > 0) {
        try {
          await admin.from('lack_requests').update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          }).in('id', Array.from(toCancelReqIds))
        } catch (e: any) {
          console.error('[cron] mark lack_requests cancelled failed:', e?.message)
        }
      }

      if (rows.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cron] auto-refund outer failed:', e?.message)
  }

  // ===== 2) AUTO-RELEASE (Frist abgelaufen, kein Dispute)
  try {
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      const { data: rows, error } = await admin
        .from('orders')
        .select('id, amount_cents, fee_cents, currency, charge_id, supplier_id, request_id, auto_release_at')
        .eq('status', 'funds_held')
        .not('charge_id', 'is', null)
        .lte('auto_release_at', new Date().toISOString())
        .order('auto_release_at', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('[cron] auto-release page error:', error.message)
        break
      }
      if (!rows || rows.length === 0) break

      // Dispute-Flags prefetchen
      const reqIds = Array.from(new Set(rows.map(r => String(r.request_id)).filter(Boolean)))
      let disputedMap = new Map<string, boolean>()
      if (reqIds.length) {
        const { data: reqs, error: reqErr } = await admin
          .from('lack_requests')
          .select('id, data')
          .in('id', reqIds)
        if (reqErr) {
          console.error('[cron] auto-release req fetch error:', reqErr.message)
        } else {
          for (const r of reqs ?? []) {
            const flag = !!((r?.data as any)?.disputed_at)
            disputedMap.set(String(r.id), flag)
          }
        }
      }

      for (const r of rows) {
        try {
          if (disputedMap.get(String(r.request_id)) === true) continue

          const { data: prof } = await admin
            .from('profiles')
            .select('stripe_connect_id')
            .eq('id', r.supplier_id)
            .maybeSingle()
          const destination = prof?.stripe_connect_id as string | undefined
          if (!destination) continue

          const fee = Number.isFinite(r.fee_cents) ? Number(r.fee_cents) : Math.round(Number(r.amount_cents) * 0.07)
          const sellerAmount = Math.max(0, Number(r.amount_cents) - fee)

          const tr = await stripe.transfers.create({
            amount: sellerAmount,
            currency: (r.currency || 'eur').toLowerCase(),
            destination,
            source_transaction: r.charge_id as string,
            transfer_group: `order_${r.id}`,
            metadata: { order_id: String(r.id), role: 'auto_release' },
          })

          await admin.from('orders').update({
            transfer_id: tr.id,
            transferred_cents: sellerAmount,
            status: 'released',
            released_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', r.id)

          await admin.from('lack_requests').update({
            status: 'paid',
            updated_at: new Date().toISOString(),
          }).eq('id', r.request_id)
        } catch (e: any) {
          console.error('[cron] auto-release failed', r.id, e?.message)
        }
      }

      if (rows.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cron] auto-release outer failed:', e?.message)
  }

  return NextResponse.json({ ok: true })
}
