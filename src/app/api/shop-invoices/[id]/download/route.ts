import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureShopInvoiceForOrder } from '@/server/shop-invoices'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: Request, { params }: any) {
  try {
    const id = params?.id as string | undefined
    if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()

    // 1) shop_invoice per id oder shop_order_id suchen
    let inv: any = null
    const q1 = await admin.from('shop_invoices').select('*').eq('id', id).maybeSingle()
    if (!q1.error && q1.data) inv = q1.data

    if (!inv) {
      const q2 = await admin.from('shop_invoices').select('*').eq('shop_order_id', id).maybeSingle()
      if (!q2.error && q2.data) inv = q2.data
    }

    // 2) Wenn keine Invoice: prüfen ob Order released + seller, dann erzeugen
    if (!inv) {
      const { data: ord } = await admin
        .from('shop_orders')
        .select('id,status,released_at,seller_id')
        .eq('id', id)
        .maybeSingle()

      if (!ord) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      if (ord.seller_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      if (ord.status !== 'released' || !ord.released_at) {
        return NextResponse.json({ error: 'invoice_not_available' }, { status: 409 })
      }

      const gen = await ensureShopInvoiceForOrder(ord.id)
      if ((gen as any)?.skipped) return NextResponse.json({ error: 'invoice_not_available' }, { status: 409 })
      inv = gen
    }

    // 3) Zugriff: nur seller
    if (inv.seller_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!inv.pdf_path) return NextResponse.json({ error: 'pdf_path_missing' }, { status: 500 })

    // 4) Signed URL + Redirect (Download-Name)
    const { data: signed, error: sErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(inv.pdf_path, 600, { download: `${inv.number}.pdf` })

    if (sErr || !signed?.signedUrl) return NextResponse.json({ error: sErr?.message || 'sign_failed' }, { status: 500 })
    return NextResponse.redirect(signed.signedUrl)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
