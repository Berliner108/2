// src/server/job-invoices.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

const COMMISSION_RATE = 0.07 as const

type TaxMode = 'VAT_INCLUDED' | 'REVERSE_CHARGE' | 'NON_TAXABLE'

type JobOfferMini = {
  id: string
  job_id: string
  bieter_id: string
  owner_id: string

  gesamt_cents: number | null
  artikel_cents: number | null
  versand_cents: number | null
  currency: string | null

  paid_at: string | null
  payout_status: string | null
  payout_released_at: string | null
  payout_transfer_id: string | null
}

type JobMini = {
  id: string
  description: string | null
  released_at: string | null
  rueck_datum_utc: string | null
}

type ProfileMini = {
  id: string
  username: string | null
  company_name: string | null
  vat_number: string | null
  address: any | null
  account_type: string | null
}

type JobInvoiceMini = {
  id: string
  job_id: string
  offer_id: string
  seller_id: string
  buyer_id: string
  number: string
  issued_at: string
  currency: string
  total_gross_cents: number
  fee_cents: number
  payout_cents: number
  pdf_path: string | null
  meta: any | null
}

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
  sellerCountryIso2,
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

  const EU = new Set([
    'AT',
    'BE',
    'BG',
    'HR',
    'CY',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IE',
    'IT',
    'LV',
    'LT',
    'LU',
    'MT',
    'NL',
    'PL',
    'PT',
    'RO',
    'SK',
    'SI',
    'ES',
    'SE',
  ])

  if (EU.has(country)) {
    return { mode: 'REVERSE_CHARGE', atVatRate: 0 }
  }

  return { mode: 'NON_TAXABLE', atVatRate: 0 }
}

function getTaxLabel({
  isBusiness,
  sellerCountryIso2,
}: {
  isBusiness: boolean
  sellerCountryIso2?: string | null
}): 'MwSt' | 'USt' | 'MWST' | 'VAT' {
  const country = (sellerCountryIso2 || '').trim().toUpperCase()

  if (!isBusiness) return 'MwSt'
  if (country === 'CH' || country === 'LI') return 'MWST'

  return 'USt'
}

function cleanDescription(v?: string | null) {
  const s = String(v || '').trim()
  if (!s) return null
  return s.length > 80 ? `${s.slice(0, 80)}…` : s
}

export async function ensureJobInvoiceForOffer(jobId: string, offerId: string) {
  const admin = supabaseAdmin() as unknown as SupabaseClient

  const cleanJobId = String(jobId || '').trim()
  const cleanOfferId = String(offerId || '').trim()

  if (!cleanJobId) throw new Error('jobId missing')
  if (!cleanOfferId) throw new Error('offerId missing')

  // 1) Angebot laden
  const offerRes = await admin
    .from('job_offers')
    .select(
      [
        'id',
        'job_id',
        'bieter_id',
        'owner_id',
        'gesamt_cents',
        'artikel_cents',
        'versand_cents',
        'currency',
        'paid_at',
        'payout_status',
        'payout_released_at',
        'payout_transfer_id',
      ].join(',')
    )
    .eq('id', cleanOfferId)
    .maybeSingle()

  const offerErr = (offerRes as any).error as { message?: string } | null
  const offer = (offerRes as any).data as JobOfferMini | null

  if (offerErr) throw new Error(`job offer lookup failed: ${offerErr.message || 'unknown'}`)
  if (!offer) throw new Error('job offer not found')

  if (String(offer.job_id) !== cleanJobId) {
    throw new Error('job offer does not belong to job')
  }

  if (!offer.paid_at) {
    return { skipped: true as const, reason: 'not_paid' as const }
  }

  if (offer.payout_status !== 'released' || !offer.payout_released_at) {
    return { skipped: true as const, reason: 'not_released' as const }
  }

  // 2) Bereits vorhanden?
  const existingRes = await admin
    .from('job_invoices')
    .select('*')
    .eq('offer_id', offer.id)
    .maybeSingle()

  const existingErr = (existingRes as any).error as { message?: string } | null
  const existing = (existingRes as any).data as JobInvoiceMini | null

  if (existingErr) throw new Error(`job invoice lookup failed: ${existingErr.message || 'unknown'}`)
  if (existing?.pdf_path) return { ok: true as const, ...existing }

  // 3) Job laden
  const jobRes = await admin
    .from('jobs')
    .select('id,description,released_at,rueck_datum_utc')
    .eq('id', cleanJobId)
    .maybeSingle()

  const jobErr = (jobRes as any).error as { message?: string } | null
  const job = (jobRes as any).data as JobMini | null

  if (jobErr) throw new Error(`job lookup failed: ${jobErr.message || 'unknown'}`)
  if (!job) throw new Error('job not found')

  // 4) Dienstleister-Profil laden
  const profileRes = await admin
    .from('profiles')
    .select('id,username,company_name,vat_number,address,account_type')
    .eq('id', offer.bieter_id)
    .maybeSingle()

  const profileErr = (profileRes as any).error as { message?: string } | null
  const seller = (profileRes as any).data as ProfileMini | null

  if (profileErr) throw new Error(`seller profile lookup failed: ${profileErr.message || 'unknown'}`)
  if (!seller) throw new Error('seller profile not found')

  // 5) Rechnungsnummer erzeugen
  const issuedAt = new Date(offer.payout_released_at || job.released_at || new Date().toISOString())

  let invoiceNumber: string

  if (existing?.number) {
    invoiceNumber = existing.number
  } else {
    const noRes = await (admin as any).rpc('allocate_invoice_number', {
      p_prefix: 'INV',
      p_issued_at: issuedAt.toISOString(),
    })

    const noErr = noRes?.error as { message?: string } | null
    const no = noRes?.data as string | null

    if (noErr || !no) {
      throw new Error(noErr?.message || 'invoice number allocation failed')
    }

    invoiceNumber = no
  }

  // 6) Beträge
  const currency = String(offer.currency || 'eur').toLowerCase()
  const currencyPdf = currency.toUpperCase()

  const orderGrossCents = Number(offer.gesamt_cents ?? 0)
  if (!Number.isFinite(orderGrossCents) || orderGrossCents <= 0) {
    throw new Error('invalid job offer total')
  }

  const feeCents = Math.round(orderGrossCents * COMMISSION_RATE)
  const payoutCents = Math.max(0, orderGrossCents - feeCents)

  // 7) Steuerlogik
  const sellerVat = seller.vat_number || null
  const sellerAddr = seller.address || null
  const sellerCountryIso2 = String(sellerAddr?.country || '').toUpperCase()
  const accountType = String(seller.account_type || '').toLowerCase()

  const isBusiness = accountType === 'business' || !!String(sellerVat || '').trim()

  const { mode: taxMode, atVatRate } = decideTaxMode({
    isBusiness,
    sellerVat,
    sellerCountryIso2,
  })

  let appliedVatRate = 0
  let feeNetCents = feeCents
  let feeVatCents = 0
  const notes: string[] = []

  if (taxMode === 'VAT_INCLUDED') {
    appliedVatRate = atVatRate
    const split = splitGrossInclusive(feeCents, appliedVatRate)
    feeNetCents = split.net
    feeVatCents = split.vat
    notes.push('Die 7% Provision enthält die gesetzliche österreichische Steuer.')
  } else if (taxMode === 'REVERSE_CHARGE') {
    notes.push('Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).')
  } else {
    notes.push('Leistung außerhalb des Anwendungsbereichs der österreichischen USt (Drittland).')
  }

  const taxLabel = getTaxLabel({ isBusiness, sellerCountryIso2 })

  // 8) Empfänger
  const vendorName =
    seller.company_name ||
    seller.username ||
    'Dienstleister'

  const requestTitle = cleanDescription(job.description)

  const platform = {
    name: process.env.INVOICE_ISSUER_NAME || 'Beschichter Scout GmbH',
    address: normalizeMultiline(
      process.env.INVOICE_ISSUER_ADDRESS || 'Kärntner Straße 1\n1010 Wien\nÖsterreich'
    ),
    vatId: process.env.INVOICE_ISSUER_VATID || undefined,
  }

  // 9) PDF erzeugen
  const pdf = await renderInvoicePdfBuffer({
    invoiceNumber,
    issueDate: issuedAt,
    currency: currencyPdf,

    platform: {
      name: platform.name,
      vatId: platform.vatId,
      address: platform.address,
    },

    vendor: {
      displayName: vendorName,
      vatId: sellerVat,
      address: sellerAddr || null,
    },

    line: {
      title: `Vermittlungsprovision 7% auf Auftrag #${job.id}${requestTitle ? ` – ${requestTitle}` : ''}`,
      qty: 1,
      unitPriceGrossCents: feeCents,
    },

    totals: {
      vatRate: appliedVatRate,
      grossCents: feeCents,
      netCents: feeNetCents,
      vatCents: feeVatCents,
    },

    meta: {
      orderId: job.id,
      offerId: offer.id,
      requestTitle,
      orderGrossCents,
      payoutCents,
      taxLabel,
      notes,
    },
  })

  // 10) PDF speichern
  const yyyy = issuedAt.getFullYear()
  const mm = String(issuedAt.getMonth() + 1).padStart(2, '0')
  const pdfPath = `jobs/${offer.bieter_id}/${yyyy}/${mm}/${invoiceNumber}.pdf`

  const uploadRes = await admin.storage.from('invoices').upload(pdfPath, pdf, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (uploadRes.error) {
    throw new Error(`job invoice upload failed: ${uploadRes.error.message}`)
  }

  // 11) DB speichern, idempotent über offer_id
  const saveRes = await admin
    .from('job_invoices')
    .upsert(
      {
        job_id: job.id,
        offer_id: offer.id,
        seller_id: offer.bieter_id,
        buyer_id: offer.owner_id,
        number: invoiceNumber,
        issued_at: issuedAt.toISOString(),
        currency,
        total_gross_cents: orderGrossCents,
        fee_cents: feeCents,
        payout_cents: payoutCents,
        pdf_path: pdfPath,
        meta: {
          job_description: requestTitle,
          payout_transfer_id: offer.payout_transfer_id,
          artikel_cents: offer.artikel_cents,
          versand_cents: offer.versand_cents,
          taxMode,
          fee_breakdown: {
            vat_rate: appliedVatRate,
            net_cents: feeNetCents,
            vat_cents: feeVatCents,
          },
        },
      },
      { onConflict: 'offer_id' }
    )
    .select('*')
    .maybeSingle()

  const saveErr = (saveRes as any).error as { message?: string } | null
  const saved = (saveRes as any).data as JobInvoiceMini | null

  if (saveErr || !saved) {
    throw new Error(saveErr?.message || 'job invoice upsert failed')
  }

  return { ok: true as const, ...saved }
}