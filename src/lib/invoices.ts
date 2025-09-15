'use server'

import PDFDocument from 'pdfkit'
import { supabaseAdmin } from '@/lib/supabase-admin'

function pdfBuffer(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    build(doc as any)
    doc.end()
  })
}

const fmtEUR = (cents: number) =>
  (cents / 100).toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })

export async function generatePlatformInvoice(orderId: string) {
  const sb = supabaseAdmin()

  // idempotent
  const { data: existing } = await sb
    .from('platform_invoices')
    .select('id, number, pdf_path')
    .eq('order_id', orderId)
    .maybeSingle()
  if (existing) return existing

  // Order + Offer + Request + Snapshot laden
  const { data: order } = await sb
    .from('orders')
    .select('id, kind, buyer_id, supplier_id, offer_id, request_id, amount_cents, currency, created_at')
    .eq('id', orderId)
    .eq('kind', 'lack')
    .maybeSingle()
  if (!order) throw new Error('Order not found')

  const { data: offer } = await sb
    .from('lack_offers')
    .select('item_amount_cents, shipping_cents')
    .eq('id', order.offer_id)
    .maybeSingle()

  const { data: snap } = await sb
    .from('offer_profile_snapshots')
    .select('snapshot')
    .eq('offer_id', order.offer_id)
    .maybeSingle()

  const { data: req } = await sb
    .from('lack_requests')
    .select('id, title, lieferdatum, data')
    .eq('id', order.request_id)
    .maybeSingle()

  const itemCents = Number(offer?.item_amount_cents ?? order.amount_cents ?? 0)
  const shipCents = Number(offer?.shipping_cents ?? 0)
  const totalCents = Number(order.amount_cents ?? itemCents + shipCents)
  const feeCents = Math.round(totalCents * 0.07) // fix 7%
  const netPayoutCents = totalCents - feeCents

  // DB-Rechnung anlegen (Rechnungsnummer via DEFAULT)
  const { data: inv, error: insErr } = await sb
    .from('platform_invoices')
    .insert({
      order_id: order.id,
      supplier_id: order.supplier_id,
      buyer_id: order.buyer_id,
      total_gross_cents: totalCents,
      fee_cents: feeCents,
      net_payout_cents: netPayoutCents,
      currency: order.currency || 'eur',
    })
    .select('id, number')
    .single()
  if (insErr) throw new Error(insErr.message)

  const supplierSnap = (snap?.snapshot ?? {}) as any
  const suppName =
    supplierSnap.company_name ||
    supplierSnap.username ||
    'Anbieter'
  const addr = supplierSnap.address || {}
  const suppAddr = [
    addr.street && `${addr.street} ${addr.houseNumber || ''}`.trim(),
    addr.zip && `${addr.zip} ${addr.city || ''}`.trim(),
    addr.country,
  ].filter(Boolean).join('\n')
  const suppVat = supplierSnap.vat_number || '—'

  const reqTitle = req?.title || req?.data?.verfahrenstitel || req?.data?.verfahrenTitel || 'Lack-Anfrage'
  const reqMeta  = [
    req?.data?.ort && `Ort: ${req.data.ort}`,
    typeof req?.data?.menge === 'number' && `Menge: ${req.data.menge} kg`,
    req?.lieferdatum && `Lieferdatum: ${new Date(req.lieferdatum).toLocaleDateString('de-AT')}`
  ].filter(Boolean).join(' · ')

  const issuerName = process.env.NEXT_PUBLIC_APP_NAME || 'Plattform'
  const issuerAddr = process.env.APP_ADDRESS || 'Adresse der Plattform'
  const issuerVat  = process.env.APP_VAT_NUMBER || 'ATU00000000'

  const pdfBuf = await pdfBuffer((doc) => {
    // Kopf
    doc.fontSize(16).text(issuerName)
    doc.fontSize(10).text(issuerAddr)
    doc.text(`UID: ${issuerVat}`)
    doc.moveDown()

    doc.fontSize(20).text('Rechnung', { align: 'right' })
    doc.fontSize(10).text(`Rechnungsnr.: ${inv.number}`, { align: 'right' })
    doc.text(`Datum: ${new Date().toLocaleDateString('de-AT')}`, { align: 'right' })
    doc.moveDown()

    // Verkäufer (Leistungsempfänger der Plattform)
    doc.fontSize(12).text('Verkäufer (Leistungsempfänger der Plattform):')
    doc.fontSize(10).text(suppName)
    if (suppAddr) doc.text(suppAddr)
    doc.text(`UID: ${suppVat}`)
    doc.moveDown()

    // Bezug
    doc.fontSize(12).text('Vermittelte Leistung:')
    doc.fontSize(10).text(reqTitle)
    if (reqMeta) doc.text(reqMeta)
    doc.moveDown()

    // Beträge
    doc.fontSize(12).text('Abrechnung')
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Gesamtbetrag Auftrag: ${fmtEUR(totalCents)}`)
    doc.text(`Plattformgebühr (7%): ${fmtEUR(feeCents)}`)
    doc.text(`Auszahlungsbasis an Verkäufer: ${fmtEUR(netPayoutCents)}`)
    doc.moveDown()

    doc.fontSize(9).fillColor('#666').text(
      'Hinweis: Die Plattformgebühr umfasst ggf. anfallende Steuern/Gebühren der Plattform. '
      + 'Diese Rechnung bezieht sich auf die Vermittlungsleistung. Der Käufer erhält eine gesonderte Rechnung vom Verkäufer.'
    )
  })

  const pdfPath = `invoices/${order.supplier_id}/${inv.number}.pdf`
  const up = await sb.storage.from('invoices').upload(pdfPath, pdfBuf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (up.error) throw new Error(up.error.message)

  await sb.from('platform_invoices').update({ pdf_path: pdfPath }).eq('id', inv.id)

  return { id: inv.id, number: inv.number, pdf_path: pdfPath }
}
