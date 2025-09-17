// /src/server/invoices.ts
// Server-Helper für Plattform-Rechnungen (Provision 7%)
// Install: npm i pdfkit && npm i -D @types/pdfkit
//
// ENV (optional):
//   INVOICE_ISSUER_NAME=YourPlatform GmbH
//   INVOICE_ISSUER_ADDRESS=Musterstraße 1\n1010 Wien\nÖsterreich
//   INVOICE_ISSUER_VATID=ATU12345678
//   INVOICE_FONT_TTF=public/fonts/Inter-Regular.ttf
//   INVOICE_ENABLE_REVERSE_CHARGE=0|1
//   INVOICE_VAT_RATE=20
//   INVOICE_LOGO_PATH=public/logo.png

import fs from 'node:fs'
import path from 'node:path'
import { supabaseAdmin } from '@/lib/supabase-admin'

const COMMISSION_RATE = 0.07 as const

// ---------- Font-Ladung: FS -> HTTP (/public) -> Fallback ----------
let _cachedFont: Buffer | null = null

function publicUrlFromRel(rel: string): string | null {
  // rel ist z. B. "public/fonts/Inter-Regular.ttf"
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!base) return null
  const clean = rel.startsWith('public/') ? rel.slice('public'.length) : rel
  const urlPath = clean.startsWith('/') ? clean : `/${clean}`
  return `${base}${urlPath}`
}

async function loadInvoiceFontBuffer(): Promise<Buffer | null> {
  if (_cachedFont) return _cachedFont

  const rel = process.env.INVOICE_FONT_TTF || 'public/fonts/Inter-Regular.ttf'

  // 1) Lokal/Dev: aus FS lesen (wirft in Lambda -> try/catch)
  try {
    const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel)
    _cachedFont = fs.readFileSync(abs)
    return _cachedFont
  } catch {
    // ignore, versuche HTTP
  }

  // 2) Prod/Lambda: per HTTP aus /public
  try {
    const url = publicUrlFromRel(rel)
    if (url) {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        _cachedFont = Buffer.from(await res.arrayBuffer())
        return _cachedFont
      }
    }
  } catch {
    // ignore, weiter zu Fallback
  }

  // 3) Fallback – keine eingebettete Schrift (nutze Helvetica)
  return null
}
// -------------------------------------------------------------------

function normalizeMultiline(v?: string) {
  return v ? v.replace(/\\n/g, '\n') : v
}

type TaxMode = 'VAT_INCLUDED' | 'REVERSE_CHARGE'

async function renderPdfBuffer(payload: {
  platform: { name: string; address?: string; vatId?: string }
  seller:   { name: string; company?: string | null; vatId?: string | null; addressText?: string | null }
  invoice:  {
    number: string; issuedAt: Date; currency: string
    orderId: string; requestTitle?: string | null; offerId?: string | number | null
    grossCents: number; feeCents: number; payoutCents: number
    taxMode: TaxMode
  }
}): Promise<Buffer> {
  const PDFKit = (await import('pdfkit')).default
  const doc = new PDFKit({ size: 'A4', margin: 56 }) // A4, ~2cm Rand

  // Schrift
  const fontBuf = await loadInvoiceFontBuffer()
  if (fontBuf) {
    doc.registerFont('Body', fontBuf).font('Body')
  } else {
    doc.font('Helvetica')
  }

  // Logo RECHTS OBEN (optional)
  const logoPath = process.env.INVOICE_LOGO_PATH
  if (logoPath) {
    try {
      const abs = path.isAbsolute(logoPath) ? logoPath : path.join(process.cwd(), logoPath)
      const imgW = 120
      const pageW = (doc as any).page.width
      const { top, right } = (doc as any).page.margins
      const x = pageW - right - imgW
      const y = top - 8
      doc.image(abs, x, y, { width: imgW })
      const afterLogoY = y + imgW * 0.35
      if (doc.y < afterLogoY) doc.y = afterLogoY
      doc.moveDown(0.5)
    } catch {
      // Logo ist optional
    }
  }

  const chunks: Uint8Array[] = []
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks as any)))
    doc.on('error', reject)
  })

  const { platform, seller, invoice } = payload
  const fmtMoney = (cents: number) =>
    (cents / 100).toLocaleString('de-AT', { style: 'currency', currency: invoice.currency.toUpperCase() })

  // Layout-Konstanten (zweispaltig, rechtsbündige Zahlen)
  const PAGE_LEFT = 56
  const PAGE_RIGHT = 56 + 483 // A4(595) - 2*56 ≈ 483 nutzbare Breite
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
  // Firma (gewerblich) und darunter – falls abweichend – die Person/der Benutzername
  if (seller.company) doc.fontSize(11).text(seller.company)
  if (seller.name && (!seller.company || seller.name !== seller.company)) {
    doc.fontSize(11).text(seller.name)
  }
  if (seller.addressText) doc.text(seller.addressText)
  if (seller.vatId)       doc.text(`UID: ${seller.vatId}`)
  doc.moveDown(1.0)

  // Beschreibung
  const provLabel =
    invoice.taxMode === 'REVERSE_CHARGE'
      ? 'Vermittlungsprovision 7% (Reverse-Charge)'
      : 'Vermittlungsprovision 7% (inkl. USt)'
  const descr = [
    provLabel,
    invoice.requestTitle ? `Bezug: ${invoice.requestTitle}` : null,
    invoice.offerId ? `Angebot #${invoice.offerId}` : null,
    `Order #${invoice.orderId}`,
  ].filter(Boolean).join(' · ')
  doc.fontSize(12).text(descr)
  doc.moveDown(0.8)

  // Beträge
  row('Auftragswert (brutto):', fmtMoney(invoice.grossCents))
  row('Provision 7%:',         '– ' + fmtMoney(invoice.feeCents))
  doc.moveDown(0.2)
  doc.fontSize(12)
  row('Auszahlung an Verkäufer:', fmtMoney(invoice.payoutCents))

  // Fußnote
  doc.moveDown(1.2).fontSize(9).fillColor('#666')
  if (invoice.taxMode === 'REVERSE_CHARGE') {
    doc.text('Hinweis: Reverse-Charge (Art. 44, 196 MwStSystRL / §3a UStG). USt-Schuld geht auf den Leistungsempfänger über.')
  } else {
    doc.text('Hinweis: Die 7% Provision enthalten sämtliche ggf. anfallende USt der Plattform.')
  }
  doc.end()

  return done
}

/**
 * Idempotent: erstellt/holt Rechnungs-Datensatz (public.platform_invoices),
 * rendert PDF mit der DB-Nummer, lädt es in den Storage und updatet pdf_path.
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

  // Bereits vorhandene Rechnung?
  {
    const { data: existing } = await admin
      .from('platform_invoices')
      .select('id, pdf_path')
      .eq('order_id', order.id)
      .maybeSingle()
    if (existing) return { ok: true, already: true, id: existing.id, pdf_path: existing.pdf_path }
  }

  // Offer + Snapshot
  const { data: offer } = await admin
    .from('lack_offers')
    .select('id, item_amount_cents, shipping_cents, amount_cents')
    .eq('id', order.offer_id)
    .maybeSingle()

  const { data: offerSnap } = await admin
    .from('lack_offer_snapshots')
    .select('amount_cents, item_amount_cents, shipping_cents')
    .eq('offer_id', order.offer_id)
    .limit(1)
    .maybeSingle()

  // Request (Titel)
  const { data: req } = await admin
    .from('lack_requests')
    .select('id, title')
    .eq('id', order.request_id)
    .maybeSingle()

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
    sellerName = displayName || s.username || ''   // <<< displayName bevorzugen
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

  // Auftrags-Brutto bevorzugt aus Snapshot
  const orderGrossCents =
    Number.isInteger(offerSnap?.amount_cents) ? offerSnap!.amount_cents! :
    Number.isInteger(order.amount_cents)      ? order.amount_cents! :
    Number.isInteger(offer?.amount_cents)     ? offer!.amount_cents! :
    ((offerSnap?.item_amount_cents ?? offer?.item_amount_cents ?? 0) +
     (offerSnap?.shipping_cents     ?? offer?.shipping_cents     ?? 0))

  const feeCents    = Math.round(orderGrossCents * COMMISSION_RATE)
  const payoutCents = Math.max(0, orderGrossCents - feeCents)

  // Steuer-Mode
  const rcEnabled  = process.env.INVOICE_ENABLE_REVERSE_CHARGE === '1'
  const vatRateEnv = Number(process.env.INVOICE_VAT_RATE || '20')
  const vatRate    = Number.isFinite(vatRateEnv) ? Math.max(0, vatRateEnv) : 20
  let taxMode: TaxMode = 'VAT_INCLUDED'
  const vat = (sellerVat || '').toUpperCase().trim()
  const isBusiness = (sellerAccountType || '').toLowerCase() === 'business'
  if (rcEnabled && isBusiness && vat && !vat.startsWith('AT')) {
    taxMode = 'REVERSE_CHARGE'
  }

  // Netto/USt der 7%-Gebühr (nur Info, Summen bleiben fee/payout/total)
  let net_amount_cents: number
  let vat_cents: number
  let applied_vat_rate: number
  if (taxMode === 'REVERSE_CHARGE') {
    net_amount_cents = feeCents
    vat_cents = 0
    applied_vat_rate = 0
  } else {
    const divisor = 1 + (vatRate / 100)
    net_amount_cents = Math.round(feeCents / divisor)
    vat_cents = feeCents - net_amount_cents
    applied_vat_rate = vatRate
  }

  // Plattform-Absender
  const platform = {
    name:    process.env.INVOICE_ISSUER_NAME    || 'YourPlatform GmbH',
    address: normalizeMultiline(process.env.INVOICE_ISSUER_ADDRESS || 'Musterstraße 1\n1010 Wien\nÖsterreich'),
    vatId:   process.env.INVOICE_ISSUER_VATID   || undefined,
  }

  const issuedAt = new Date(order.released_at || new Date().toISOString())

  // 1) INSERT in platform_invoices (DB generiert number)
  const insertPayload: any = {
    order_id:           order.id,
    supplier_id:        order.supplier_id,
    buyer_id:           order.buyer_id,
    seller_id:          order.supplier_id,   // legacy-kompatibel
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
      title:      (await admin.from('lack_requests').select('title').eq('id', order.request_id).maybeSingle()).data?.title ?? null,
      taxMode,
      fee_breakdown: { net_cents: net_amount_cents, vat_cents, vat_rate: applied_vat_rate },
    },
  }

  const ins = await admin
    .from('platform_invoices')
    .insert(insertPayload)
    .select('id, number')
    .maybeSingle()
  if (ins.error || !ins.data) throw new Error(`invoice insert failed: ${ins.error?.message || 'insert returned no row'}`)

  const dbId = ins.data.id
  const dbNumber = ins.data.number as string

  // 2) PDF erzeugen mit DB-Rechnungsnummer
  const pdf = await renderPdfBuffer({
    platform,
    seller: { name: sellerName, company: sellerCompany, vatId: sellerVat, addressText: sellerAddressText },
    invoice: {
      number: dbNumber,
      issuedAt,
      currency: (order.currency || 'eur'),
      orderId: order.id,
      requestTitle: (await admin.from('lack_requests').select('title').eq('id', order.request_id).maybeSingle()).data?.title ?? null,
      offerId: offer?.id ?? null,
      grossCents: orderGrossCents,
      feeCents,
      payoutCents,
      taxMode,
    },
  })

  // 3) Upload
  const year  = issuedAt.getFullYear()
  const month = String(issuedAt.getMonth() + 1).padStart(2, '0')
  const pathOnStorage = `${order.supplier_id}/${year}/${month}/${dbNumber}.pdf`

  const up = await admin.storage
    .from('invoices')
    .upload(pathOnStorage, pdf, { contentType: 'application/pdf', upsert: false })
  if (up.error && (up.error as any)?.statusCode !== '409') {
    throw new Error(`invoice upload failed: ${up.error.message}`)
  }

  // 4) pdf_path nachtragen
  const upd = await admin
    .from('platform_invoices')
    .update({ pdf_path: pathOnStorage })
    .eq('id', dbId)
  if (upd.error) throw new Error(`invoice update failed: ${upd.error.message}`)

  return { ok: true, id: dbId, pdf_path: pathOnStorage }
}

// Alias
export { createCommissionInvoiceForOrder as ensureInvoiceForOrder }
