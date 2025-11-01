import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'missing_id' }, { status: 400 })
    }

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const admin = supabaseAdmin()
    const { data: order, error } = await admin
      .from('orders')
      .select('id, kind, supplier_id, released_at')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (order.kind !== 'lack') return NextResponse.json({ error: 'wrong_kind' }, { status: 400 })
    if (order.supplier_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!order.released_at) return NextResponse.json({ error: 'not_released' }, { status: 409 })

    // Rechnung erzeugen/finden (idempotent)
    const result = await ensureInvoiceForOrder(order.id)
    const pdfPath = result?.pdf_path
    if (!pdfPath) {
      return NextResponse.json({ error: 'pdf_path_missing' }, { status: 500 })
    }

    // signierte URL (10 Minuten)
    const { data: signed, error: sErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(pdfPath, 600)

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    if (!signed?.signedUrl) {
      return NextResponse.json({ error: 'signed_url_failed' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      invoiceId: result.id,
      number: result.number,
      pdf_path: pdfPath,
      url: signed.signedUrl,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
