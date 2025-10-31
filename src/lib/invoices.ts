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

const fmt = (cents: number, currency = 'EUR', locale = 'de-AT') =>
  (cents / 100).toLocaleString(locale, { style: 'currency', currency })

// Minimal: erweitere bei Bedarf.
const VAT_RATE_BY_CC: Record<string, number> = {
  AT: 20,
  DE: 19,
  // add more: FR: 20, IT: 22, ES: 21, NL: 21, ...
}

const EU_CC = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
  'HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
])

type TaxMode = 'AT'|'OSS'|'RC'|'NON_EU'

function splitGrossIntoNetVat(grossCents: number, vatRatePct: number) {
  if (vatRatePct <= 0) return { net: grossCents, vat: 0 }
  const vatPart = Math.round(grossCents * (vatRatePct / (100 + vatRatePct)))
  return { net: grossCents - vatPart, vat: vatPart }
}

export async function generatePlatformInvoice(orderId: string) {
  const sb = supabaseAdmin()

  // idempotent
  const { data: existing } = await sb
    .from('platform_invoices')
    .select('id, number, pdf_path')
    .eq('order_id', orderId)
    .maybeSingle()
  if (existing) return existing

  // Order + Offer + Snapshot + Request
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

  // --- 7% Plattformgebühr: immer fix (brutto)
  const feeGrossCents = Math.round(totalCents * 0.07)
  const netPayoutCents = totalCents - feeGrossCents

  // --- Steuerlogik basierend auf Verkäufer (Leistungsempfänger der Plattform)
  const supplierSnap = (snap?.snapshot ?? {}) as any
  const addr = supplierSnap.address || {}
  const ccRaw: string =
    (supplierSnap.country_code || addr.country_code || addr.country || 'AT') + ''
  const cc = ccRaw.trim().toUpperCase()
  const vatNumber: string | null = supplierSnap.vat_number || null
  const isBusiness: boolean = !!vatNumber || supplierSnap.is_business === true

  let taxMode: TaxMode
  let vatRate = 0

  if (cc === 'AT') {
    // Inlandsfall – AT USt
    taxMode = 'AT'
    vatRate = VAT_RATE_BY_CC.AT ?? 20
  } else if (EU_CC.has(cc)) {
    if (isBusiness && vatNumber) {
      // EU B2B mit UID → Reverse-Charge
      taxMode = 'RC'
      vatRate = 0
    } else {
      // EU B2C → OSS, USt des Kundenlandes
      taxMode = 'OSS'
      vatRate = VAT_RATE_BY_CC[cc] ?? VAT_RATE_BY_CC.AT ?? 20
    }
  } else {
    // Drittland (z. B. CH)
    taxMode = 'NON_EU'
    vatRate = 0
  }

  const { net: feeNetCents, vat: feeVatCents } = splitGrossIntoNetVat(feeGrossCents, vatRate)

  // DB-Rechnung anlegen (Rechnungsnummer via DEFAULT)
  const { data: inv, error: insErr } = await sb
    .from('platform_invoices')
    .insert({
      order_id: order.id,
      supplier_id: order.supplier_id,
      buyer_id: order.buyer_id,
      total_gross_cents: totalCents,
      fee_cents: feeGrossCents,
      net_payout_cents: netPayoutCents,
      currency: order.currency || 'eur',
      // optional: speichere Steuerdetails für Admin/Export
      fee_net_cents: feeNetCents,
      fee_vat_cents: feeVatCents,
      fee_vat_rate: vatRate,
      tax_mode: taxMode,
      country_code: cc,
      supplier_vat_number: vatNumber,
    })
    .select('id, number')
    .single()
  if (insErr) throw new Error(insErr.message)

  const suppName =
    supplierSnap.company_name || supplierSnap.username || 'Anbieter'
  const suppVat  = vatNumber || '—'
  const suppAddrLines = [
    addr.street && `${addr.street} ${addr.houseNumber || ''}`.trim(),
    addr.zip && `${addr.zip} ${addr.city || ''}`.trim(),
    cc,
  ].filter(Boolean).join('\n')

  const reqTitle =
    req?.title || req?.data?.verfahrenstitel || req?.data?.verfahrenTitel || 'Lack-Anfrage'
  const reqMeta  = [
    req?.data?.ort && `Ort: ${req.data.ort}`,
    typeof req?.data?.menge === 'number' && `Menge: ${req.data.menge} kg`,
    req?.lieferdatum && `Lieferdatum: ${new Date(req.lieferdatum).toLocaleDateString('de-AT')}`
  ].filter(Boolean).join(' · ')

  const issuerName = process.env.NEXT_PUBLIC_APP_NAME || 'Plattform'
  const issuerAddr = process.env.APP_ADDRESS || 'Adresse der Plattform'
  const issuerVat  = process.env.APP_VAT_NUMBER || 'ATU00000000'
  const currency = (order.currency || 'eur').toUpperCase()

  const note =
    taxMode === 'RC'
      ? 'Reverse-Charge – Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / § 19 UStG).'
      : taxMode === 'NON_EU'
        ? 'Leistung nicht steuerbar in Österreich (§ 3a UStG).'
        : (taxMode === 'OSS'
            ? `USt nach OSS des Bestimmungslandes (${cc})`
            : `USt Österreich (${vatRate.toFixed(0)} %)`)

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

    // Verkäufer (Leistungsempfänger)
    doc.fontSize(12).text('Leistungsempfänger (Verkäufer):')
    doc.fontSize(10).text(suppName)
    if (suppAddrLines) doc.text(suppAddrLines)
    doc.text(`UID: ${suppVat}`)
    doc.moveDown()

    // Bezug
    doc.fontSize(12).text('Vermittelte Leistung:')
    doc.fontSize(10).text(reqTitle)
    if (reqMeta) doc.text(reqMeta)
    doc.moveDown()

    // Beträge (Auftrag)
    doc.fontSize(12).text('Auftrag')
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Auftragswert (brutto): ${fmt(totalCents, currency)}`)
    doc.moveDown()

    // Plattformgebühr 7% (mit Steuer-Ausweis)
    doc.fontSize(12).text('Plattformgebühr (7% der Auftrags­summe)')
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Netto: ${fmt(feeNetCents, currency)}`)
    doc.text(`USt (${vatRate.toFixed(2)}%): ${fmt(feeVatCents, currency)}`)
    doc.text(`Brutto: ${fmt(feeGrossCents, currency)}`)
    doc.moveDown()

    // Auszahlung
    doc.fontSize(12).text('Auszahlung an Verkäufer')
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Auszahlungsbetrag: ${fmt(netPayoutCents, currency)}`)
    doc.moveDown()

    // Hinweis
    doc.fontSize(9).fillColor('#666').text(
      `Hinweis: ${note}. Die 7% Vermittlungsprovision ist fix und enthält – sofern anwendbar – die USt.`
    )
  })

  const pdfPath = `invoices/${order.supplier_id}/${inv.number}.pdf`
  const up = await sb.storage.from('invoices').upload(pdfPath, pdfBuf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (up.error) throw new Error(up.error.message)

  await sb.from('platform_invoices').update({
    pdf_path: pdfPath,
    // für spätere Exporte praktisch:
    fee_net_cents: feeNetCents,
    fee_vat_cents: feeVatCents,
    fee_vat_rate: vatRate,
    tax_mode: taxMode,
    country_code: cc,
    supplier_vat_number: vatNumber,
  }).eq('id', inv.id)

  return { id: inv.id, number: inv.number, pdf_path: pdfPath }
}
