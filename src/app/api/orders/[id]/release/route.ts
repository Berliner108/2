// /src/app/api/orders/[id]/release/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getStripe } from '@/lib/stripe'

type Params = { params: { id: string } }

export async function POST(_req: Request, { params }: Params) {
  try {
    const orderId = params.id
    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Order lesen + prüfen
    const { data: ord, error: ordErr } = await sb
      .from('orders')
      .select('id, buyer_id, supplier_id, amount_cents, fee_cents, currency, status, charge_id, transfer_id, released_at, refunded_at')
      .eq('id', orderId)
      .maybeSingle()

    if (ordErr)  return NextResponse.json({ error: ordErr.message }, { status: 400 })
    if (!ord)    return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (ord.buyer_id !== user.id) {
      return NextResponse.json({ error: 'Not your order' }, { status: 403 })
    }
    if (ord.refunded_at) {
      return NextResponse.json({ error: 'Order refunded' }, { status: 400 })
    }
    if (ord.transfer_id || ord.released_at) {
      return NextResponse.json({ error: 'Already released' }, { status: 400 })
    }
    if (ord.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not succeeded yet' }, { status: 400 })
    }

    // Lieferant Connect-Konto
    const admin = supabaseAdmin()
    const { data: supplier, error: supErr } = await admin
      .from('profiles')
      .select('id, stripe_connect_id, payment_method, role')
      .eq('id', ord.supplier_id)
      .maybeSingle()

    if (supErr) return NextResponse.json({ error: supErr.message }, { status: 400 })
    if (!supplier?.stripe_connect_id) {
      return NextResponse.json({ error: 'Supplier has no connected Stripe account' }, { status: 400 })
    }

    const netCents = Math.max(0, (ord.amount_cents || 0) - (ord.fee_cents || 0))
    if (netCents <= 0) {
      return NextResponse.json({ error: 'Net amount is zero' }, { status: 400 })
    }

    // Transfer an Lieferanten (separate charges & transfers)
    const transfer = await stripe.transfers.create({
      amount: netCents,
      currency: (ord.currency || 'EUR').toLowerCase(),
      destination: supplier.stripe_connect_id,
      metadata: {
        order_id: String(ord.id),
        supplier_id: String(ord.supplier_id),
        buyer_id: String(ord.buyer_id),
      },
    })

    // Order aktualisieren
    const { error: updErr } = await admin
      .from('orders')
      .update({
        transfer_id: transfer.id,
        transferred_cents: netCents,
        released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updErr) {
      // (Optional) Rollback des Transfers ist bei Stripe nicht möglich; im Fehlerfall loggen.
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, transferId: transfer.id })
  } catch (err: any) {
    console.error('[orders release] fatal', err)
    return NextResponse.json({ error: err?.message || 'Release failed' }, { status: 500 })
  }
}
