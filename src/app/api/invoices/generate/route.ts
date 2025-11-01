import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

export const runtime = 'nodejs'

const FEE_PCT = 7.0

// ===== Helpers: Ländercodes & Steuerlogik ===================================

type Jurisdiction = 'AT' | 'DE' | 'CH' | 'LI' | 'EU_OTHER' | 'NON_EU'

function normCountryLoose(raw?: string | null): Jurisdiction | null {
  const s = (raw || '').trim().toLowerCase()
  if (!s) return null
  const map: Record<string, Jurisdiction> = {
    at:'AT', aut:'AT', 'österreich':'AT', 'oesterreich':'AT', 'austria':'AT',
    de:'DE', deu:'DE', 'deutschland':'DE', 'germany':'DE',
    ch:'CH', che:'CH', 'schweiz':'CH', 'suisse':'CH', 'svizzera':'CH', 'switzerland':'CH',
    li:'LI', lie:'LI', 'liechtenstein':'LI',
  }
  if (map[s]) return map[s]

  // grobe EU-Erkennung (auch ausgeschriebene Ländernamen)
  const euNames = new Set([
    'belgien','bulgarien','kroatien','zypern','tschechien','dänemark','daenemark','estland','finnland','frankreich',
    'griechenland','ungarn','irland','italien','lettland','litauen','luxemburg','malta','niederlande','polen',
    'portugal','rumänien','rumaenien','slowakei','slowenien','spanien','schweden','be','bg','hr','cy','cz','dk',
    'ee','fi','fr','gr','hu','ie','it','lv','lt','lu','mt','nl','pl','pt','ro','sk','si','es','se'
  ])
  if (euNames.has(s)) return 'EU_OTHER'
  return null
}

function jurFromVatPrefix(vat?: string | null): Jurisdiction | null {
  const v = (vat || '').trim().toUpperCase()
  const m = /^([A-Z]{2})/.exec(v)
  if (!m) return null
  const p = m[1]
  if (p === 'AT') return 'AT'
  if (p === 'DE') return 'DE'
  if (p === 'CH') return 'CH'
  if (p === 'LI') return 'LI'
  const eu2 = new Set(['BE','BG','HR','CY','CZ','DK','EE','FI','FR','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'])
  if (eu2.has(p)) return 'EU_OTHER'
  return 'NON_EU'
}

/** Finale Jurisdiktion: B2B => VAT-Prefix bevorzugt, sonst Adresse; B2C => AT */
function resolveJurisdiction(accountType?: string | null, vat?: string | null, addrCountry?: string | null): Jurisdiction {
  const isBiz = (accountType || '').toLowerCase() === 'business' || !!(vat || '').trim()
  if (!isBiz) return 'AT'
  return jurFromVatPrefix(vat) ?? normCountryLoose(addrCountry) ?? 'NON_EU'
}

function taxLabelFor(isBiz: boolean, jur: Jurisdiction): 'MwSt'|'USt'|'MWST'|'VAT' {
  if (!isBiz) return 'MwSt'
  if (jur === 'AT' || jur === 'DE') return 'USt'
  if (jur === 'CH' || jur === 'LI') return 'MWST'
  return 'VAT'
}

function splitGrossInclusive(gross: number, ratePct: number) {
  const net = Math.round(gross / (1 + ratePct / 100))
  const vat = gross - net
  return { net, vat }
}

// ====== ENV (Plattformdaten) =================================================

const ISSUER_NAME = process.env.INVOICE_ISSUER_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Plattform'
const ISSUER_VAT  = process.env.INVOICE_ISSUER_VATID || process.env.APP_VAT_NUMBER || ''
const ISSUER_ADDR = (process.env.INVOICE_ISSUER_ADDRESS || '')
  .replace(/\\n/g, '\n') // falls \n in ENV gespeichert
const AT_VAT_RATE = Number(process.env.INVOICE_VAT_RATE || '20')

// ============================================================================

export async function POST(req: Request) {
  try {
    const admin = supabaseAdmin()
    const body = await req.json().catch(() => ({}))
    const orderId = String(body.orderId || '')
    if (!orderId) return NextResponse.json({ error: 'orderId missing' }, { status: 400 })

    // Order laden
    const { data: ord, error: ordErr } = await admin
      .from('orders')
      .select('id, kind, buyer_id, supplier_id, offer_id, request_id, amount_cents, currency, released_at')
      .eq('id', orderId)
      .maybeSingle()
    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 400 })
    if (!ord)   return NextResponse.json({ error: 'order not found' }, { status: 404 })
    if (ord.kind !== 'lack') return NextResponse.json({ error: 'unsupported kind' }, { status: 400 })
    if (!ord.released_at)    return NextResponse.json({ error: 'order not released' }, { status: 409 })

    const currency = (ord.currency || 'eur').toUpperCase()

    // Verkäufer-Profil (Snapshot bevorzugt)
    const [{ data: snapRow }, { data: prof }] = await Promise.all([
      admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', ord.offer_id).maybeSingle(),
      admin.from('profiles').select('username, company_name, vat_number, address, account_type').eq('id', ord.supplier_id).maybeSingle(),
    ])
    const snap = (snapRow?.snapshot ?? {}) as any
    const vendorDisplay = (snap.company_name || snap.username) ?? (prof?.company_name || prof?.username) ?? 'Verkäufer'
    const vendorVat = (snap.vat_number ?? prof?.vat_number ?? '') as string | null
    const vendorAddr = (snap.address ?? prof?.address ?? null) as any
    const accType = (snap.account_type ?? prof?.account_type ?? '') as string | null

    // Jurisdiktion/Label
    const isBiz   = (accType || '').toLowerCase() === 'business' || !!(vendorVat || '').trim()
    const jur     = resolveJurisdiction(accType, vendorVat, vendorAddr?.country)
    const taxLabel = taxLabelFor(isBiz, jur)

    // 7% Gebühr (brutto)
    const orderGrossCents = Number(ord.amount_cents || 0)
    const feeGross = Math.round(orderGrossCents * (FEE_PCT / 100))

    // Steuer anwenden
    const applyATVat = !isBiz || (isBiz && jur === 'AT')     // B2C oder B2B-AT
    const applyRC    =  isBiz && (jur === 'DE' || jur === 'EU_OTHER')

    let vatRate = 0, feeNet = feeGross, feeVat = 0
    const notes: string[] = []

    if (applyATVat) {
      vatRate = AT_VAT_RATE
      const s = splitGrossInclusive(feeGross, vatRate)
      feeNet = s.net
      feeVat = s.vat
      notes.push('Die 7% Provision enthält die gesetzliche österreichische Steuer.')
    } else if (applyRC) {
      vatRate = 0
      feeNet = feeGross
      feeVat = 0
      notes.push('Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).')
    } else {
      // CH/LI/NON_EU
      vatRate = 0
      feeNet = feeGross
      feeVat = 0
      notes.push('Leistung außerhalb des Anwendungsbereichs der österreichischen USt (Drittland).')
    }

    // Request-Titel
    const { data: reqRow } = await admin
      .from('lack_requests')
      .select('id, title, data')
      .eq('id', ord.request_id)
      .maybeSingle()
    const requestTitle =
      reqRow?.title ||
      (reqRow?.data as any)?.verfahrenstitel ||
      (reqRow?.data as any)?.verfahrenTitel ||
      null

    // PDF bauen
    const invId = crypto.randomUUID()
    const invNo = `INV-${new Date().getFullYear()}-${invId.slice(0,8).toUpperCase()}`
    const payoutCents = Math.max(0, orderGrossCents - feeGross)

    const pdfBuf = await renderInvoicePdfBuffer({
      invoiceNumber: invNo,
      issueDate: new Date(),
      currency,
      platform: {
        name: ISSUER_NAME,
        vatId: ISSUER_VAT || undefined,
        address: ISSUER_ADDR || undefined,
      },
      vendor: {
        displayName: vendorDisplay,
        vatId: vendorVat || null,
        address: vendorAddr || null,
      },
      line: {
        title: `Vermittlungsprovision ${FEE_PCT}% auf Auftrag #${ord.id}${requestTitle ? ` – ${requestTitle}` : ''}`,
        qty: 1,
        unitPriceGrossCents: feeGross,
      },
      totals: {
        vatRate,
        grossCents: feeGross,
        netCents: feeNet,
        vatCents: feeVat,
      },
      meta: {
        orderId: ord.id,
        offerId: ord.offer_id,
        requestTitle,
        orderGrossCents,
        payoutCents,
        taxLabel,
        notes,
      },
    })

    // Upload in Storage
    const yyyy = new Date().getFullYear()
    const objectPath = `vendor/${ord.supplier_id}/${yyyy}/${invId}.pdf`
    const up = await admin.storage.from('invoices')
      .upload(objectPath, pdfBuf, { contentType: 'application/pdf', upsert: true })
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 })

    // DB-Zeile in public.invoices (falls du diese Tabelle nutzt; andernfalls weglassen)
    const { error: insErr } = await admin.from('invoices').insert({
      id: invId,
      order_id: ord.id,
      vendor_id: ord.supplier_id,
      buyer_id: ord.buyer_id,
      kind: 'platform_fee',
      currency: currency.toLowerCase(),
      net_amount_cents: feeNet,
      vat_rate: vatRate,
      vat_cents: feeVat,
      gross_cents: feeGross,
      fee_base_cents: orderGrossCents,
      fee_pct: FEE_PCT,
      pdf_path: objectPath,
      meta: { invoiceNumber: invNo, orderGrossCents, payoutCents, taxLabel },
    } as any)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Signed URL zurück
    const { data: signed, error: sErr } = await admin.storage.from('invoices').createSignedUrl(objectPath, 600)
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, invoiceId: invId, url: signed!.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
