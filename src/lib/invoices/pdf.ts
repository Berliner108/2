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

// >>> NEU: Meta bewusst typisieren, inkl. Labels & Summen
type InvoiceMeta = {
  orderId?: string
  offerId?: string | number          // <<< NEU
  requestTitle?: string | null
  vatLabel?: 'MwSt' | 'USt' | 'MWST' | 'VAT'
  taxLabel?: 'MwSt' | 'USt' | 'MWST' | 'VAT'   // <<< Alias akzeptieren
  notes?: string[]
  orderGrossCents?: number
  payoutCents?: number
}

export type InvoiceRenderData = {
  invoiceNumber: string
  issueDate: Date
  currency: string
  
  platform: {
    name: string
    vatId?: string
    // >>> erlaubt jetzt Address ODER string (z. B. aus ENV mit \n)
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
  meta?: InvoiceMeta
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

function printPlatformAddress(doc: PDFKit.PDFDocument, addr?: Address | string) {
  if (!addr) return
  if (typeof addr === 'string') {
    addr.split(/\r?\n/).forEach(l => l && doc.text(l))
  } else {
    addrToLines(addr).forEach(l => doc.text(l))
  }
}

export async function renderInvoicePdfBuffer(data: InvoiceRenderData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks: Uint8Array[] = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    // Header – Plattform
    doc.fontSize(18).text(data.platform.name, { continued: false })
    if (data.platform.vatId) doc.fontSize(10).text(`UID: ${data.platform.vatId}`)
    printPlatformAddress(doc, data.platform.address)
    doc.moveDown(1)

    // Empfänger
    doc.fontSize(12).text('Rechnung an:', { underline: true })
    doc.fontSize(11).text(data.vendor.displayName)
    if (data.vendor.vatId) doc.text(`UID: ${data.vendor.vatId}`)
    addrToLines(data.vendor.address).forEach(l => doc.text(l))
    doc.moveDown(1)

    // Meta
    const dt = new Intl.DateTimeFormat('de-AT').format(data.issueDate)
    doc.fontSize(12).text(`Rechnungsnummer: ${data.invoiceNumber}`)
    doc.text(`Rechnungsdatum: ${dt}`)
    if (data.meta?.orderId)     doc.text(`Auftrag: ${data.meta.orderId}`)
    if (data.meta?.offerId)     doc.text(`Angebot: ${data.meta.offerId}`)       // <<< NEU
    if (data.meta?.requestTitle) doc.text(`Referenz: ${data.meta.requestTitle}`)
    doc.moveDown(1)

    // Leistungsbeschreibung
    doc.fontSize(12).text('Leistungsbeschreibung', 50, doc.y)
    doc.moveDown(0.5)
    doc.fontSize(11).text(`${data.line.title}`)
    doc.text(`Menge: ${data.line.qty}`)
    doc.text(`Einzelpreis (brutto): ${formatMoney(data.line.unitPriceGrossCents, data.currency)}`)
    doc.moveDown(1)

    // Summen (strukturiert)
    const label = data.meta?.vatLabel ?? data.meta?.taxLabel ?? 'USt'  // <<< beides unterstützen
    doc.fontSize(12).text('Summen')
    doc.fontSize(11)

    // Falls mitgegeben: Auftragswert & Auszahlung
    if (typeof data.meta?.orderGrossCents === 'number') {
      doc.text(`Auftragswert (brutto): ${formatMoney(data.meta.orderGrossCents, data.currency)}`)
      doc.text(`Provision 7%: – ${formatMoney(data.totals.grossCents, data.currency)}`)
      if (typeof data.meta?.payoutCents === 'number') {
        doc.text(`Auszahlung an Verkäufer: ${formatMoney(data.meta.payoutCents, data.currency)}`)
        doc.moveDown(0.5)
      }
    }

    doc.text(`Zwischensumme (netto): ${formatMoney(data.totals.netCents, data.currency)}`)
    doc.text(`${label} (${data.totals.vatRate.toFixed(2)}%): ${formatMoney(data.totals.vatCents, data.currency)}`)
    doc.text(`Gesamt (brutto): ${formatMoney(data.totals.grossCents, data.currency)}`)

    doc.moveDown(2)
    doc.fontSize(9).fillColor('#666')
    if (data.meta?.notes?.length) {
      doc.text('Hinweis:')
      data.meta.notes.forEach(n => doc.text(`• ${n}`))
    } else {
      doc.text('Hinweis: Es handelt sich um die Vermittlungsprovision der Plattform.')
    }
    doc.end()
  })
}
