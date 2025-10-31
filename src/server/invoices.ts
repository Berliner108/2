// /src/server/invoices.ts
// Server-Helper für Plattform-Rechnungen (Provision 7%)
// ENV (optional):
//   INVOICE_ISSUER_NAME, INVOICE_ISSUER_ADDRESS, INVOICE_ISSUER_VATID
//   INVOICE_FONT_TTF, INVOICE_LOGO_PATH
//   INVOICE_ENABLE_REVERSE_CHARGE=0|1
//   INVOICE_VAT_RATE=20

import fs from 'node:fs'
import path from 'node:path'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COMMISSION_RATE = 0.07 as const

// ------------------------ Helpers: URLs & Assets ------------------------
function publicUrlFromRel(rel: string): string | null {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!base) return null
  const clean = rel.startsWith('public/') ? rel.slice('public'.length) : rel
  const urlPath = clean.startsWith('/') ? clean : `/${clean}`
  return `${base}${urlPath}`
}

async function fetchAsBuffer(url: string): Promise<Buffer | null> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

let _cachedFont: Buffer | null = null
async function loadInvoiceFontBuffer(): Promise<Buffer | null> {
  if (_cachedFont) return _cachedFont
  const rel = process.env.INVOICE_FONT_TTF || 'public/fonts/Inter-Regular.ttf'
  try {
    const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel)
    _cachedFont = fs.readFileSync(abs)
    return _cachedFont
  } catch {}
  if (rel.startsWith('http')) {
    try {
      const buf = await fetchAsBuffer(rel)
      if (buf) { _cachedFont = buf; return buf }
    } catch {}
  }
  try {
    const url = publicUrlFromRel(rel)
    if (url) {
      const buf = await fetchAsBuffer(url)
      if (buf) { _cachedFont = buf; return buf }
    }
  } catch {}
  return null
}

let _cachedLogo: Buffer | null = null
async function loadInvoiceLogoBuffer(): Promise<Buffer | null> {
  if (_cachedLogo) return _cachedLogo
  const rel = process.env.INVOICE_LOGO_PATH || 'public/logo.png'
  try {
    const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel)
    _cachedLogo = fs.readFileSync(abs)
    return _cachedLogo
  } catch {}
  if (rel.startsWith('http')) {
    try {
      const buf = await fetchAsBuffer(rel)
      if (buf) { _cachedLogo = buf; return buf }
    } catch {}
  }
  try {
    const url = publicUrlFromRel(rel)
    if (url) {
      const buf = await fetchAsBuffer(url)
      if (buf) { _cachedLogo = buf; return buf }
    }
  } catch {}
  return null
}
// -----------------------------------------------------------------------

function normalizeMultiline(v?: string) {
  return v ? v.replace(/\\n/g, '\n') : v
}

type TaxMode = 'VAT_INCLUDED' | 'REVERSE_CHARGE'

type RenderPayload = {
  platform: { name: string; address?: string; vatId?: string }
  seller:   { name: string; company?: string | null; vatId?: string | null; addressText?: string | null }
  invoice:  {
    number: string; issuedAt: Date; currency: string
    orderId: string; requestTitle?: string | null; offerId?: string | number | null
    grossCents: number; feeCents: number; payoutCents: number
    taxMode: TaxMode
    // Neu: für Zusammenfassung
    feeNetCents?: number
    feeVatCents?: number
    feeVatRate?: number
    feeVatLabel?: 'USt' | 'MwSt'
  }
}

async function renderPdfBuffer(payload: RenderPayload): Promise<Buffer> {
  const PDFKit = (await import('pdfkit')).default
  const doc = new PDFKit({ size: 'A4', margin: 56 })

  const fontBuf = await loadInvoiceFontBuffer()
  if (fontBuf) {
    doc.registerFont('Body', fontBuf).font('Body')
  } else {
    doc.font('Helvetica')
  }

  try {
    const logoBuf = await loadInvoiceLogoBuffer()
    if (logoBuf) {
      const imgW = 120
      const pageW = (doc as any).page.width
      const { top, right } = (doc as any).page.margins
      const x = pageW - right - imgW
      const y = top - 8
      doc.image(logoBuf, x, y, { width: imgW })
      const afterLogoY = y + imgW * 0.35
      if (doc.y < afterLogoY) doc.y = afterLogoY
      doc.moveDown(0.5)
    }
  } catch {}

  const chunks: Uint8Array[] = []
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks as any)))
    doc.on('error', reject)
  })

  const { platform, seller, invoice } = payload
  const fmtMoney = (cents: number) =>
    (cents / 100).toLocaleString('de-AT', { style: 'currency', currency: invoice.currency.toUpperCase() })

  // Layout
  const PAGE_LEFT = 56
  const PAGE_RIGHT = 56 + 483
  const LABEL_X = PAGE_LEFT
  const LABEL_W = 340
  const VALUE_X = LABEL_X + LABEL_W + 12
  const VALUE_W = PAGE_RIGHT - VALUE_X

  function row(label: string, value: string) {
    const y = doc.y
    doc.fontSize(11).fillColor('#000').text(label, LABEL_X, y, { width: LABEL_W })
    doc.text(value, VALUE_X, y, { width: VALUE_W, align: 'right' })
    doc.moveDown(0.4)
  }

  // Header (Absender)
  doc.fontSize(16).text(platform.name)
  if (platform.address) doc.fontSize(10).fillColor('#444').text(platform.address)
  if (platform.vatId)   doc.fontSize(10).fillColor('#444').text(`UID: ${platform.vatId}`)
  doc.moveDown(1.2).fillColor('#000')

  // Titel & Meta
  doc.fontSize(20).text('Rechnung')
  doc.moveDown(0.5)
  doc.fontSize(11).text(`Rechnungsnummer: ${invoice.number}`)
  doc.text(`Rechnungsdatum: ${invoice.issuedAt.toLocaleDateString('de-AT')}`)
  doc.moveDown(0.8)

  // Empfänger
  doc.fontSize(12).text('Leistungsempfänger (Verkäufer):', { underline: true })
  doc.moveDown(0.2)
  if (seller.company) doc.fontSize(11).text(seller.company)
  if (seller.name && (!seller.company || seller.name !== seller.company)) doc.fontSize(11).text(seller.name)
  if (seller.addressText) doc.text(seller.addressText)
  if (seller.vatId)       doc.text(`UID: ${seller.vatId}`)
  doc.moveDown(1.0)

  // Beschreibung mit korrektem Steuerlabel
  const label = invoice.taxMode === 'REVERSE_CHARGE'
    ? 'Vermittlungsprovision 7% (Reverse-Charge)'
    : `Vermittlungsprovision 7% (inkl. ${invoice.feeVatLabel || 'USt'})`

  const descr = [
    label,
    invoice.requestTitle ? `Bezug: ${invoice.requestTitle}` : null,
    invoice.offerId ? `Angebot #${invoice.offerId}` : null,
    `Order #${invoice.orderId}`,
  ].filter(Boolean).join(' · ')
  doc.fontSize(12).text(descr)
  doc.moveDown(0.8)

  // Beträge – Hauptblock
  row('Auftragswert (brutto):', fmtMoney(invoice.grossCents))
  row('Provision 7%:',         '– ' + fmtMoney(invoice.feeCents))
  doc.moveDown(0.2)
  doc.fontSize(12)
  row('Auszahlung an Verkäufer:', fmtMoney(invoice.payoutCents))

  // Gebühren-Zusammenfassung (Netto/Steuer/Brutto) – nur wenn keine RC
  if (invoice.taxMode === 'VAT_INCLUDED' && Number.isFinite(invoice.feeNetCents ?? NaN)) {
    doc.moveDown(0.8)
    doc.fontSize(12).text('Zusammenfassung Provision')
    doc.moveDown(0.2); doc.fontSize(11)
    row('Provision (netto):', fmtMoney(invoice.feeNetCents!))
    row(`${invoice.feeVatLabel || 'USt'} (${(invoice.feeVatRate ?? 0).toFixed(2)}%):`, fmtMoney(invoice.feeVatCents || 0))
    row('Provision (brutto):', fmtMoney(invoice.feeCents))
  }

  // Fußnote
  doc.moveDown(1.2).fontSize(9).fillColor('#666')
  if (invoice.taxMode === 'REVERSE_CHARGE') {
    doc.text('Hinweis: Reverse-Charge (Art. 44, 196 MwStSystRL / §3a UStG). Die Steuerschuld geht auf den Leistungsempfänger über.')
  } else {
    doc.text('Hinweis: Die 7% Provision enthalten sämtliche ggf. anfallende Umsatzsteuer der Plattform.')
  }
  doc.end()

  return done
}

/**
 * Idempotent: erstellt/holt/rekonstruiert platform_invoices, rendert PDF, lädt es hoch.
 */
export async function createCommissionInvoiceForOrder(orderId: string) {
  const admin = supabaseAdmin()

  // Order
  const { data: order, error: oErr } = await admin
    .from('orders')
    .select(`
      id, created_at, kind, currency,
      buyer_id, supplier_id, request_id, offer_id,
      amount_cents, released_at
    `)
    .eq('id', orderId)
    .maybeSingle()
  if (oErr) throw new Error(`order lookup failed: ${oErr.message}`)
  if (!order) throw new Error('order not found')
  if (order.kind !== 'lack') return { skipped: true, reason: 'non-lack order' }

  // Offer + Snapshot + Request
  const [{ data: offer }, { data: offerSnap }, { data: req }] = await Promise.all([
    admin.from('lack_offers').select('id, item_amount_cents, shipping_cents, amount_cents').eq('id', order.offer_id).maybeSingle(),
    admin.from('lack_offer_snapshots').select('amount_cents, item_amount_cents, shipping_cents').eq('offer_id', order.offer_id).limit(1).maybeSingle(),
    admin.from('lack_requests').select('id, title').eq('id', order.request_id).maybeSingle(),
  ])

  // Verkäufer-Snapshot / Profil
  let sellerName = ''
  let sellerCompany: string | null = null
  let sellerVat: string | null = null
  let sellerAddressText: string | null = null
  let sellerAccountType: string | null = null

  const { data: snap } = await admin
    .from('offer_profile_snapshots')
    .select('snapshot')
    .eq('offer_id', order.offer_id)
    .maybeSingle()

  if (snap?.snapshot) {
    const s = snap.snapshot as any
    const displayName = s.display_name || s.full_name || s.name || null
    sellerName = displayName || s.username || ''
    sellerCompany = s.company_name ?? null
    sellerVat = s.vat_number ?? null
    sellerAccountType = s.account_type ?? null
    const adr = s.address || {}
    sellerAddressText = [
      adr.street && adr.houseNumber ? `${adr.street} ${adr.houseNumber}` : (adr.street || ''),
      adr.zip && adr.city ? `${adr.zip} ${adr.city}` : (adr.zip || adr.city || ''),
      adr.country || '',
    ].filter(Boolean).join('\n') || null
  } else {
    const { data: prof } = await admin
      .from('profiles')
      .select('username, company_name, vat_number, address, account_type')
      .eq('id', order.supplier_id)
      .maybeSingle()
    sellerName = prof?.username || ''
    sellerCompany = (prof as any)?.company_name ?? null
    sellerVat = (prof as any)?.vat_number ?? null
    sellerAccountType = (prof as any)?.account_type ?? null
    const adr = (prof as any)?.address || {}
    sellerAddressText = adr ? [
      adr.street && adr.houseNumber ? `${adr.street} ${adr.houseNumber}` : (adr.street || ''),
      adr.zip && adr.city ? `${adr.zip} ${adr.city}` : (adr.zip || adr.city || ''),
      adr.country || '',
    ].filter(Boolean).join('\n') || null : null
  }

  // Auftrags-Brutto
  const orderGrossCents =
    Number.isInteger(offerSnap?.amount_cents) ? offerSnap!.amount_cents! :
    Number.isInteger(order.amount_cents)      ? order.amount_cents! :
    Number.isInteger(offer?.amount_cents)     ? offer!.amount_cents! :
    ((offerSnap?.item_amount_cents ?? offer?.item_amount_cents ?? 0) +
     (offerSnap?.shipping_cents     ?? offer?.shipping_cents     ?? 0))

  const feeCents    = Math.round(orderGrossCents * COMMISSION_RATE)
  const payoutCents = Math.max(0, orderGrossCents - feeCents)

  // Steuer-Mode + Label (MwSt/USt)
  const rcEnabled  = process.env.INVOICE_ENABLE_REVERSE_CHARGE === '1'
  const vatRateEnv = Number(process.env.INVOICE_VAT_RATE || '20')
  const vatRate    = Number.isFinite(vatRateEnv) ? Math.max(0, vatRateEnv) : 20

  const vatId = (sellerVat || '').toUpperCase().trim()
  const isBusiness = (sellerAccountType || '').toLowerCase() === 'business'
  let taxMode: TaxMode = 'VAT_INCLUDED'
  if (rcEnabled && isBusiness && vatId && !vatId.startsWith('AT')) {
    taxMode = 'REVERSE_CHARGE'
  }
  const vatLabel: 'USt' | 'MwSt' = vatId ? 'USt' : 'MwSt'

  // Netto/Umsatzsteuer der Provision (nur Info/Ausweis)
  let feeNetCents: number | undefined
  let feeVatCents: number | undefined
  if (taxMode === 'VAT_INCLUDED') {
    const divisor = 1 + (vatRate / 100)
    feeNetCents = Math.round(feeCents / divisor)
    feeVatCents = feeCents - feeNetCents
  }

  // Plattform-Absender
  const platform = {
    name:    process.env.INVOICE_ISSUER_NAME    || 'Beschichter Scout GmbH',
    address: normalizeMultiline(process.env.INVOICE_ISSUER_ADDRESS || 'Kärntner Straße 1\n1010 Wien\nÖsterreich'),
    vatId:   process.env.INVOICE_ISSUER_VATID   || undefined,
  }

  const issuedAt = new Date(order.released_at || new Date().toISOString())

  // Bestehende platform_invoices?
  const { data: existing } = await admin
    .from('platform_invoices')
    .select('id, number, pdf_path')
    .eq('order_id', order.id)
    .maybeSingle()

  if (existing?.pdf_path) {
    const probe = await admin.storage.from('invoices').download(existing.pdf_path)
    if (!('error' in probe) || !probe.error) {
      return { ok: true, already: true, id: existing.id, pdf_path: existing.pdf_path }
    }
  }

  // Nummer besorgen/erstellen
  let dbId: string
  let dbNumber: string
  if (existing) {
    dbId = existing.id
    dbNumber = existing.number as string
  } else {
    const ins = await admin
      .from('platform_invoices')
      .insert({
        order_id:           order.id,
        supplier_id:        order.supplier_id,
        buyer_id:           order.buyer_id,
        seller_id:          order.supplier_id,
        total_gross_cents:  orderGrossCents,
        fee_cents:          feeCents,
        net_payout_cents:   payoutCents,
        currency:           (order.currency || 'eur').toLowerCase(),
        issued_at:          issuedAt.toISOString(),
        gross_cents:        feeCents,
        payout_cents:       payoutCents,
        meta: {
          request_id: order.request_id,
          offer_id:   order.offer_id,
          title:      req?.title ?? null,
          taxMode,
          fee_breakdown: { net_cents: feeNetCents ?? feeCents, vat_cents: feeVatCents ?? 0, vat_rate: taxMode === 'VAT_INCLUDED' ? vatRate : 0, vat_label: vatLabel },
        },
      })
      .select('id, number')
      .maybeSingle()
    if (ins.error || !ins.data) throw new Error(`invoice insert failed: ${ins.error?.message || 'insert returned no row'}`)
    dbId = ins.data.id
    dbNumber = ins.data.number as string
  }

  // PDF erzeugen
  const pdf = await renderPdfBuffer({
    platform,
    seller: { name: sellerName, company: sellerCompany, vatId: sellerVat, addressText: sellerAddressText },
    invoice: {
      number: dbNumber,
      issuedAt,
      currency: (order.currency || 'eur'),
      orderId: order.id,
      requestTitle: req?.title ?? null,
      offerId: offer?.id ?? null,
      grossCents: orderGrossCents,
      feeCents,
      payoutCents,
      taxMode,
      feeNetCents: taxMode === 'VAT_INCLUDED' ? (feeNetCents ?? 0) : undefined,
      feeVatCents: taxMode === 'VAT_INCLUDED' ? (feeVatCents ?? 0) : undefined,
      feeVatRate: taxMode === 'VAT_INCLUDED' ? vatRate : undefined,
      feeVatLabel: taxMode === 'VAT_INCLUDED' ? vatLabel : undefined,
    },
  })

  // Upload
  const year  = issuedAt.getFullYear()
  const month = String(issuedAt.getMonth() + 1).padStart(2, '0')
  const pathOnStorage = `${order.supplier_id}/${year}/${month}/${dbNumber}.pdf`

  const up = await admin.storage.from('invoices')
    .upload(pathOnStorage, pdf, { contentType: 'application/pdf', upsert: true })
  if (up.error && (up.error as any)?.statusCode !== 409) {
    throw new Error(`invoice upload failed: ${up.error.message}`)
  }

  await admin.from('platform_invoices').update({ pdf_path: pathOnStorage }).eq('id', dbId)

  return { ok: true, id: dbId, pdf_path: pathOnStorage }
}

// Alias
export { createCommissionInvoiceForOrder as ensureInvoiceForOrder }
