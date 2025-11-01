// /src/app/api/invoices/generate/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabaseServer } from '@/lib/supabase-server'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

export const runtime = 'nodejs'

// --- Konstanten ---
const FEE_PCT = 7.0
const AT_VAT_RATE = Number(process.env.INVOICE_VAT_RATE || '20') // AT-Standardsatz (B2C + AT-B2B)
const ISSUER_NAME = process.env.INVOICE_ISSUER_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Plattform'
const ISSUER_VAT  = process.env.INVOICE_ISSUER_VAT_ID || process.env.APP_VAT_NUMBER || ''
const ISSUER_ADDR = (() => {
  try {
    // akzeptiert JSON (z. B. {"street":"...","zip":"...","city":"...","country":"Austria"})
    return JSON.parse(process.env.INVOICE_ISSUER_ADDRESS || '{}')
  } catch {
    return {}
  }
})()

// --- Helpers ---
function cents(n: number) { return Math.round(n) }
function splitGrossInclusive(gross: number, ratePct: number) {
  const net = Math.round(gross / (1 + ratePct / 100))
  const vat = gross - net
  return { net, vat }
}

type Jurisdiction = 'AT' | 'DE' | 'CH' | 'LI' | 'EU_OTHER' | 'NON_EU'
function countryToJurisdiction(country?: string | null): Jurisdiction {
  const c = (country || '').trim().toUpperCase()
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

function isBusiness(accountType?: string | null, vat?: string | null) {
  const t = (accountType || '').toLowerCase()
  return t === 'business' || !!(vat || '').trim()
}

// Label-Regeln (nur Anzeige):
// - Privat immer "MwSt" (Wunsch).
// - Gewerblich AT/DE: "USt"; CH/LI: "MWST"; sonst: "VAT".
function taxLabelFor(isBiz: boolean, jur: Jurisdiction): 'MwSt' | 'USt' | 'MWST' | 'VAT' {
  if (!isBiz) return 'MwSt'
  if (jur === 'AT' || jur === 'DE') return 'USt'
  if (jur === 'CH' || jur === 'LI') return 'MWST'
  return 'VAT'
}

export async function POST(req: Request) {
  try {
    // Auth: nur eingeloggte Buyer/Supplier/Admins
    const sbUser = await supabaseServer()
    const { data: { user } } = await sbUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const orderId = String(body.orderId || '')
    if (!orderId) return NextResponse.json({ error: 'orderId missing' }, { status: 400 })

    const admin = supabaseAdmin()

    // 1) Order laden
    const { data: ord, error: ordErr } = await admin
      .from('orders')
      .select('id, kind, buyer_id, supplier_id, offer_id, request_id, amount_cents, currency, released_at')
      .eq('id', orderId)
      .maybeSingle()
    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 400 })
    if (!ord)   return NextResponse.json({ error: 'order not found' }, { status: 404 })
    if (ord.kind !== 'lack') return NextResponse.json({ error: 'unsupported kind' }, { status: 400 })
    if (!ord.released_at)    return NextResponse.json({ error: 'order not released' }, { status: 409 })

    // Access: Admin oder Beteiligte
    const { data: meProf } = await admin.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
    const isAdmin = meProf?.role === 'admin' || meProf?.role === 'moderator'
    const isParty = user.id === ord.supplier_id || user.id === ord.buyer_id
    if (!isAdmin && !isParty) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // 2) Request & Snapshot (für Vendor-Daten/Adresse)
    const [{ data: reqRow }, { data: snapRow }] = await Promise.all([
      admin.from('lack_requests').select('id, title, data').eq('id', ord.request_id).maybeSingle(),
      admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', ord.offer_id).maybeSingle(),
    ])

    // Vendor-Firmendaten
    let vendorDisplay = 'Verkäufer'
    let vendorVat: string | null = null
    let vendorAddr: any = null
    let accountType: string | null = null

    if (snapRow?.snapshot) {
      const s = snapRow.snapshot as any
      vendorDisplay = s.company_name || s.username || 'Verkäufer'
      vendorVat     = s.vat_number ?? null
      vendorAddr    = s.address ?? null
      accountType   = s.account_type ?? null
    } else {
      const { data: vProf } = await admin
        .from('profiles')
        .select('company_name, username, vat_number, address, account_type')
        .eq('id', ord.supplier_id)
        .maybeSingle()
      vendorDisplay = vProf?.company_name || vProf?.username || 'Verkäufer'
      vendorVat     = vProf?.vat_number ?? null
      vendorAddr    = (vProf as any)?.address ?? null
      accountType   = (vProf as any)?.account_type ?? null
    }

    const currency = (ord.currency || 'eur').toUpperCase()
    const isBiz = isBusiness(accountType, vendorVat)
    const jur   = countryToJurisdiction(vendorAddr?.country)
    const taxLabel = taxLabelFor(isBiz, jur)

    // 3) 7% Fee – immer brutto vom Orderbetrag
    const feeBase  = Number(ord.amount_cents || 0)
    const feeGross = cents(feeBase * (FEE_PCT / 100))

    // Steuerberechnung:
    // - Privat ODER B2B in AT: AT-VAT 20% inkl.
    // - B2B in EU (≠ AT): RC 0% (Netto = Brutto)
    // - B2B CH/LI/NON_EU: 0% (i. d. R. nicht steuerbar in AT)
    let vatRate = 0
    let feeNet = feeGross
    let feeVat = 0
    const EU_RC = (isBiz && (jur === 'DE' || jur === 'EU_OTHER'))
    const AT_VAT = (!isBiz) || (isBiz && jur === 'AT')
    if (AT_VAT) {
      vatRate = AT_VAT_RATE
      const parts = splitGrossInclusive(feeGross, vatRate)
      feeNet = parts.net
      feeVat = parts.vat
    } else if (EU_RC) {
      vatRate = 0
      feeNet = feeGross
      feeVat = 0
    } else {
      // CH/LI/NON_EU B2B
      vatRate = 0
      feeNet = feeGross
      feeVat = 0
    }

    // 4) PDF erstellen
    const invId = crypto.randomUUID()
    const invNo = `INV-${new Date().getFullYear()}-${invId.slice(0,8).toUpperCase()}`
    const requestTitle = reqRow?.title || (reqRow?.data as any)?.verfahrenstitel || null

    const pdfBuf = await renderInvoicePdfBuffer({
      invoiceNumber: invNo,
      issueDate: new Date(),
      currency,
      platform: { name: ISSUER_NAME, vatId: ISSUER_VAT, address: ISSUER_ADDR as any },
      vendor: {
        displayName: vendorDisplay,
        vatId: vendorVat,
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
        requestTitle,
        taxLabel,                 // << richtiges Feld im Typ
        notes: EU_RC
          ? ['Reverse Charge: Steuerschuldnerschaft des Leistungsempfängers (Art. 196 MwStSystRL / §3a UStG).']
          : (vatRate === 0
              ? ['Leistung außerhalb des Anwendungsbereichs der österreichischen USt.']
              : ['Die 7% Provision enthält die gesetzliche österreichische Steuer.']),
      },
    })

    // 5) Upload
    const yyyy = new Date().getFullYear()
    const objectPath = `vendor/${ord.supplier_id}/${yyyy}/${invId}.pdf`
    const { error: upErr } = await admin.storage.from('invoices')
      .upload(objectPath, pdfBuf, { contentType: 'application/pdf', upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // 6) DB-Zeile (vereinfachte Ablage in public.invoices)
    const { data: ins, error: insErr } = await admin.from('invoices').insert({
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
      fee_base_cents: feeBase,
      fee_pct: FEE_PCT,
      pdf_path: objectPath, // nur Felder, die es in dieser Tabelle sicher gibt
      meta: { invoiceNumber: invNo }, // nur Felder, die es in dieser Tabelle sicher gibt
    }).select('id').maybeSingle()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // 7) Signed URL zurück
    const { data: signed, error: sErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(objectPath, 600)
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, invoiceId: ins!.id, url: signed!.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
