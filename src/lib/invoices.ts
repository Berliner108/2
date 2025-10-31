// /src/lib/invoices.ts
'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

const FEE_PCT = 7.0 // fix
const DEFAULT_VAT_RATE = parseFloat(process.env.INVOICE_VAT_RATE || '20.00') // AT-Standard
const ISSUER_NAME = process.env.INVOICE_ISSUER_NAME || (process.env.NEXT_PUBLIC_APP_NAME || 'Plattform')
const ISSUER_VAT  = process.env.INVOICE_ISSUER_VAT_ID || process.env.APP_VAT_NUMBER || ''
const ISSUER_ADDR = (() => {
  try { return JSON.parse(process.env.INVOICE_ISSUER_ADDRESS || process.env.APP_ADDRESS_JSON || '{}') } catch { return {} as any }
})()

function cents(n: number) { return Math.round(n) }
function splitGrossInclusive(gross: number, ratePct: number) {
  const net = Math.round(gross / (1 + ratePct / 100))
  const vat = gross - net
  return { net, vat }
}

export async function generatePlatformInvoice(orderId: string) {
  const admin = supabaseAdmin()

  // ---- 0) Order laden & Sanity
  const { data: ord, error: ordErr } = await admin
    .from('orders')
    .select('id, kind, buyer_id, supplier_id, offer_id, request_id, amount_cents, currency, released_at, created_at')
    .eq('id', orderId)
    .maybeSingle()
  if (ordErr) throw new Error(ordErr.message)
  if (!ord) throw new Error('Order not found')
  if (ord.kind !== 'lack') throw new Error('Unsupported order kind')
  if (!ord.released_at) throw new Error('Order not released')

  // ---- 1) Idempotenz: existierende Rechnungszeile?
  const { data: existing } = await admin
    .from('invoices')
    .select('id, pdf_path, meta')
    .eq('order_id', ord.id)
    .eq('kind', 'platform_fee')
    .maybeSingle()

  if (existing?.pdf_path) {
    const { data: signed, error: sErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(existing.pdf_path, 600)
    if (sErr) throw new Error(sErr.message)
    return { id: existing.id, number: existing.meta?.invoiceNumber, pdf_path: existing.pdf_path, url: signed!.signedUrl }
  }

  // ---- 2) Offer-/Profil-Snapshot & Request
  const [{ data: snapRow }, { data: reqRow }, { data: offerRow }] = await Promise.all([
    admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', ord.offer_id).maybeSingle(),
    admin.from('lack_requests').select('id, title, data, lieferdatum').eq('id', ord.request_id).maybeSingle(),
    admin.from('lack_offers').select('item_amount_cents, shipping_cents').eq('id', ord.offer_id).maybeSingle(),
  ])

  // Lieferantenanzeige aus Snapshot (fallback: aktuelles Profil)
  let vendorDisplay = 'Verkäufer'
  let vendorVat: string | null = null
  let vendorAddr: any = null

  if (snapRow?.snapshot) {
    vendorDisplay = snapRow.snapshot.company_name || snapRow.snapshot.username || 'Verkäufer'
    vendorVat     = snapRow.snapshot.vat_number ?? null
    vendorAddr    = snapRow.snapshot.address ?? null
  } else {
    const { data: vProf } = await admin
      .from('profiles')
      .select('company_name, username, vat_number, address')
      .eq('id', ord.supplier_id)
      .maybeSingle()
    vendorDisplay = vProf?.company_name || vProf?.username || 'Verkäufer'
    vendorVat     = vProf?.vat_number ?? null
    vendorAddr    = vProf?.address ?? null
  }

  // >>> VAT-Label je nach Vorhandensein einer UID: Gewerblich = USt, Privat = MwSt
  const hasVatId = !!(vendorVat && String(vendorVat).trim().length > 0)
  const vatLabel = hasVatId ? 'USt' : 'MwSt'

  // ---- 3) Beträge (7% immer brutto vom Orderbetrag)
  const currency = (ord.currency || 'eur').toUpperCase()
  const itemCents = Number(offerRow?.item_amount_cents ?? ord.amount_cents ?? 0)
  const shipCents = Number(offerRow?.shipping_cents ?? 0)
  const orderGrossCents = Number(ord.amount_cents ?? itemCents + shipCents)

  const feeGrossCents = cents(orderGrossCents * (FEE_PCT / 100)) // 7% vom Brutto
  const vatRate       = DEFAULT_VAT_RATE                         // ggf. später dynamisch (AT/DE/CH etc.)
  const { net: feeNetCents, vat: feeVatCents } = splitGrossInclusive(feeGrossCents, vatRate)

  const payoutCents = orderGrossCents - feeGrossCents

  // ---- 4) PDF bauen
  const invId = crypto.randomUUID()
  const invNo = `INV-${new Date().getFullYear()}-${invId.slice(0,8).toUpperCase()}`

  const pdfBuf = await renderInvoicePdfBuffer({
    invoiceNumber: invNo,
    issueDate: new Date(),
    currency,
    platform: { name: ISSUER_NAME, vatId: ISSUER_VAT, address: ISSUER_ADDR as any },
    vendor: { displayName: vendorDisplay, vatId: vendorVat, address: vendorAddr || null },
    line: {
      title: `Vermittlungsprovision ${FEE_PCT}% auf Auftrag #${ord.id}${reqRow?.title ? ` – ${reqRow.title}` : ''}`,
      qty: 1,
      unitPriceGrossCents: feeGrossCents,
    },
    totals: {
      vatRate,
      grossCents: feeGrossCents,
      netCents: feeNetCents,
      vatCents: feeVatCents,
    },
    meta: {
      orderId: ord.id,
      requestId: ord.request_id,
      offerId: ord.offer_id,
      requestTitle: reqRow?.title || reqRow?.data?.verfahrenstitel || null,
      orderGrossCents,
      payoutCents,
      vatLabel, // <<< wichtig für MwSt/USt im PDF
    },
  })

  // ---- 5) Upload (Storage)
  const yyyy = new Date().getFullYear()
  const objectPath = `vendor/${ord.supplier_id}/${yyyy}/${invId}.pdf`
  const up = await admin.storage.from('invoices').upload(objectPath, pdfBuf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (up.error) throw new Error(up.error.message)

  // ---- 6) DB schreiben
  const { data: ins, error: insErr } = await admin.from('invoices').insert({
    id: invId,
    order_id: ord.id,
    vendor_id: ord.supplier_id,
    buyer_id: ord.buyer_id,
    kind: 'platform_fee',
    currency: currency.toLowerCase(),
    net_amount_cents: feeNetCents,
    vat_rate: vatRate,
    vat_cents: feeVatCents,
    gross_cents: feeGrossCents,
    fee_base_cents: orderGrossCents,
    fee_pct: FEE_PCT,
    pdf_path: objectPath,
    meta: { invoiceNumber: invNo, orderGrossCents, payoutCents, vatLabel }, // <<< mit speichern
  }).select('id').single()
  if (insErr) throw new Error(insErr.message)

  // ---- 7) Signed URL zurückgeben
  const { data: signed, error: sErr } = await admin.storage
    .from('invoices')
    .createSignedUrl(objectPath, 600)
  if (sErr) throw new Error(sErr.message)

  return { id: ins.id, number: invNo, pdf_path: objectPath, url: signed!.signedUrl }
}
