// src/app/api/invoices/[id]/download/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // wichtig: Serverless-Node für PDF/FS

function isAdminEmail(email?: string | null) {
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return !!(email && list.includes(email.toLowerCase()))
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()
    const isAdmin = isAdminEmail(user.email)

    // 1) Invoice per ID oder order_id holen
    let invoice: any = null
    {
      const q = await admin.from('platform_invoices').select('*').eq('id', id).maybeSingle()
      if (!q.error && q.data) invoice = q.data
    }
    if (!invoice) {
      const q2 = await admin.from('platform_invoices').select('*').eq('order_id', id).maybeSingle()
      if (!q2.error && q2.data) invoice = q2.data
    }

    // 2) Falls gar keine Invoice existiert -> Order prüfen & erzeugen
    if (!invoice) {
      const ord = await admin
        .from('orders')
        .select('id, supplier_id, released_at, kind')
        .eq('id', id)
        .maybeSingle()
      if (ord.error)  return NextResponse.json({ error: ord.error.message }, { status: 500 })
      const order = ord.data
      if (!order)     return NextResponse.json({ error: 'not found' }, { status: 404 })

      if (!isAdmin && order.supplier_id !== user.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
      if (!order.released_at) {
        return NextResponse.json({ error: 'invoice not available yet' }, { status: 409 })
      }

      const gen = await ensureInvoiceForOrder(order.id)
      if ((gen as any)?.error) {
        return NextResponse.json({ error: (gen as any).error }, { status: 500 })
      }

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

    // 3) Zugriff prüfen (Seller/Admin). Optional: Buyer erlauben -> || invoice.buyer_id === user.id
    const sellerId: string | undefined = invoice?.seller_id ?? invoice?.supplier_id
    if (!isAdmin && sellerId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Helper zum Signieren + optionales Rebuild, wenn Objekt fehlt
    async function signOrRebuildAndSign(inv: any): Promise<string> {
      const trySign = async () => {
        const r = await admin.storage
          .from('invoices')
          .createSignedUrl(inv.pdf_path, 600, { download: `${inv.number || 'invoice'}.pdf` })
        if (r.error || !r.data?.signedUrl) throw new Error(r.error?.message || 'signing failed')
        return r.data.signedUrl
      }

      // a) Wenn Pfad vorhanden: versuchen zu signieren
      if (inv.pdf_path) {
        try {
          return await trySign()
        } catch (e: any) {
          // Wenn Objekt fehlt (z. B. gelöscht), neu erzeugen
          // -> ensureInvoiceForOrder liefert idempotent; danach pdf_path neu laden
        }
      }

      // b) (Neu-)Erzeugen
      const orderId = inv.order_id ?? id
      const gen = await ensureInvoiceForOrder(orderId)
      if ((gen as any)?.error) throw new Error((gen as any).error)

      // c) pdf_path frisch laden
      const ref = await admin
        .from('platform_invoices')
        .select('pdf_path, number')
        .eq('id', inv.id)
        .maybeSingle()
      if (ref.error || !ref.data?.pdf_path) {
        throw new Error(ref.error?.message || 'pdf_path_missing_after_generation')
      }
      inv.pdf_path = ref.data.pdf_path
      inv.number = inv.number || ref.data.number

      // d) signieren
      return await trySign()
    }

    const url = await signOrRebuildAndSign(invoice)
    return NextResponse.redirect(url)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
