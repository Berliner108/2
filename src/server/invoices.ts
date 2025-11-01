// /src/server/invoices.ts
// Komplette Server-Logik für Plattform-Provisionsrechnungen (7% fix)

import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'
import type { InvoiceRenderData } from '@/lib/invoices/pdf'

const COMMISSION_RATE = 0.07 as const
const AT_STANDARD_VAT = Number(process.env.INVOICE_VAT_RATE || '20')

type Jurisdiction = 'AT' | 'DE' | 'CH' | 'LI' | 'EU_OTHER' | 'NON_EU'
type TaxMode = 'B2C_AT_VAT' | 'B2B_AT_VAT' | 'B2B_EU_RC' | 'B2B_NON_EU_OUT'
type AccountType = 'business' | 'private' | '' | null
type TaxLabel = NonNullable<InvoiceRenderData['meta']>['taxLabel'] // 'MwSt' | 'USt' | 'MWST' | 'VAT'

function normStr(v?: string | null) { return (v || '').trim() }
function isBusiness(accountType?: string | null, vat?: string | null) {
  const t = (accountType || '').toLowerCase()
  return t === 'business' || !!normStr(vat)
}
function countryToJurisdiction(country?: string | null): Jurisdiction {
  const c = (country || '').toUpperCase()
  if (c === 'AT') return 'AT'
  if (c === 'DE') return 'DE'
  if (c === 'CH') return 'CH'
  if (c === 'LI') return 'LI'
  const EU = new Set([
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT',
    'LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'
  ])
  if (EU.has(c)) return 'EU_OTHER'
  return 'NON_EU'
}

function decideTaxMode(isBiz: boolean, jurisdiction: Jurisdiction): TaxMode {
  if (!isBiz) return 'B2C_AT_VAT'         // B2C: immer AT-MwSt (Wunsch)
  if (jurisdiction === 'AT') return 'B2B_AT_VAT'
  if (jurisdiction === 'DE' || jurisdiction === 'EU_OTHER') return 'B2B_EU_RC'
  return 'B2B_NON_EU_OUT' // CH/LI/Non-EU
}

// 🔧 exakt auf den Union-Typ einschränken:
function taxLabelFor(j: Jurisdiction, isBiz: boolean): TaxLabel {
  if (!isBiz && j !== 'CH' && j !== 'LI') return 'MwSt'
  if (j === 'AT') return isBiz ? 'USt' : 'MwSt'
  if (j === 'DE') return 'USt'
  if (j === 'CH' || j === 'LI') return 'MWST'
  return 'VAT'
}

function splitGrossInclusive(grossCents: number, vatRatePct: number) {
  const net = Math.round(grossCents / (1 + vatRatePct / 100))
  const vat = grossCents - net
  return { net, vat }
}

export async function createCommissionInvoiceForOrder(orderId: string) {
  const admin = supabaseAdmin()

  // ---- Order laden
  const { data: order, error: oErr } = await admin
    .from('orders')
    .select('id, kind, currency, released_at, buyer_id, supplier_id, request_id, offer_id, amount_cents')
    .eq('id', orderId)
    .maybeSingle()
  if (oErr) throw new Error(`order lookup failed: ${oErr.message}`)
  if (!order) throw new Error('order not found')
  if (order.kind !== 'lack') throw new Error('unsupported order kind')
  if (!order.released_at) throw new Error('order not yet released')

  const currency = (order.currency || 'eur').toUpperCase()

  // ---- Verkäufer-Profil/Snapshot
  const [{ data: snapRow }, { data: prof }] = await Promise.all([
    admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', order.offer_id).maybeSingle(),
    admin.from('profiles').select('username, company_name, vat_number, address, account_type').eq('id', order.supplier_id).maybeSingle(),
  ])

  const snap = (snapRow?.snapshot ?? {}) as any
  const companyName = normStr(snap.company_name ?? (prof?.company_name ?? ''))
  const userName    = normStr(snap.username ?? (prof?.username ?? ''))
  const displayName = companyName || userName || 'Verkäufer'
  const vatNumber   = normStr(snap.vat_number ?? prof?.vat_number ?? '')
  const accType     = (snap.account_type ?? prof?.account_type ?? '') as AccountType

  const addr = (snap.address ?? prof?.address ?? {}) as any
  const sellerCountry = normStr(addr.country || '')
  const sellerJur = countryToJurisdiction(sellerCountry)

  const biz = isBusiness(accType, vatNumber)
  const taxMode = decideTaxMode(biz, sellerJur)

  // ---- Beträge
  const orderGrossCents = Number.isFinite(order.amount_cents) ? Number(order.amount_cents) : 0
  const feeGrossCents   = Math.round(orderGrossCents * COMMISSION_RATE)
  let feeNetCents = feeGrossCents
  let feeVatCents = 0
  let appliedVatRate = 0

  if (taxMode === 'B2C_AT_VAT' || taxMode === 'B2B_AT_VAT') {
    appliedVatRate = AT_STANDARD_VAT
    const s = splitGrossInclusive(feeGrossCents, appliedVatRate)
    feeNetCents = s.net
    feeVatCents = s.vat
  } else {
    appliedVatRate = 0
    feeNetCents = feeGrossCents
    feeVatCents = 0
  }

  // ---- Titel/Metadaten
  const { data: req } = await admin
    .from('lack_requests')
    .select('id, title, data')
    .eq('id', order.request_id)
    .maybeSingle()
  const requestTitle = normStr(req?.title || (req?.data as any)?.verfahrenstitel || (req?.data as any)?.verfahrenTitel || '')
  const issuedAt = new Date(order.released_at)

  // ---- Idempotenz: platform_invoices
  const { data: existing } = await admin
    .from('platform_invoices')
    .select('id, number, pdf_path')
    .eq('order_id', order.id)
    .maybeSingle()

  let invId: string
  let invNumber: string
  let dbId: string | null = null

  if (existing) {
    dbId = existing.id
    invNumber = existing.number as string
    invId = existing.id
  } else {
    const { data: ins, error: insErr } = await admin
      .from('platform_invoices')
      .insert({
        order_id: order.id,
        supplier_id: order.supplier_id,
        buyer_id: order.buyer_id,
        currency: currency.toLowerCase(),
        total_gross_cents: orderGrossCents,
        fee_cents: feeGrossCents,
        net_payout_cents: Math.max(0, orderGrossCents - feeGrossCents),
        meta: {
          request_id: order.request_id,
          offer_id: order.offer_id,
          tax: {
            mode: taxMode,
            vat_rate: appliedVatRate,
            vat_cents: feeVatCents,
            net_cents: feeNetCents,
          },
        },
      })
      .select('id, number')
      .maybeSingle()
    if (insErr || !ins) throw new Error(`invoice insert failed: ${insErr?.message || 'no row'}`)
    dbId = ins.id
    invNumber = ins.number as string
    invId = ins.id
  }

  // ---- PDF bauen
  const label: TaxLabel = taxLabelFor(sellerJur, biz)
  const notes: string[] = []
  if (taxMode === 'B2B_EU_RC') {
    notes.push('Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).')
  } else if (taxMode === 'B2B_NON_EU_OUT') {
    notes.push('Leistung außerhalb des Anwendungsbereichs der österreichischen USt (Drittland).')
  } else if (taxMode === 'B2C_AT_VAT' || taxMode === 'B2B_AT_VAT') {
    notes.push('Die 7% Provision enthält die gesetzliche österreichische Steuer.')
  }

  const issuer = {
    name:    process.env.INVOICE_ISSUER_NAME   || 'Plattform',
    address: (process.env.INVOICE_ISSUER_ADDRESS || 'Wien\nÖsterreich').replace(/\\n/g, '\n'),
    vatId:   process.env.INVOICE_ISSUER_VATID  || '',
  }

  const pdf = await renderInvoicePdfBuffer({
    invoiceNumber: invNumber,
    issueDate: issuedAt,
    currency,
    platform: {
      name: issuer.name,
      vatId: normStr(issuer.vatId) || undefined,
      // Address-Objekt erlaubt – pdf.ts rendert die Zeilen dynamisch
      address: {} as any,
    },
    vendor: {
      displayName: displayName,
      vatId: vatNumber || null,
      address: addr || null,
    },
    line: {
      title: `Vermittlungsprovision 7% auf Auftrag #${order.id}${requestTitle ? ` – ${requestTitle}` : ''}`,
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
      orderId: order.id,
      requestTitle: requestTitle || null,
      taxLabel: label,
      notes,
    },
  })

  // ---- Upload
  const y = issuedAt.getFullYear()
  const path = `vendor/${order.supplier_id}/${y}/${invId}.pdf`
  const up = await admin.storage.from('invoices').upload(path, pdf, { contentType: 'application/pdf', upsert: true })
  if (up.error) throw new Error(`upload failed: ${up.error.message}`)

  await admin.from('platform_invoices').update({ pdf_path: path }).eq('id', dbId!)

  const { data: signed, error: sErr } = await admin.storage.from('invoices').createSignedUrl(path, 600)
  if (sErr) throw new Error(sErr.message)

  return { ok: true, id: dbId!, number: invNumber, pdf_path: path, url: signed!.signedUrl }
}
