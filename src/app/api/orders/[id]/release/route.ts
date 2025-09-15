// /src/app/api/orders/[id]/release/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureInvoiceForOrder } from '@/server/invoices' // erzeugt/holt PDF & speichert im Storage

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const orderId = id
    if (!orderId) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const nowIso = new Date().toISOString()
    const { error: upErr } = await sb
      .from('orders')
      .update({ released_at: nowIso })
      .eq('id', orderId)
      .eq('kind', 'lack')
      .eq('buyer_id', user.id)
      .is('released_at', null)

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

    // --- Rechnungs-PDF für den Verkäufer erzeugen (idempotent) ---
    // Falls schon vorhanden, wird nichts doppelt angelegt.
    let invoiceUrl: string | undefined
    try {
      const { pdf_path } = await ensureInvoiceForOrder(orderId)

      // signierte URL für den Direktdownload (10 Minuten gültig)
      const admin = supabaseAdmin()
      const signed = await admin.storage.from('invoices').createSignedUrl(pdf_path, 600)
      if ('error' in signed && signed.error) {
        console.error('[release] signed url failed:', signed.error)
      } else {
        invoiceUrl = (signed as any).signedUrl
      }
    } catch (err) {
      // Fehler bei der Rechnung soll den Release nicht blockieren
      console.error('[release] invoice generation failed:', err)
    }

    return NextResponse.json({ ok: true, invoiceUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
