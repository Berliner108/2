'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

const FEE_PCT = 7.0
const DEFAULT_VAT_RATE = parseFloat(process.env.INVOICE_VAT_RATE || '20.00') // AT-Standard

const ISSUER_NAME = process.env.INVOICE_ISSUER_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Plattform'
const ISSUER_VAT  = process.env.INVOICE_ISSUER_VAT_ID || process.env.APP_VAT_NUMBER || ''
const ISSUER_ADDR_STRING =
  (process.env.INVOICE_ISSUER_ADDRESS || '').replace(/\\n/g, '\n') || 'Kärntner Straße 1\n1010 Wien\nÖsterreich'

// --- Helpers -------------------------------------------------------------
function cents(n: number) { return Math.round(n) }
function splitGrossInclusive(gross: number, ratePct: number) {
  const net = Math.round(gross / (1 + ratePct / 100))
  const vat = gross - net
  return { net, vat }
}
function normCountry(raw?: string | null): 'AT'|'DE'|'CH'|'LI'|'EU'|'OTHER' {
  const s = (raw || '').toString().trim().toLowerCase()
  if (!s) return 'OTHER'
  const at = ['at','aut','österreich','oesterreich','austria']
  const de = ['de','deu','deutschland','germany']
  const ch = ['ch','che','schweiz','suisse','svizzera','switzerland']
  const li = ['li','lie','liechtenstein']
  if (at.includes(s)) return 'AT'
  if (de.includes(s)) return 'DE'
  if (ch.includes(s)) return 'CH'
  if (li.includes(s)) return 'LI'
  // simpler EU-Fallback
  const EU = new Set(['be','bg','hr','cy','cz','dk','ee','fi','fr','gr','hu','ie','it','lv','lt','lu','mt','nl','pl','pt','ro','sk','si','es','se'])
  if (EU.has(s)) return 'EU'
  return 'OTHER'
}
function resolveVatLabel(isBusiness: boolean, cc: 'AT'|'DE'|'CH'|'LI'|'EU'|'OTHER'): 'MwSt'|'USt'|'MWST'|'VAT' {
  if (!isBusiness) return 'MwSt'         // B2C: immer MwSt
  if (cc === 'AT' || cc === 'DE' || cc === 'EU') return 'USt'
  if (cc === 'CH' || cc === 'LI') return 'MWST'
  return 'VAT'
}
// ------------------------------------------------------------------------

export async function generatePlatformInvoice(orderId: string) {
  const admin = supabaseAdmin()

  // Order
  const { data: ord, error: ordErr } = await admin
    .from('orders')
    .select('id, kind, buyer_id, supplier_id, offer_id, request_id, amount_cents, currency, released_at')
    .eq('id', orderId).maybeSingle()
  if (ordErr) throw new Error(ordErr.message)
  if (!ord) throw new Error('Order not found')
  if (ord.kind !== 'lack') throw new Error('Unsupported order kind')
  if (!ord.released_at) throw new Error('Order not released')

  // Snapshot + Request (Titel)
  const [{ data: snapRow }, { data: reqRow }, { data: offerRow }] = await Promise.all([
    admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', ord.offer_id).maybeSingle(),
    admin.from('lack_requests').select('id, title, data').eq('id', ord.request_id).maybeSingle(),
    admin.from('lack_offers').select('item_amount_cents, shipping_cents').eq('id', ord.offer_id).maybeSingle(),
  ])

  // Vendor-Daten + Steuerkontext
  let vendorDisplay = 'Verkäufer'
  let vendorVat: string | null = null
  let vendorAddr: any = null
  let accountType: string | null = null
  let countryCode: 'AT'|'DE'|'CH'|'LI'|'EU'|'OTHER' = 'OTHER'

  if (snapRow?.snapshot) {
    const s = snapRow.snapshot as any
    vendorDisplay = s.company_name || s.username || 'Verkäufer'
    vendorVat     = s.vat_number ?? null
    vendorAddr    = s.address ?? null
    accountType   = s.account_type ?? null
    countryCode   = normCountry(s.address?.country)
  } else {
    const { data: vProf } = await admin
      .from('profiles')
      .select('company_name, username, vat_number, address, account_type')
      .eq('id', ord.supplier_id).maybeSingle()
    vendorDisplay = vProf?.company_name || vProf?.username || 'Verkäufer'
    vendorVat     = vProf?.vat_number ?? null
    vendorAddr    = (vProf as any)?.address ?? null
    accountType   = (vProf as any)?.account_type ?? null
    countryCode   = normCountry((vProf as any)?.address?.country)
  }

  const isBusiness = (accountType || '').toLowerCase() === 'business' || !!(vendorVat && vendorVat.trim())
  const vatLabel   = resolveVatLabel(isBusiness, countryCode)

  // Beträge
  const currency = (ord.currency || 'eur').toUpperCase()
  const itemCents = Number(offerRow?.item_amount_cents ?? ord.amount_cents ?? 0)
  const shipCents = Number(offerRow?.shipping_cents ?? 0)
  const orderGrossCents = Number(ord.amount_cents ?? itemCents + shipCents)
  const feeGrossCents   = cents(orderGrossCents * (FEE_PCT / 100))
  const payoutCents     = Math.max(0, orderGrossCents - feeGrossCents)

  // Steuer-Regel
  let appliedVatRate = 0
  let feeNetCents = feeGrossCents
  let feeVatCents = 0
  const notes: string[] = []

  if (!isBusiness) {
    // B2C: immer AT-MwSt
    appliedVatRate = DEFAULT_VAT_RATE
    const s = splitGrossInclusive(feeGrossCents, appliedVatRate)
    feeNetCents = s.net
    feeVatCents = s.vat
  } else if (countryCode === 'AT') {
    // B2B AT
    appliedVatRate = DEFAULT_VAT_RATE
    const s = splitGrossInclusive(feeGrossCents, appliedVatRate)
    feeNetCents = s.net
    feeVatCents = s.vat
  } else if (countryCode === 'DE' || countryCode === 'EU') {
    // B2B EU ≠ AT: Reverse Charge
    appliedVatRate = 0
    notes.push('Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).')
  } else if (countryCode === 'CH' || countryCode === 'LI' || countryCode === 'OTHER') {
    appliedVatRate = 0
    notes.push('Leistung außerhalb des Anwendungsbereichs der österreichischen USt (Drittland).')
  }

  // PDF
  const invId = crypto.randomUUID()
  const invNo = `INV-${new Date().getFullYear()}-${invId.slice(0,8).toUpperCase()}`

  const pdfBuf = await renderInvoicePdfBuffer({
    invoiceNumber: invNo,
    issueDate: new Date(ord.released_at),
    currency,
    platform: {
      name: ISSUER_NAME,
      vatId: ISSUER_VAT,
      // wir geben die Adresse als String; pdf.ts kann String ODER Address rendern
      address: ISSUER_ADDR_STRING,
    },
    vendor: { displayName: vendorDisplay, vatId: vendorVat, address: vendorAddr || null },
    line: {
      title: `Vermittlungsprovision ${FEE_PCT}% auf Auftrag #${ord.id}${reqRow?.title ? ` – ${reqRow.title}` : ''}`,
      qty: 1,
      unitPriceGrossCents: feeGrossCents,
    },
    totals: {
      vatRate: appliedVatRate,
      grossCents: feeGrossCents,
      netCents: feeNetCents,
      vatCents: feeVatCents,
    },
    meta: {
      orderId: ord.id,
      requestTitle: reqRow?.title || (reqRow?.data as any)?.verfahrenstitel || null,
      vatLabel,                  // << richtiges Label: MwSt/USt/MWST/VAT
      notes,                     // << Hinweise (RC/Drittland)
      orderGrossCents,           // << Auftragswert (brutto)
      payoutCents,               // << Auszahlung an Verkäufer
    },
  })

  // Upload
  const yyyy = new Date().getFullYear()
  const objectPath = `vendor/${ord.supplier_id}/${yyyy}/${invId}.pdf`
  const up = await admin.storage.from('invoices').upload(objectPath, pdfBuf, {
    contentType: 'application/pdf',
    upsert: true,
  })
  if (up.error) throw new Error(up.error.message)

  // DB
  const { data: ins, error: insErr } = await admin.from('invoices').insert({
    id: invId,
    order_id: ord.id,
    vendor_id: ord.supplier_id,
    buyer_id: ord.buyer_id,
    kind: 'platform_fee',
    currency: currency.toLowerCase(),
    net_amount_cents: feeNetCents,
    vat_rate: appliedVatRate,
    vat_cents: feeVatCents,
    gross_cents: feeGrossCents,
    fee_base_cents: orderGrossCents,
    fee_pct: FEE_PCT,
    pdf_path: objectPath,
    meta: { invoiceNumber: invNo, orderGrossCents, payoutCents, vatLabel, notes },
  }).select('id').single()
  if (insErr) throw new Error(insErr.message)

  // Signed URL
  const { data: signed, error: sErr } = await admin.storage
    .from('invoices')
    .createSignedUrl(objectPath, 600)
  if (sErr) throw new Error(sErr.message)

  return { id: ins.id, number: invNo, pdf_path: objectPath, url: signed!.signedUrl }
}
