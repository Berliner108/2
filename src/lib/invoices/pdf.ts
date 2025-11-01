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
    vatCents: number       // Steuerbetrag
  }
  meta?: {
    orderId?: string
    requestId?: string | number
    offerId?: string | number
    requestTitle?: string | null
    /** optional zur Anzeige im Info-Block */
    orderGrossCents?: number
    payoutCents?: number
    /** explizite Bezeichnung: "MwSt" | "USt" | "MWST" | "VAT" */
    taxLabel?: 'MwSt' | 'USt' | 'MWST' | 'VAT'
    /** optionale Zusatzhinweise */
    notes?: string[]
  }
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

    // Header (Absender)
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
    if (data.meta?.orderId)       doc.text(`Auftrag: ${data.meta.orderId}`)
    if (data.meta?.requestTitle)  doc.text(`Referenz: ${data.meta.requestTitle}`)
    if (data.meta?.offerId != null) doc.text(`Angebot: ${String(data.meta.offerId)}`)
    if (data.meta?.requestId != null) doc.text(`Anfrage-ID: ${String(data.meta.requestId)}`)
    doc.moveDown(1)

    // Leistungsblock
    doc.fontSize(12).text('Leistungsbeschreibung', 50, doc.y, { continued: false })
    doc.moveDown(0.5)
    doc.fontSize(11).text(`${data.line.title}`)
    doc.text(`Menge: ${data.line.qty}`)
    doc.text(`Einzelpreis (brutto): ${formatMoney(data.line.unitPriceGrossCents, data.currency)}`)
    // Optionaler Info-Block zu Auftrag/Payout
    if (typeof data.meta?.orderGrossCents === 'number' || typeof data.meta?.payoutCents === 'number') {
      doc.moveDown(0.5)
      if (typeof data.meta?.orderGrossCents === 'number') {
        doc.text(`Auftragswert (brutto): ${formatMoney(data.meta.orderGrossCents, data.currency)}`)
      }
      if (typeof data.meta?.payoutCents === 'number') {
        doc.text(`Auszahlung an Verkäufer: ${formatMoney(data.meta.payoutCents, data.currency)}`)
      }
    }
    doc.moveDown(1)

    // Summen (mit explizitem Label)
    const taxLabel = data.meta?.taxLabel ?? 'USt'
    doc.fontSize(12).text('Summen')
    doc.fontSize(11)
    doc.text(`Zwischensumme (netto): ${formatMoney(data.totals.netCents, data.currency)}`)
    doc.text(`${taxLabel} (${data.totals.vatRate.toFixed(2)}%): ${formatMoney(data.totals.vatCents, data.currency)}`)
    doc.text(`Gesamt (brutto): ${formatMoney(data.totals.grossCents, data.currency)}`)

    doc.moveDown(2)
    doc.fontSize(9).fillColor('#666').text('Hinweis: Vermittlungsprovision der Plattform.')
    if (data.meta?.notes?.length) {
      doc.moveDown(0.3)
      for (const n of data.meta.notes) doc.text(`• ${n}`)
    }
    doc.end()
  })
}
