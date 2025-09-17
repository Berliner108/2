// src/app/api/invoices/[id]/download/route.ts
import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureInvoiceForOrder } from '@/server/invoices'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // wichtig für pdfkit

function isAdminEmail(email?: string | null) {
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return !!(email && list.includes(email.toLowerCase()))
}

function fmtCents(c?: number|null) {
  if (c == null) return '—'
  return (c / 100).toFixed(2)
}
function yyyymm(dateStr?: string|null) {
  const d = dateStr ? new Date(dateStr) : new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  return { y, m }
}

async function buildInvoicePdfBuffer(inv: any): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))))

  const cur = String(inv.currency || 'EUR').toUpperCase()
  doc.font('Helvetica')

  doc.fontSize(18).text(`Rechnung ${inv.number ?? inv.id}`)
  doc.moveDown()
  doc.fontSize(12)
  doc.text(`Ausgestellt: ${(inv.issued_at ?? inv.created_at ?? '').slice(0,10)}`)
  doc.text(`Order-ID: ${inv.order_id}`)
  doc.text(`Supplier: ${inv.supplier_id}`)
  doc.text(`Buyer: ${inv.buyer_id}`)
  if (inv.meta?.title) doc.text(`Titel: ${inv.meta.title}`)
  doc.moveDown()
  doc.text(`Gesamt (brutto): ${fmtCents(inv.total_gross_cents)} ${cur}`)
  if (inv.fee_cents != null) doc.text(`Gebühr: ${fmtCents(inv.fee_cents)} ${cur}`)
  if (inv.net_payout_cents != null) doc.text(`Auszahlung (netto): ${fmtCents(inv.net_payout_cents)} ${cur}`)
  if (inv.payout_cents != null) doc.text(`Auszahlung: ${fmtCents(inv.payout_cents)} ${cur}`)
  const fb = inv.meta?.fee_breakdown
  if (fb) {
    doc.moveDown().text('Gebührenaufschlüsselung:')
    doc.text(`  MwSt-Satz: ${fb.vat_rate ?? '—'} %`)
    doc.text(`  Netto: ${fmtCents(fb.net_cents)} ${cur}`)
    doc.text(`  MwSt: ${fmtCents(fb.vat_cents)} ${cur}`)
  }

  doc.end()
  return done
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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

    // 1) Rechnung per ID oder order_id holen
    const byId = await admin.from('platform_invoices').select('*').eq('id', id).maybeSingle()
    let invoice = !byId.error ? byId.data : null

    if (!invoice) {
      const byOrder = await admin.from('platform_invoices').select('*').eq('order_id', id).maybeSingle()
      if (!byOrder.error) invoice = byOrder.data
    }

    // 2) Falls nicht vorhanden: per Order erzeugen (idempotent)
    if (!invoice) {
      const ord = await admin.from('orders').select('id, supplier_id, released_at, kind').eq('id', id).maybeSingle()
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
      const again = await admin.from('platform_invoices').select('*').eq('order_id', order.id).maybeSingle()
      if (again.error || !again.data) {
        return NextResponse.json({ error: again.error?.message || 'not found' }, { status: 404 })
      }
      invoice = again.data
    }

    // Zugriff prüfen (Seller/Admin). Optional: buyer erlauben -> || invoice.buyer_id === user.id
    const sellerId: string | undefined = invoice?.seller_id ?? invoice?.supplier_id
    if (!isAdmin && sellerId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // 3) Falls kein PDF: jetzt erzeugen, hochladen, pfad speichern
    if (!invoice.pdf_path) {
      const { y, m } = yyyymm(invoice.issued_at ?? invoice.created_at)
      const base = sellerId || 'unknown-seller'
      const fileName = `${invoice.number ?? invoice.id}.pdf`
      const path = `${base}/${y}/${m}/${fileName}`

      const pdfBuffer = await buildInvoicePdfBuffer(invoice)

      const up = await admin.storage.from('invoices')
        .upload(path, pdfBuffer, { contentType: 'application/pdf', upsert: true })
      if (up.error) {
        return NextResponse.json({ error: 'upload_failed', details: up.error.message }, { status: 500 })
      }

      const upd = await admin.from('platform_invoices')
        .update({ pdf_path: path })
        .eq('id', invoice.id)
        .select('pdf_path')
        .single()
      if (upd.error) {
        return NextResponse.json({ error: 'db_update_failed', details: upd.error.message }, { status: 500 })
      }
      invoice.pdf_path = upd.data.pdf_path
    }

    // 4) Signierte URL liefern
    const signed = await admin.storage.from('invoices').createSignedUrl(
      invoice.pdf_path, 60, { download: `${invoice.number || 'invoice'}.pdf` }
    )
    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json({ error: signed.error?.message || 'signing failed' }, { status: 500 })
    }
    return NextResponse.redirect(signed.data.signedUrl)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
