// Server-only util to render an invoice PDF into a Buffer
// Requires: npm i pdfkit  (+ @types/pdfkit for TS)
// Requires: npm i pdfkit  (+ @types/pdfkit for TS)

import PDFDocument from 'pdfkit'

type Address = {
  street?: string
  houseNumber?: string
  zip?: string
  city?: string
  country?: string
}

export type InvoiceRenderData = {
  invoiceNumber: string
  issueDate: Date
  currency: string
  platform: {
    name: string
    vatId?: string
    address?: Address | any
  }
  vendor: {
    displayName: string
    vatId?: string | null
    address?: Address | any | null
  }
  line: {
    title: string
    qty: number
    unitPriceGrossCents: number
  }
  totals: {
    vatRate: number
    grossCents: number
    netCents: number
    vatCents: number
  }
  meta?: {
    orderId?: string
    requestId?: string | number          // <-- hinzugefügt
    offerId?: string | number
    requestTitle?: string | null
    orderGrossCents?: number
    payoutCents?: number
    taxLabel?: 'MwSt' | 'USt' | 'MWST' | 'VAT'
    notes?: string[]
  }
}

function formatMoney(cents: number, currency = 'EUR') {
  return (cents / 100).toLocaleString('de-AT', { style: 'currency', currency })
}

function addrToLines(a?: Address | any | null): string[] {
  if (!a) return []
  if (typeof a === 'string') {
    return a.split('\n').map((s: string) => s.trim()).filter(Boolean)
  }
  const line1 = [a.street, a.houseNumber].filter(Boolean).join(' ')
  const line2 = [a.zip, a.city].filter(Boolean).join(' ')
  const line3 = a.country || ''
  return [line1, line2, line3].filter(s => s && s.trim().length > 0)
}

export async function renderInvoicePdfBuffer(data: InvoiceRenderData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 })
    const chunks: Uint8Array[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    // Header: Absender/Plattform
    doc.fontSize(18).text(data.platform.name)
    if (data.platform.vatId) doc.fontSize(10).text(`UID: ${data.platform.vatId}`)
    const platAddr = addrToLines(data.platform.address)
    platAddr.forEach(l => doc.text(l))
    doc.moveDown(1.2)

    // Empfänger
    doc.fontSize(12).text('Rechnung an:', { underline: true })
    doc.fontSize(11).text(data.vendor.displayName)
    if (data.vendor.vatId) doc.text(`UID: ${data.vendor.vatId}`)
    const vendAddr = addrToLines(data.vendor.address)
    vendAddr.forEach(l => doc.text(l))
    doc.moveDown(1.0)

    // Meta
    const dt = new Intl.DateTimeFormat('de-AT').format(data.issueDate)
    doc.fontSize(12).text(`Rechnungsnummer: ${data.invoiceNumber}`)
    doc.text(`Rechnungsdatum: ${dt}`)
    if (data.meta?.orderId)    doc.text(`Auftrag: ${data.meta.orderId}`)
    if (data.meta?.requestId)  doc.text(`Request-ID: ${String(data.meta.requestId)}`) // optional ausgegeben
    if (data.meta?.requestTitle) doc.text(`Referenz: ${data.meta.requestTitle}`)
    doc.moveDown(1.0)

    // Leistungsbeschreibung
    doc.fontSize(13).text('Leistungsbeschreibung')
    doc.moveDown(0.5)
    doc.fontSize(11).text(`${data.line.title}`)
    doc.text(`Menge: ${data.line.qty}`)
    doc.text(`Einzelpreis (brutto): ${formatMoney(data.line.unitPriceGrossCents, data.currency)}`)
    doc.moveDown(0.8)

    // Auftrag & Auszahlung (falls vorhanden)
    if (Number.isFinite(data.meta?.orderGrossCents) || Number.isFinite(data.meta?.payoutCents)) {
      doc.fontSize(12).text('Auftrag & Auszahlung')
      doc.fontSize(11)
      if (Number.isFinite(data.meta?.orderGrossCents)) {
        doc.text(`Auftragswert (brutto): ${formatMoney(data.meta!.orderGrossCents!, data.currency)}`)
      }
      if (Number.isFinite(data.meta?.payoutCents)) {
        doc.text(`Auszahlung an Verkäufer: ${formatMoney(data.meta!.payoutCents!, data.currency)}`)
      }
      doc.moveDown(0.8)
    }

    // Summen (Gebühr)
    const label = data.meta?.taxLabel || 'USt'
    doc.fontSize(13).text('Summen')
    doc.fontSize(11)
    doc.text(`Zwischensumme (netto): ${formatMoney(data.totals.netCents, data.currency)}`)
    doc.text(`${label} (${data.totals.vatRate.toFixed(2)}%): ${formatMoney(data.totals.vatCents, data.currency)}`)
    doc.text(`Gesamt (brutto): ${formatMoney(data.totals.grossCents, data.currency)}`)

    // Hinweise
    const notes = data.meta?.notes ?? []
    doc.moveDown(1.2)
    if (notes.length > 0) {
      doc.fontSize(9).fillColor('#666').text('Hinweis:')
      doc.moveDown(0.2)
      doc.fontSize(9).fillColor('#666')
      notes.forEach(n => doc.text(`• ${n}`))
    } else {
      doc.fontSize(9).fillColor('#666').text('Hinweis: Vermittlungsprovision der Plattform.')
    }

    doc.end()
  })
}
