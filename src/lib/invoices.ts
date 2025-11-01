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
    // Adresse kann String (mit \n) ODER Objekt sein
    address?: Address | string
  }
  vendor: {
    displayName: string
    vatId?: string | null
    address?: Address | null
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
  // großzügig typisiert, damit zusätzliche Felder erlaubt sind
  meta?: {
    orderId?: string
    requestId?: string | number
    offerId?: string | number
    requestTitle?: string | null
    orderGrossCents?: number
    payoutCents?: number
    taxLabel?: 'MwSt' | 'USt' | 'MWST' | 'VAT'
    notes?: string[]
    [k: string]: any
  }
}

function formatMoney(cents: number, currency = 'EUR') {
  return (cents / 100).toLocaleString('de-AT', { style: 'currency', currency })
}

function addrToLines(a?: Address | string | null): string[] {
  if (!a) return []
  if (typeof a === 'string') {
    return a.replace(/\\n/g, '\n')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  }
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
    const vendAddr = addrToLines(data.vendor.address || undefined)
    vendAddr.forEach(l => doc.text(l))
    doc.moveDown(1)

    // Meta
    const dt = new Intl.DateTimeFormat('de-AT').format(data.issueDate)
    doc.fontSize(12).text(`Rechnungsnummer: ${data.invoiceNumber}`)
    doc.text(`Rechnungsdatum: ${dt}`)
    if (data.meta?.orderId) doc.text(`Auftrag: ${data.meta.orderId}`)
    if (data.meta?.requestTitle) doc.text(`Referenz: ${data.meta.requestTitle}`)
    doc.moveDown(1)

    // Leistungsbeschreibung
    doc.fontSize(12).text('Leistungsbeschreibung')
    doc.moveDown(0.5)
    doc.fontSize(11).text(`${data.line.title}`)
    doc.text(`Menge: ${data.line.qty}`)
    doc.text(`Einzelpreis (brutto): ${formatMoney(data.line.unitPriceGrossCents, data.currency)}`)
    doc.moveDown(1)

    // --- NEU: Abrechnung (zeigt Auftragswert, Provision, Auszahlung) ----
    const orderGross = data.meta?.orderGrossCents ?? null
    const payout = data.meta?.payoutCents ?? null
    if (orderGross !== null || payout !== null) {
      doc.fontSize(12).text('Abrechnung')
      doc.moveDown(0.3)
      doc.fontSize(11)
      if (orderGross !== null) {
        doc.text(`Auftragswert (brutto): ${formatMoney(orderGross, data.currency)}`)
      }
      doc.text(`Provision 7%: ${formatMoney(data.totals.grossCents, data.currency)}`)
      if (payout !== null) {
        doc.text(`Auszahlung an Verkäufer: ${formatMoney(payout, data.currency)}`)
      }
      doc.moveDown(1)
    }
    // -------------------------------------------------------------------

    // Summen (für die Plattformleistung)
    const taxLabel = data.meta?.taxLabel || 'USt'
    doc.fontSize(12).text('Summen')
    doc.fontSize(11)
    doc.text(`Zwischensumme (netto): ${formatMoney(data.totals.netCents, data.currency)}`)
    doc.text(`${taxLabel} (${data.totals.vatRate.toFixed(2)}%): ${formatMoney(data.totals.vatCents, data.currency)}`)
    doc.text(`Gesamt (brutto): ${formatMoney(data.totals.grossCents, data.currency)}`)

    // Hinweise
    const notes = data.meta?.notes || []
    doc.moveDown(1.5)
    doc.fontSize(9).fillColor('#666')
    if (notes.length === 0) {
      doc.text('Hinweis: Vermittlungsprovision der Plattform.')
    } else if (notes.length === 1) {
      doc.text(`Hinweis: ${notes[0]}`)
    } else {
      doc.text('Hinweise:')
      notes.forEach(n => doc.text(`• ${n}`))
    }

    doc.end()
  })
}
