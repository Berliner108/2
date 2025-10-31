// /src/lib/invoices/pdf.ts
// Server-only util to render an invoice PDF into a Buffer
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
    address?: Address
  }
  vendor: {
    displayName: string
    vatId?: string | null
    address?: Address | null
  }
  line: {
    title: string               // "Vermittlungsprovision 7% …"
    qty: number                 // 1
    unitPriceGrossCents: number // optional Anzeige
  }
  totals: {
    vatRate: number   // z.B. 20.00
    grossCents: number
    netCents: number
    vatCents: number
  }
  // optionale Zusatzinfos für die Anzeige
  meta?: {
    orderId?: string
    requestTitle?: string
    orderGrossCents?: number    // Auftragssumme (brutto)
    payoutCents?: number        // Auszahlung an Verkäufer
    note?: string               // eigener Hinweis
  } & Record<string, any>
}

/* ========== helpers ========== */
function fmt(cents: number, currency = 'EUR') {
  return (cents / 100).toLocaleString('de-AT', { style: 'currency', currency })
}
function addrToLines(a?: Address | null): string[] {
  if (!a) return []
  const l1 = [a.street, a.houseNumber].filter(Boolean).join(' ')
  const l2 = [a.zip, a.city].filter(Boolean).join(' ')
  const l3 = a.country || ''
  return [l1, l2, l3].filter(s => s && s.trim().length > 0)
}
function hr(doc: PDFKit.PDFDocument, yPad = 6) {
  doc.moveDown(0.2)
  const y = doc.y
  doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor('#dddddd').stroke()
  doc.moveDown(yPad / 12)
}
function section(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6)
  doc.fontSize(12).fillColor('#111').text(title)
  hr(doc, 6)
}
function kv(doc: PDFKit.PDFDocument, label: string, value: string) {
  const y = doc.y
  doc.fontSize(10).fillColor('#333').text(label, 50, y, { width: 350 })
  doc.fontSize(10).fillColor('#111').text(value, 420, y, { width: 125, align: 'right' })
  doc.moveDown(0.15)
}
function moneyRow(doc: PDFKit.PDFDocument, label: string, cents: number, currency='EUR', bold=false) {
  const y = doc.y
  if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica')
  doc.fontSize(10).fillColor('#333').text(label, 50, y, { width: 350 })
  doc.fontSize(10).fillColor('#111').text(fmt(cents, currency), 420, y, { width: 125, align: 'right' })
  doc.font('Helvetica')
  doc.moveDown(0.15)
}

/* ========== renderer ========== */
export async function renderInvoicePdfBuffer(data: InvoiceRenderData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Uint8Array[] = []
    doc.on('data', c => chunks.push(c))
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const dt = new Intl.DateTimeFormat('de-AT').format(data.issueDate)

    // Kopf (links Absender, rechts Rechnungsblock)
    doc.fontSize(16).text(data.platform.name)
    doc.fontSize(10)
    if (data.platform.vatId) doc.text(`UID: ${data.platform.vatId}`)
    addrToLines(data.platform.address).forEach(l => doc.text(l))

    doc.fontSize(20).text('Rechnung', 350, 50, { width: 200, align: 'right' })
    doc.fontSize(10)
      .text(`Rechnungsnummer: ${data.invoiceNumber}`, 350, 75, { width: 200, align: 'right' })
      .text(`Rechnungsdatum: ${dt}`, 350, 90, { width: 200, align: 'right' })
    hr(doc)

    // Leistungsempfänger
    section(doc, 'Leistungsempfänger (Verkäufer)')
    doc.fontSize(11).fillColor('#111').text(data.vendor.displayName)
    doc.fontSize(10).fillColor('#111')
    if (data.vendor.vatId) doc.text(`UID: ${data.vendor.vatId}`)
    addrToLines(data.vendor.address).forEach(l => doc.text(l))

    // Bezug / Referenz
    section(doc, 'Bezug')
    if (data.meta?.requestTitle) kv(doc, 'Referenz', data.meta.requestTitle)
    if (data.meta?.orderId)      kv(doc, 'Order', `#${data.meta.orderId}`)

    // Leistungsbeschreibung
    section(doc, 'Leistungsbeschreibung')
    doc.fontSize(11).fillColor('#111').text(data.line.title)
    doc.moveDown(0.3)
    kv(doc, 'Menge', String(data.line.qty))
    kv(doc, 'Einzelpreis (brutto)', fmt(data.line.unitPriceGrossCents, data.currency))

    // Betragsübersicht (klar getrennt, Beträge rechtsbündig)
    section(doc, 'Abrechnung Plattformgebühr')
    if (typeof data.meta?.orderGrossCents === 'number') {
      moneyRow(doc, 'Auftragssumme (brutto)', data.meta.orderGrossCents, data.currency)
      hr(doc, 4)
    }
    moneyRow(doc, 'Zwischensumme (netto)', data.totals.netCents, data.currency)
    moneyRow(doc, `USt (${data.totals.vatRate.toFixed(2)}%)`, data.totals.vatCents, data.currency)
    moneyRow(doc, 'Gesamt (brutto)', data.totals.grossCents, data.currency, true)

    if (typeof data.meta?.payoutCents === 'number') {
      section(doc, 'Auszahlung an Verkäufer')
      moneyRow(doc, 'Auszahlungsbetrag', data.meta.payoutCents, data.currency, true)
    }

    // Hinweis
    doc.moveDown(0.8)
    doc.fontSize(9).fillColor('#666').text(
      data.meta?.note ??
      'Hinweis: Diese Rechnung betrifft die Vermittlungsleistung der Plattform. Die ausgewiesene USt bezieht sich auf die Plattformgebühr.'
    )

    doc.end()
  })
}
