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
    title: string          // z.B. "Vermittlungsprovision 7% auf Auftrag #123"
    qty: number            // 1
    unitPriceGrossCents: number
  }
  totals: {
    vatRate: number        // z.B. 20.00
    grossCents: number     // Brutto-Gesamt
    netCents: number       // Netto
    vatCents: number       // USt/MwSt
  }
  meta?: Record<string, any> // enthält u.a. vatLabel (MwSt/USt)
}

function formatMoney(cents: number, currency = 'EUR') {
  return (cents / 100).toLocaleString('de-AT', { style: 'currency', currency })
}

function addrToLines(a?: Address | null): string[] {
  if (!a) return []
  const line1 = [a.street, a.houseNumber].filter(Boolean).join(' ')
  const line2 = [a.zip, a.city].filter(Boolean).join(' ')
  const line3 = a.country || ''
  return [line1, line2, line3].filter(s => s && s.trim().length > 0)
}

export async function renderInvoicePdfBuffer(data: InvoiceRenderData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Uint8Array[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const vatLabel = (data.meta?.vatLabel as string) || 'USt'

    // Header
    doc.fontSize(18).text(data.platform.name, { continued: false })
    if (data.platform.vatId) doc.fontSize(10).text(`UID: ${data.platform.vatId}`)
    const platAddr = addrToLines(data.platform.address)
    platAddr.forEach(l => doc.text(l))
    doc.moveDown(1)

    // Empfänger
    doc.fontSize(12).text('Rechnung an:', { underline: true })
    doc.fontSize(11).text(data.vendor.displayName)
    if (data.vendor.vatId) doc.text(`UID: ${data.vendor.vatId}`)
    const vendAddr = addrToLines(data.vendor.address)
    vendAddr.forEach(l => doc.text(l))
    doc.moveDown(1)

    // Meta
    const dt = new Intl.DateTimeFormat('de-AT').format(data.issueDate)
    doc.fontSize(12).text(`Rechnungsnummer: ${data.invoiceNumber}`)
    doc.text(`Rechnungsdatum: ${dt}`)
    if (data.meta?.orderId) doc.text(`Auftrag: ${data.meta.orderId}`)
    if (data.meta?.requestTitle) doc.text(`Referenz: ${data.meta.requestTitle}`)
    doc.moveDown(1)

    // Position(en)
    doc.fontSize(12).text('Leistungsbeschreibung', 50, doc.y, { continued: false })
    doc.moveDown(0.5)
    doc.fontSize(11).text(`${data.line.title}`)
    doc.text(`Menge: ${data.line.qty}`)
    doc.text(`Einzelpreis (brutto): ${formatMoney(data.line.unitPriceGrossCents, data.currency)}`)
    doc.moveDown(1)

    // Summen
    doc.fontSize(12).text('Summen')
    doc.fontSize(11)
    doc.text(`Zwischensumme (netto): ${formatMoney(data.totals.netCents, data.currency)}`)
    doc.text(`${vatLabel} (${data.totals.vatRate.toFixed(2)}%): ${formatMoney(data.totals.vatCents, data.currency)}`)
    doc.text(`Gesamt (brutto): ${formatMoney(data.totals.grossCents, data.currency)}`)

    // (Optional) Zusatzinfos aus meta
    if (typeof data.meta?.orderGrossCents === 'number' || typeof data.meta?.payoutCents === 'number') {
      doc.moveDown(1)
      doc.fontSize(10).text(`Auftragssumme brutto (Referenz): ${formatMoney((data.meta?.orderGrossCents ?? 0), data.currency)}`)
      doc.text(`Auszahlungsbasis an Verkäufer: ${formatMoney((data.meta?.payoutCents ?? 0), data.currency)}`)
    }

    doc.moveDown(2)
    doc.fontSize(9).fillColor('#666').text('Hinweis: Es handelt sich um die Vermittlungsprovision der Plattform.')
    doc.end()
  })
}
