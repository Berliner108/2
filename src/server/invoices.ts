import fs from 'node:fs'
import path from 'node:path'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

const COMMISSION_RATE = 0.07 as const

function normalizeMultiline(v?: string) {
  return v ? v.replace(/\\n/g, '\n') : v
}

async function fetchAsBuffer(url: string): Promise<Buffer | null> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}
function publicUrlFromRel(rel: string): string | null {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!base) return null
  const clean = rel.startsWith('public/') ? rel.slice('public'.length) : rel
  const urlPath = clean.startsWith('/') ? clean : `/${clean}`
  return `${base}${urlPath}`
}
let _cachedFont: Buffer | null = null
export async function loadInvoiceFontBuffer(): Promise<Buffer | null> {
  if (_cachedFont) return _cachedFont
  const rel = process.env.INVOICE_FONT_TTF || 'public/fonts/Inter-Regular.ttf'
  try {
    const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel)
    _cachedFont = fs.readFileSync(abs)
    return _cachedFont
  } catch {}
  if (rel.startsWith('http')) {
    const buf = await fetchAsBuffer(rel)
    if (buf) { _cachedFont = buf; return buf }
  }
  const url = publicUrlFromRel(rel)
  if (url) {
    const buf = await fetchAsBuffer(url)
    if (buf) { _cachedFont = buf; return buf }
  }
  return null
}

type TaxMode = 'VAT_INCLUDED' | 'REVERSE_CHARGE' | 'NON_TAXABLE'

function decideTaxMode({
  isBusiness,
  sellerVat,
  sellerCountryIso2
}: {
  isBusiness: boolean
  sellerVat?: string | null
  sellerCountryIso2?: string | null
}): { mode: TaxMode; atVatRate: number } {
  const AT_RATE = Number(process.env.INVOICE_VAT_RATE || '20')

  if (!isBusiness) return { mode: 'VAT_INCLUDED', atVatRate: AT_RATE }

  const vat = (sellerVat || '').trim().toUpperCase()
  const country = (sellerCountryIso2 || '').trim().toUpperCase()

  if (country === 'AT' || vat.startsWith('AT')) {
    return { mode: 'VAT_INCLUDED', atVatRate: AT_RATE }
  }

  const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
  if (EU.has(country)) return { mode: 'REVERSE_CHARGE', atVatRate: 0 }

  return { mode: 'NON_TAXABLE', atVatRate: 0 }
}

function splitGrossInclusive(grossCents: number, vatRatePct: number) {
  const net = Math.round(grossCents / (1 + vatRatePct / 100))
  const vat = grossCents - net
  return { net, vat }
}

export async function createCommissionInvoiceForOrder(orderId: string) {
  const admin = supabaseAdmin()

  const { data: order, error: oErr } = await admin
    .from('orders')
    .select('id, created_at, kind, currency, buyer_id, supplier_id, request_id, offer_id, amount_cents, released_at')
    .eq('id', orderId)
    .maybeSingle()
  if (oErr) throw new Error(`order lookup failed: ${oErr.message}`)
  if (!order) throw new Error('order not found')
  if (order.kind !== 'lack') return { skipped: true, reason: 'non-lack order' }

  const currency = (order.currency || 'eur').toUpperCase()

  const { data: reqRow } = await admin
    .from('lack_requests')
    .select('id, title, data')
    .eq('id', order.request_id)
    .maybeSingle()
  const requestTitle =
    reqRow?.title ||
    (reqRow?.data as any)?.verfahrenstitel ||
    (reqRow?.data as any)?.verfahrenTitel ||
    null

  const [{ data: snapRow }, { data: prof }] = await Promise.all([
    admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', order.offer_id).maybeSingle(),
    admin.from('profiles').select('username, company_name, vat_number, address, account_type').eq('id', order.supplier_id).maybeSingle()
  ])
  const snap = (snapRow?.snapshot ?? {}) as any
  const vendorDisplay =
    snap.company_name || snap.username ||
    prof?.company_name || prof?.username || 'Verkäufer'
  const vendorVat = (snap.vat_number ?? prof?.vat_number ?? '') || null
  const vendorAddr = (snap.address ?? prof?.address ?? null) as any
  const accType = (snap.account_type ?? prof?.account_type ?? '') as string | null
  const isBusiness = (accType || '').toLowerCase() === 'business' || !!(vendorVat || '').trim()
  const sellerCountryIso2 = (vendorAddr?.country || '').toString().toUpperCase()

  const { mode: taxMode, atVatRate } = decideTaxMode({ isBusiness, sellerVat: vendorVat, sellerCountryIso2 })

  const orderGrossCents = Number.isFinite(order.amount_cents) ? Number(order.amount_cents) : 0
  const feeGrossCents   = Math.round(orderGrossCents * COMMISSION_RATE)

  let feeNetCents = feeGrossCents
  let feeVatCents = 0
  let appliedVatRate = 0
  let taxLabel: 'MwSt' | 'USt' | 'MWST' | 'VAT' = 'USt'
  const notes: string[] = []

  if (!isBusiness) taxLabel = 'MwSt'
  else if (sellerCountryIso2 === 'AT' || (vendorVat || '').toUpperCase().startsWith('AT')) taxLabel = 'USt'
  else if (sellerCountryIso2 === 'CH' || sellerCountryIso2 === 'LI') taxLabel = 'MWST'
  else taxLabel = 'USt'

  if (taxMode === 'VAT_INCLUDED') {
    appliedVatRate = atVatRate
    const s = splitGrossInclusive(feeGrossCents, appliedVatRate)
    feeNetCents = s.net
    feeVatCents = s.vat
    notes.push('Die 7% Provision enthält die gesetzliche österreichische Steuer.')
  } else if (taxMode === 'REVERSE_CHARGE') {
    appliedVatRate = 0
    notes.push('Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).')
  } else {
    appliedVatRate = 0
    notes.push('Leistung außerhalb des Anwendungsbereichs der österreichischen USt (Drittland).')
  }

  const payoutCents = Math.max(0, orderGrossCents - feeGrossCents)
  const issuedAt = new Date(order.released_at || new Date().toISOString())

  const { data: existing } = await admin
    .from('platform_invoices')
    .select('id, number, pdf_path')
    .eq('order_id', order.id)
    .maybeSingle()

  let dbId: string
  let invNumber: string

  if (existing) {
    dbId = existing.id
    invNumber = existing.number as string
  } else {
    const ins = await admin
      .from('platform_invoices')
      .insert({
        order_id: order.id,
        supplier_id: order.supplier_id,
        buyer_id: order.buyer_id,
        total_gross_cents: orderGrossCents,
        fee_cents: feeGrossCents,
        net_payout_cents: payoutCents,
        currency: currency.toLowerCase(),
        issued_at: issuedAt.toISOString(),
        meta: {
          request_id: order.request_id,
          offer_id: order.offer_id,
          tax: { mode: taxMode, vat_rate: appliedVatRate, vat_cents: feeVatCents, net_cents: feeNetCents }
        }
      })
      .select('id, number')
      .maybeSingle()
    if (ins.error || !ins.data) throw new Error(`invoice insert failed: ${ins.error?.message || 'no row'}`)
    dbId = ins.data.id
    invNumber = ins.data.number as string
  }

  const platform = {
    name: process.env.INVOICE_ISSUER_NAME || 'Beschichter Scout GmbH',
    address: normalizeMultiline(process.env.INVOICE_ISSUER_ADDRESS || 'Kärntner Straße 1\n1010 Wien\nÖsterreich'),
    vatId: process.env.INVOICE_ISSUER_VATID || undefined
  }

  const pdf = await renderInvoicePdfBuffer({
    invoiceNumber: invNumber,
    issueDate: issuedAt,
    currency,
    platform: { name: platform.name, vatId: platform.vatId, address: platform.address },
    vendor: { displayName: vendorDisplay, vatId: vendorVat, address: vendorAddr || null },
    line: {
      title: `Vermittlungsprovision 7% auf Auftrag #${order.id}${requestTitle ? ` – ${requestTitle}` : ''}`,
      qty: 1,
      unitPriceGrossCents: Math.round(orderGrossCents * COMMISSION_RATE)
    },
    totals: {
      vatRate: appliedVatRate,
      grossCents: Math.round(orderGrossCents * COMMISSION_RATE),
      netCents: feeNetCents,
      vatCents: feeVatCents
    },
    meta: {
      orderId: order.id,
      requestTitle,
      orderGrossCents,
      payoutCents,
      taxLabel,
      notes
    }
  })

  const year = issuedAt.getFullYear()
  const pathOnStorage = `${order.supplier_id}/${year}/${invNumber}.pdf`
  const up = await admin.storage.from('invoices').upload(pathOnStorage, pdf, { contentType: 'application/pdf', upsert: true })
  if (up.error) throw new Error(`invoice upload failed: ${up.error.message}`)

  await admin.from('platform_invoices').update({ pdf_path: pathOnStorage }).eq('id', dbId)

  return { ok: true, id: dbId, number: invNumber, pdf_path: pathOnStorage }
}

export { createCommissionInvoiceForOrder as ensureInvoiceForOrder }
