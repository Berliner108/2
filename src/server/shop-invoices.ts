import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

const COMMISSION_RATE = 0.07 as const
type TaxMode = 'VAT_INCLUDED' | 'REVERSE_CHARGE' | 'NON_TAXABLE'

function normalizeMultiline(v?: string) {
  return v ? v.replace(/\\n/g, '\n') : v
}

function splitGrossInclusive(grossCents: number, vatRatePct: number) {
  const net = Math.round(grossCents / (1 + vatRatePct / 100))
  const vat = grossCents - net
  return { net, vat }
}

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

  if (country === 'AT' || vat.startsWith('AT')) return { mode: 'VAT_INCLUDED', atVatRate: AT_RATE }

  const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
  if (EU.has(country)) return { mode: 'REVERSE_CHARGE', atVatRate: 0 }

  return { mode: 'NON_TAXABLE', atVatRate: 0 }
}

function formatSellerAddress(addr: any | null): string | undefined {
  if (!addr) return undefined
  const street = [addr.street, addr.houseNumber].filter(Boolean).join(' ').trim()
  const cityLine = [addr.zip, addr.city].filter(Boolean).join(' ').trim()
  const country = (addr.country || '').toString().trim()
  return [street, cityLine, country].filter(Boolean).join('\n') || undefined
}

export async function ensureShopInvoiceForOrder(shopOrderId: string) {
  const admin = supabaseAdmin()

  // 1) Order laden (nur released)
  const { data: ord, error: oErr } = await admin
    .from('shop_orders')
    .select([
      'id','status','released_at',
      'buyer_id','seller_id',
      'total_gross_cents','platform_fee_percent','platform_fee_cents',
      'buyer_company_name','buyer_vat_number','buyer_address','buyer_account_type','buyer_display_name','buyer_username',
      'seller_company_name','seller_vat_number','seller_address','seller_account_type','seller_display_name','seller_username',
      'article_id'
    ].join(','))
    .eq('id', shopOrderId)
    .maybeSingle()

  if (oErr) throw new Error(`shop order lookup failed: ${oErr.message}`)
  if (!ord) throw new Error('shop order not found')
  if (ord.status !== 'released' || !ord.released_at) {
    return { skipped: true, reason: 'not_released' }
  }

  // 2) Bereits vorhanden?
  const { data: existing } = await admin
    .from('shop_invoices')
    .select('*')
    .eq('shop_order_id', ord.id)
    .maybeSingle()

  if (existing?.pdf_path) {
    return { ok: true, ...existing }
  }

  // 3) Artikel-Titel (= Referenz)
  let articleTitle: string | null = null
  if (ord.article_id) {
    const { data: art } = await admin
      .from('articles')
      .select('title')
      .eq('id', ord.article_id)
      .maybeSingle()
    articleTitle = (art as any)?.title ?? null
  }

  // 4) Nummer erzeugen (INV-YYYYMM-xxxxx) mit released_at als Datum
  const issuedAt = new Date(ord.released_at)
  const { data: invNo, error: nErr } = await admin.rpc('allocate_invoice_number', {
    p_prefix: 'INV',
    p_issued_at: issuedAt.toISOString()
  })
  if (nErr || !invNo) throw new Error(nErr?.message || 'invoice number allocation failed')

  // 5) Beträge
  const orderGrossCents = Number(ord.total_gross_cents || 0)
  const feeCents =
    (ord.platform_fee_cents && Number(ord.platform_fee_cents) > 0)
      ? Number(ord.platform_fee_cents)
      : Math.round(orderGrossCents * COMMISSION_RATE)

  const payoutCents = Math.max(0, orderGrossCents - feeCents)

  // 6) Steuerlogik (wie bei dir, aber aus seller snapshots)
  const accType = (ord.seller_account_type || '') as string
  const sellerVat = (ord.seller_vat_number || '') as string | null
  const sellerAddr = ord.seller_address as any | null
  const isBusiness = accType.toLowerCase() === 'business' || !!(sellerVat || '').trim()
  const sellerCountryIso2 = (sellerAddr?.country || '').toString().toUpperCase()

  const { mode: taxMode, atVatRate } = decideTaxMode({ isBusiness, sellerVat, sellerCountryIso2 })

  let appliedVatRate = 0
  let feeNetCents = feeCents
  let feeVatCents = 0
  const notes: string[] = []

  if (taxMode === 'VAT_INCLUDED') {
    appliedVatRate = atVatRate
    const s = splitGrossInclusive(feeCents, appliedVatRate)
    feeNetCents = s.net
    feeVatCents = s.vat
    notes.push('Die 7% Provision enthält die gesetzliche österreichische Steuer.')
  } else if (taxMode === 'REVERSE_CHARGE') {
    notes.push('Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).')
  } else {
    notes.push('Leistung außerhalb des Anwendungsbereichs der österreichischen USt (Drittland).')
  }

  const taxLabel =
    !isBusiness ? 'MwSt'
    : (sellerCountryIso2 === 'CH' || sellerCountryIso2 === 'LI') ? 'MWST'
    : 'USt'

  // 7) Vendor (= Rechnung an Verkäufer)
  const vendorName =
    (ord.seller_company_name || ord.seller_display_name || ord.seller_username || 'Verkäufer') as string

  const vendorAddress = formatSellerAddress(ord.seller_address)

  const platform = {
    name: process.env.INVOICE_ISSUER_NAME || 'Plattform',
    address: normalizeMultiline(process.env.INVOICE_ISSUER_ADDRESS || ''),
    vatId: process.env.INVOICE_ISSUER_VATID || undefined
  }

  // 8) PDF
  const currency = 'EUR'
  const pdf = await renderInvoicePdfBuffer({
    invoiceNumber: invNo,
    issueDate: issuedAt,
    currency,
    platform: { name: platform.name, vatId: platform.vatId, address: platform.address },
    vendor: { displayName: vendorName, vatId: sellerVat || null, address: vendorAddress ? { formatted: vendorAddress } as any : (ord.seller_address as any) || null },

    line: {
      title: `Vermittlungsprovision 7% auf Auftrag #${ord.id}${articleTitle ? ` – ${articleTitle}` : ''}`,
      qty: 1,
      unitPriceGrossCents: feeCents
    },

    totals: {
      vatRate: appliedVatRate,
      grossCents: feeCents,
      netCents: feeNetCents,
      vatCents: feeVatCents
    },

    meta: {
      orderId: ord.id,
      requestTitle: articleTitle, // wird in deinem Template als Referenz genutzt
      orderGrossCents,
      payoutCents,
      taxLabel,
      notes
    }
  })

  // 9) Storage
  const yyyy = issuedAt.getFullYear()
  const mm = String(issuedAt.getMonth() + 1).padStart(2, '0')
  const pdfPath = `shop/${ord.seller_id}/${yyyy}/${mm}/${invNo}.pdf`

  const up = await admin.storage.from('invoices').upload(pdfPath, pdf, {
    contentType: 'application/pdf',
    upsert: true
  })
  if (up.error) throw new Error(`invoice upload failed: ${up.error.message}`)

  // 10) DB speichern (idempotent per shop_order_id)
  const { data: saved, error: sErr } = await admin
    .from('shop_invoices')
    .upsert({
      shop_order_id: ord.id,
      seller_id: ord.seller_id,
      buyer_id: ord.buyer_id,
      number: invNo,
      issued_at: issuedAt.toISOString(),
      currency: 'eur',
      total_gross_cents: orderGrossCents,
      fee_cents: feeCents,
      payout_cents: payoutCents,
      pdf_path: pdfPath,
      meta: {
        article_title: articleTitle,
        taxMode,
        fee_breakdown: { vat_rate: appliedVatRate, net_cents: feeNetCents, vat_cents: feeVatCents }
      }
    }, { onConflict: 'shop_order_id' })
    .select('*')
    .maybeSingle()

  if (sErr || !saved) throw new Error(sErr?.message || 'shop invoice upsert failed')

  return { ok: true, ...saved }
}
