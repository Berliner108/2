import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

    // PDF (idempotent) erzeugen/auffinden und signierte URL zurückgeben
    const { pdf_path } = await ensureInvoiceForOrder(order.id)
    const signed = await admin.storage.from('invoices').createSignedUrl(pdf_path, 600)
    if ('error' in signed && signed.error) {
      return NextResponse.json({ error: signed.error.message }, { status: 500 })
    }
    return NextResponse.json({ url: (signed as any).signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
