import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabaseServer } from '@/lib/supabase-server'
import { renderInvoicePdfBuffer } from '@/lib/invoices/pdf'

export const runtime = 'nodejs'

const FEE_PCT = 7.0
const DEFAULT_VAT_RATE = parseFloat(process.env.INVOICE_VAT_RATE || '20.00') // AT
const ISSUER_NAME = process.env.INVOICE_ISSUER_NAME || 'Deine Plattform'
const ISSUER_VAT  = process.env.INVOICE_ISSUER_VAT_ID || ''
const ISSUER_ADDR = (() => {
  try { return JSON.parse(process.env.INVOICE_ISSUER_ADDRESS || '{}') } catch { return {} }
})()

function cents(n: number) { return Math.round(n) }
function divInclusive(gross: number, ratePct: number) {
  const net = Math.round(gross / (1 + ratePct / 100))
  const vat = gross - net
  return { net, vat }
}

export async function POST(req: Request) {
  try {
    const sbUser = await supabaseServer()
    const { data: { user } } = await sbUser.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const orderId = String(body.orderId || '')
    if (!orderId) return NextResponse.json({ error: 'orderId missing' }, { status: 400 })

    const admin = supabaseAdmin()

    // 1) Order + sanity
    const { data: ord, error: ordErr } = await admin
      .from('orders')
      .select('id, kind, buyer_id, supplier_id, offer_id, request_id, amount_cents, currency, released_at')
      .eq('id', orderId)
      .maybeSingle()
    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 400 })
    if (!ord)   return NextResponse.json({ error: 'order not found' }, { status: 404 })
    if (ord.kind !== 'lack') return NextResponse.json({ error: 'unsupported kind' }, { status: 400 })
    if (!ord.released_at)    return NextResponse.json({ error: 'order not released' }, { status: 409 })

    // Access: nur Admin oder Beteiligte (Buyer/Supplier)
    const { data: meProf } = await admin.from('profiles').select('id, role').eq('id', user.id).maybeSingle()
    const isAdmin = meProf?.role === 'admin' || meProf?.role === 'moderator'
    const isParty = user.id === ord.supplier_id || user.id === ord.buyer_id
    if (!isAdmin && !isParty) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // 2) Request (Titel) & Snapshot (Vendor-Stand zur Angebotsabgabe)
    const [{ data: reqRow }, { data: snapRow }] = await Promise.all([
      admin.from('lack_requests').select('id, title, data').eq('id', ord.request_id).maybeSingle(),
      admin.from('offer_profile_snapshots').select('snapshot').eq('offer_id', ord.offer_id).maybeSingle(),
    ])

    // Vendor-Firmendaten (aus Snapshot, fallback: aktuelles Profil)
    let vendorDisplay = ''
    let vendorVat: string | null = null
    let vendorAddr: any = null

    if (snapRow?.snapshot) {
      vendorDisplay = snapRow.snapshot.company_name || snapRow.snapshot.username || 'Verkäufer'
      vendorVat = snapRow.snapshot.vat_number ?? null
      vendorAddr = snapRow.snapshot.address ?? null
    } else {
      const { data: vProf } = await admin.from('profiles')
        .select('company_name, username, vat_number, address')
        .eq('id', ord.supplier_id).maybeSingle()
      vendorDisplay = (vProf?.company_name || vProf?.username || 'Verkäufer')
      vendorVat = (vProf?.vat_number ?? null)
      vendorAddr = (vProf?.address ?? null)
    }

    // 3) 7% Fee – IMMER brutto 7% vom Orderbetrag
    const currency = (ord.currency || 'eur').toUpperCase()
    const feeBase  = Number(ord.amount_cents || 0)
    const feeGross = cents(feeBase * (FEE_PCT / 100))
    const vatRate  = DEFAULT_VAT_RATE
    const { net: feeNet, vat: feeVat } = divInclusive(feeGross, vatRate)

    // 4) PDF erstellen
    const invId = crypto.randomUUID()
    const invNo = `INV-${new Date().getFullYear()}-${invId.slice(0,8).toUpperCase()}`
    const pdfBuf = await renderInvoicePdfBuffer({
      invoiceNumber: invNo,
      issueDate: new Date(),
      currency,
      platform: { name: ISSUER_NAME, vatId: ISSUER_VAT, address: ISSUER_ADDR },
      vendor: {
        displayName: vendorDisplay,
        vatId: vendorVat,
        address: vendorAddr || null
      },
      line: {
        title: `Vermittlungsprovision ${FEE_PCT}% auf Auftrag #${ord.id}${reqRow?.title ? ` – ${reqRow.title}` : ''}`,
        qty: 1,
        unitPriceGrossCents: feeGross
      },
      totals: {
        vatRate,
        grossCents: feeGross,
        netCents: feeNet,
        vatCents: feeVat
      },
      meta: {
        orderId: ord.id,
        offerId: ord.offer_id,
        requestId: ord.request_id,
        requestTitle: reqRow?.title || reqRow?.data?.verfahrenstitel || null
      }
    })

    // 5) Upload nach Storage
    const yyyy = new Date().getFullYear()
    const objectPath = `vendor/${ord.supplier_id}/${yyyy}/${invId}.pdf`
    const { data: up, error: upErr } = await admin.storage.from('invoices')
      .upload(objectPath, pdfBuf, { contentType: 'application/pdf', upsert: true })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // 6) DB-Zeile anlegen
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
      pdf_path: objectPath,
      meta: { invoiceNumber: invNo }
    }).select('id, pdf_path').maybeSingle()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // 7) Signed URL zurück an Client (10 Min gültig)
    const { data: signed, error: sErr } = await admin.storage
      .from('invoices')
      .createSignedUrl(objectPath, 600)
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, invoiceId: ins!.id, url: signed!.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
