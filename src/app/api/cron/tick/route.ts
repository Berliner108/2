// /src/app/api/cron/tick/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATCH = 200
const SEVEN_D_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(req: Request) {
  // optional: nur Vercel-Cron zulassen
  if (process.env.REQUIRE_CRON_HEADER === '1') {
    const isCron = req.headers.get('x-vercel-cron') === '1'
    if (!isCron) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const admin = supabaseAdmin()
  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

  const now = Date.now()
  const nowISO = new Date(now).toISOString()
  const sevenDaysAgoISO = new Date(now - SEVEN_D_MS).toISOString()

  const stats = {
    autoRefund: { pages: 0, picked: 0, ok: 0, fail: 0 },
    autoRelease: { pages: 0, picked: 0, ok: 0, fail: 0 },
    ts: nowISO,
  }

  // ===== 1) AUTO-REFUND (kein Versand bis auto_refund_at; Fallback: 7 Tage)
  try {
    let page = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      // Pass A: auto_refund_at überschritten
      const { data: aRows, error: aErr } = await admin
        .from('orders')
        .select('id, created_at, charge_id, request_id, auto_refund_at')
        .eq('status', 'funds_held')
        .is('refunded_at', null)      // wichtig: nur nicht-erstattete
        .is('shipped_at', null)
        .is('transfer_id', null)
        .not('charge_id', 'is', null)
        .lte('auto_refund_at', nowISO)
        .order('auto_refund_at', { ascending: true })
        .range(from, to)

      if (aErr) { console.error('[cron] auto-refund A page error:', aErr.message); break }

      // Pass B: alte Orders ohne auto_refund_at -> 7 Tage seit Erstellung
      const { data: bRows, error: bErr } = await admin
        .from('orders')
        .select('id, created_at, charge_id, request_id, auto_refund_at')
        .eq('status', 'funds_held')
        .is('refunded_at', null)      // wichtig: nur nicht-erstattete
        .is('auto_refund_at', null)
        .is('shipped_at', null)
        .is('transfer_id', null)
        .not('charge_id', 'is', null)
        .lt('created_at', sevenDaysAgoISO)
        .order('created_at', { ascending: true })
        .range(from, to)

      if (bErr) { console.error('[cron] auto-refund B page error:', bErr.message); break }

      const rows = [...(aRows ?? []), ...(bRows ?? [])]
      if (!rows.length) break

      stats.autoRefund.pages++
      stats.autoRefund.picked += rows.length
      console.log('[cron] auto-refund batch', { page, a: aRows?.length || 0, b: bRows?.length || 0 })

      const toCancelReqIds = new Set<string>()

      for (const r of rows) {
        try {
          await stripe.refunds.create(
            {
              charge: r.charge_id as string,
              metadata: { order_id: String(r.id), reason: 'auto_no_shipment' },
            },
            { idempotencyKey: `auto-refund:${r.id}` } // idempotent
          )

          await admin.from('orders').update({
            refunded_at: nowISO,
            status: 'canceled',
            dispute_opened_at: nowISO,          // optional: für Protokoll/UI
            dispute_reason: 'NO_SHIPMENT_TIMEOUT',
            updated_at: nowISO,
          }).eq('id', r.id)

          if (r.request_id) toCancelReqIds.add(String(r.request_id))
          stats.autoRefund.ok++
        } catch (e: any) {
          stats.autoRefund.fail++
          console.error('[cron] auto-refund failed', r.id, e?.message)
        }
      }

      if (toCancelReqIds.size > 0) {
        try {
          await admin.from('lack_requests').update({
            status: 'cancelled',
            updated_at: nowISO,
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

  // ===== 2) AUTO-RELEASE (Frist abgelaufen, kein Dispute) + Rechnung
  try {
    let page = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      const { data: rows, error } = await admin
        .from('orders')
        .select('id, amount_cents, fee_cents, currency, charge_id, supplier_id, request_id, auto_release_at')
        .eq('status', 'funds_held')
        .is('transfer_id', null)
        .not('charge_id', 'is', null)
        .lte('auto_release_at', nowISO)
        .is('dispute_opened_at', null) // KEIN Dispute
        .order('auto_release_at', { ascending: true })
        .range(from, to)

      if (error) { console.error('[cron] auto-release page error:', error.message); break }
      if (!rows || rows.length === 0) break

      stats.autoRelease.pages++
      stats.autoRelease.picked += rows.length
      console.log('[cron] auto-release batch', { page, rows: rows.length })

      for (const r of rows) {
        try {
          // Ziel-Konto (Connect) bestimmen
          const { data: prof } = await admin
            .from('profiles')
            .select('stripe_connect_id')
            .eq('id', r.supplier_id)
            .maybeSingle()
          const destination = prof?.stripe_connect_id as string | undefined
          if (!destination) { console.warn('[cron] auto-release: missing destination', r.id); continue }

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
            released_at: nowISO,
            updated_at: nowISO,
          }).eq('id', r.id)

          await admin.from('lack_requests').update({
            status: 'paid', // published bleibt unverändert (false)
            updated_at: nowISO,
          }).eq('id', r.request_id)

          try {
            await ensureInvoiceForOrder(r.id) // idempotent
          } catch (invErr: any) {
            console.error('[cron] ensureInvoiceForOrder failed', r.id, invErr?.message)
          }

          stats.autoRelease.ok++
        } catch (e: any) {
          stats.autoRelease.fail++
          console.error('[cron] auto-release failed', r.id, e?.message)
        }
      }

      if (rows.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cron] auto-release outer failed:', e?.message)
  }

  return NextResponse.json({ ok: true, ...stats })
}
