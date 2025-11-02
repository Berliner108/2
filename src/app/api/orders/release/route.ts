// /src/app/api/orders/release/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const runtime = 'nodejs'
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
      .select('id, kind, buyer_id, supplier_id, amount_cents, fee_cents, currency, status, charge_id, transfer_id, request_id')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // (1) Nur Lack-Bestellungen freigeben
    if (order.kind !== 'lack') {
      return NextResponse.json({ error: 'Wrong order kind' }, { status: 400 })
    }

    // Nur Buyer — KEIN Admin-Bypass
    if (order.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // (2) Release blocken, falls Reklamation auf dem Request markiert ist
    const { data: reqRow } = await admin
      .from('lack_requests')
      .select('data, status')
      .eq('id', order.request_id)
      .maybeSingle()
    if (reqRow?.data?.disputed_at) {
      return NextResponse.json({ error: 'Order is disputed' }, { status: 409 })
    }

    if (order.status !== 'funds_held') {
      return NextResponse.json({ error: 'Order not in releasable state' }, { status: 400 })
    }
    if (!order.charge_id) return NextResponse.json({ error: 'Missing charge' }, { status: 400 })

    // Idempotenz: Transfer existiert schon?
    if (order.transfer_id) {
      let invoiceUrl: string | undefined
      try {
        const result = await ensureInvoiceForOrder(order.id)
        const pdfPath = (result as any)?.pdf_path as string | undefined
        if (pdfPath) {
          const { data: signed, error: sErr } = await admin.storage.from('invoices').createSignedUrl(pdfPath, 600)
          if (!sErr && signed?.signedUrl) invoiceUrl = signed.signedUrl
        }
      } catch { /* still ok, release already done */ }
      return NextResponse.json({ ok: true, transferId: order.transfer_id, invoiceUrl }, { status: 200 })
    }

    // Ziel-Konto (Connect)
    const { data: prof } = await admin
      .from('profiles')
      .select('stripe_connect_id')
      .eq('id', order.supplier_id)
      .maybeSingle()
    const destination = prof?.stripe_connect_id as string | undefined
    if (!destination) return NextResponse.json({ error: 'SELLER_NOT_CONNECTED' }, { status: 400 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const fee = Number.isFinite(order.fee_cents) ? Number(order.fee_cents) : Math.round(Number(order.amount_cents) * 0.07)
    const sellerAmount = Math.max(0, Number(order.amount_cents) - fee)

    // Transfer (separate charges & transfers)
    const tr = await stripe.transfers.create({
      amount: sellerAmount,
      currency: (order.currency || 'eur').toLowerCase(),
      destination,
      source_transaction: order.charge_id,
      transfer_group: `order_${order.id}`,
      metadata: { order_id: order.id, request_id: order.request_id, role: 'release' },
    })

    await admin.from('orders').update({
      transfer_id: tr.id,
      transferred_cents: sellerAmount,
      status: 'released',
      released_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)

    // (3) Request final auf paid – aber nur wenn noch nicht paid
    await admin.from('lack_requests').update({
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.request_id)
    .neq('status', 'paid')

    // Rechnung erzeugen (idempotent)
    let invoiceUrl: string | undefined
    try {
      const result = await ensureInvoiceForOrder(order.id)
      const pdfPath = (result as any)?.pdf_path as string | undefined
      if (pdfPath) {
        const { data: signed, error: sErr } = await admin.storage.from('invoices').createSignedUrl(pdfPath, 600)
        if (!sErr && signed?.signedUrl) invoiceUrl = signed.signedUrl
      }
    } catch (err) {
      console.error('[release] invoice generation failed:', err)
    }

    return NextResponse.json({ ok: true, transferId: tr.id, invoiceUrl }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Release failed' }, { status: 500 })
  }
}
