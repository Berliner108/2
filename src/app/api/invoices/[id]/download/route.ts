// src/app/api/invoices/[id]/download/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const dynamic = 'force-dynamic'

function isAdminEmail(email?: string | null) {
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return !!(email && list.includes(email.toLowerCase()))
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // <-- WICHTIG: params awaiten (Next.js-Anforderung)
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const isAdmin = isAdminEmail(user.email)

    // 1) Versuche: Invoice direkt per ID
    let invoice: any = null
    {
      const q = await admin
        .from('platform_invoices')
        .select('*')                // robust ggü. Schema-Varianten
        .eq('id', id)
        .maybeSingle()
      if (!q.error) invoice = q.data
    }

    // 2) Falls nicht gefunden: versuche per order_id
    if (!invoice) {
      const q2 = await admin
        .from('platform_invoices')
        .select('*')
        .eq('order_id', id)
        .maybeSingle()
      if (!q2.error) invoice = q2.data
    }

    // 3) Wenn immer noch nichts: checke Order und erzeuge Rechnung, falls möglich
    if (!invoice) {
      const ord = await admin
        .from('orders')
        .select('id, supplier_id, released_at, kind')
        .eq('id', id)
        .maybeSingle()

      if (ord.error)  return NextResponse.json({ error: ord.error.message }, { status: 500 })
      const order = ord.data
      if (!order)    return NextResponse.json({ error: 'not found' }, { status: 404 })

      // Zugriff nur Seller oder Admin
      if (!isAdmin && order.supplier_id !== user.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      // Nur wenn released -> Rechnung erzeugen
      if (!order.released_at) {
        return NextResponse.json({ error: 'invoice not available yet' }, { status: 409 })
      }

      // Rechnung idempotent erzeugen
      const gen = await ensureInvoiceForOrder(order.id)
      if ((gen as any)?.error) {
        return NextResponse.json({ error: (gen as any).error }, { status: 500 })
      }

      // Danach erneut holen (per order_id)
      const again = await admin
        .from('platform_invoices')
        .select('*')
        .eq('order_id', order.id)
        .maybeSingle()
      if (again.error || !again.data) {
        return NextResponse.json({ error: again.error?.message || 'not found' }, { status: 404 })
      }
      invoice = again.data
    }

    // Seller-ID robust auslesen (Schema-Variante beachten)
    const sellerId: string | undefined =
      invoice?.seller_id ?? invoice?.supplier_id

    if (!isAdmin && sellerId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    if (!invoice?.pdf_path) {
      return NextResponse.json({ error: 'missing pdf_path' }, { status: 500 })
    }

    // Signierte URL
    const signed = await admin.storage
      .from('invoices')
      .createSignedUrl(invoice.pdf_path, 60, {
        download: `${invoice.number || 'invoice'}.pdf`,
      })

    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json({ error: signed.error?.message || 'signing failed' }, { status: 500 })
    }

    return NextResponse.redirect(signed.data.signedUrl)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
