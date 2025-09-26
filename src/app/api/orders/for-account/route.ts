// /src/app/api/orders/for-account/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type UiStatus = 'in_progress' | 'reported' | 'disputed' | 'confirmed'
type UiKind   = 'vergeben' | 'angenommen'

// UI-Status robust ableiten
const uiStatus = (r: any): UiStatus => {
  if (r.released_at)        return 'confirmed'
  if (r.dispute_opened_at)  return 'disputed'
  if (r.reported_at)        return 'reported'
  const s = String(r.status ?? '').toLowerCase()
  if (s === 'released')     return 'confirmed'
  if (s === 'processing' || s === 'requires_confirmation' || s === 'funds_held') return 'in_progress'
  return 'in_progress'
}

// Menge aus lack_requests.data best-effort schätzen
function parseMenge(d?: Record<string, any> | null): number | undefined {
  if (!d) return undefined
  const cands = [d.menge, d.menge_kg, d.max_masse, d.gewicht, d.maxMasse, d.max_gewicht]
  for (const c of cands) {
    const n = typeof c === 'string' ? parseFloat(c.replace(',', '.'))
            : typeof c === 'number' ? c : NaN
    if (Number.isFinite(n) && n > 0) return n
  }
  return undefined
}

const pickLiefer = (req: any) =>
  req?.lieferdatum ?? req?.delivery_at ?? req?.data?.lieferdatum ?? req?.data?.delivery_at ?? null

const addDaysIso = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() + days * 86400_000).toISOString()

const endOfDayIso = (iso?: string | null) => {
  if (!iso) return undefined
  const d = new Date(iso)
  if (isNaN(+d)) return undefined
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

/** Helfer: hübsch beschriftete Adresse als mehrzeiliger String */
function prettyAddress(opts: {
  company?: string | null
  vat?: string | null
  firstName?: string | null
  lastName?: string | null
  street?: string | null
  houseNumber?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  includeNameLines?: boolean // z.B. bei Business zusätzlich Vor-/Nachname anzeigen
}) {
  const lines: string[] = []
  const hasCompany = !!(opts.company && opts.company.trim())

  if (hasCompany) lines.push(`Firma: ${opts.company!.trim()}`)
  if (hasCompany && opts.vat && opts.vat.trim()) lines.push(`UID: ${opts.vat!.trim()}`)

  // Name-Zeilen (optional – z.B. privat oder zusätzlich bei Firma)
  if (opts.includeNameLines || !hasCompany) {
    if (opts.firstName && opts.firstName.trim()) lines.push(`Vorname: ${opts.firstName.trim()}`)
    if (opts.lastName  && opts.lastName.trim())  lines.push(`Nachname: ${opts.lastName.trim()}`)
  }

  const strasse = [opts.street?.trim(), opts.houseNumber?.trim()].filter(Boolean).join(' ')
  if (strasse) lines.push(`Straße: ${strasse}`)

  const plzOrt = [opts.zip?.trim(), opts.city?.trim()].filter(Boolean).join(' ')
  if (plzOrt) lines.push(`PLZ/Ort: ${plzOrt}`)

  if (opts.country && opts.country.trim()) lines.push(`Land: ${opts.country.trim()}`)

  return lines.join('\n')
}

export async function GET(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Query-Flags
    const url = new URL(req.url)
    const includeCanceled = url.searchParams.get('includeCanceled') === '1'

    // 1) Alle Lack-Orders, wo du Buyer ODER Supplier bist
    const { data: orders, error: ordErr } = await sb
      .from('orders')
      .select(`
        id, created_at, buyer_id, supplier_id, kind, request_id, offer_id,
        amount_cents, currency, status,
        reported_at, released_at, refunded_at, dispute_opened_at, dispute_reason,
        auto_release_at, shipped_at, auto_refund_at
      `)
      .eq('kind', 'lack')
      .or(`buyer_id.eq.${user.id},supplier_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 })
    let rows = orders ?? []

    // Optional: stornierte/erstattete ausblenden (default)
    if (!includeCanceled) {
      rows = rows.filter(r => {
        const canceled = String(r.status).toLowerCase() === 'canceled'
        const hasDispute = !!r.dispute_opened_at
        return !(canceled && !hasDispute)
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({ vergeben: [], angenommen: [] })
    }

    // 2) IDs einsammeln
    const offerIds    = Array.from(new Set(rows.map(r => r.offer_id).filter(Boolean))) as string[]
    const reqIds      = Array.from(new Set(rows.map(r => r.request_id).filter(Boolean))) as string[]
    const supplierIds = Array.from(new Set(rows.map(r => r.supplier_id).filter(Boolean))) as string[]
    const buyerIds    = Array.from(new Set(rows.map(r => r.buyer_id).filter(Boolean))) as string[]
    const orderIds    = rows.map(r => String(r.id))

    const admin = supabaseAdmin()

    // 2.5) Eigene Reviews (damit FE "Bewerten"-Button ausblendet)
    let myReviewMap = new Map<string, { stars: number; comment: string }>()
    if (orderIds.length) {
      const { data: myRevs, error: myRevErr } = await admin
        .from('reviews')
        .select('order_id, stars, comment')
        .in('order_id', orderIds)
        .eq('rater_id', user.id)
      if (myRevErr) return NextResponse.json({ error: myRevErr.message }, { status: 500 })

      myReviewMap = new Map(
        (myRevs ?? []).map((r: any) => [
          String(r.order_id),
          { stars: Number(r.stars), comment: String(r.comment ?? '') },
        ])
      )
    }

    // 3) lack_offers → item/shipping (optional)
    const offersById = new Map<string, { item_amount_cents: number | null; shipping_cents: number | null }>()
    if (offerIds.length) {
      const { data: ofs, error } = await admin
        .from('lack_offers')
        .select('id, item_amount_cents, shipping_cents')
        .in('id', offerIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const o of ofs ?? []) {
        offersById.set(String(o.id), {
          item_amount_cents: (o as any).item_amount_cents ?? null,
          shipping_cents:    (o as any).shipping_cents ?? null,
        })
      }
    }

    // 4) lack_requests → Meta (optional)
    const reqById = new Map<string, any>()
    if (reqIds.length) {
      const { data: reqs, error } = await admin
        .from('lack_requests')
        .select('id, owner_id, title, lieferdatum, delivery_at, data')
        .in('id', reqIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const r of reqs ?? []) reqById.set(String(r.id), r)
    }

    // 5) profiles → Anbieter (supplier) + Auftraggeber (owner) + **Käufer (buyer)**
    const ownerIds = Array.from(new Set(
      Array.from(reqById.values()).map((r: any) => r.owner_id).filter(Boolean)
    )) as string[]

    const profileIds = Array.from(new Set([
      ...supplierIds,
      ...ownerIds,
      ...buyerIds, // <— für Rechnungsadresse inkl. UID
    ]))

    type Prof = {
      id: string
      username: string | null
      company_name: string | null
      rating_avg: number | null
      rating_count: number | null
      account_type?: 'private' | 'business' | string | null
      address?: { street?: string|null; houseNumber?: string|null; zip?: string|null; city?: string|null; country?: string|null } | null
      vat_number?: string | null
    }

    const profById = new Map<string, Prof>()
    if (profileIds.length) {
      const { data: profs, error } = await admin
        .from('profiles')
        .select('id, username, company_name, rating_avg, rating_count, account_type, address, vat_number')
        .in('id', profileIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      for (const p of profs ?? []) profById.set(String((p as any).id), p as Prof)
    }

    // 6) Mapper → UI-Objekt
    const toUi = (r: any) => {
      const kind: UiKind = r.buyer_id === user.id ? 'vergeben' : 'angenommen'

      // Anbieter
      const vProf = r.supplier_id ? profById.get(String(r.supplier_id)) : undefined
      const vendorUsername = vProf?.username?.trim() || null
      const vendorDisplay  = vProf?.company_name?.trim() || null
      const vendorName     = vendorDisplay || vendorUsername || 'Anbieter'
      const vendorRating      = vProf?.rating_avg != null ? Number(vProf.rating_avg) : null
      const vendorRatingCount = vProf?.rating_count != null ? Number(vProf.rating_count) : null

      // Request-Meta
      const req = reqById.get(String(r.request_id))
      const title = req?.title ?? req?.data?.verfahrenstitel ?? req?.data?.verfahrenTitel ?? req?.data?.verfahren ?? null
      const lieferdatum = pickLiefer(req)
      const ort   = req?.data?.ort ?? null
      const menge = parseMenge(req?.data ?? null)

      // Auftraggeber-Profil
      const oProf = req?.owner_id ? profById.get(String(req.owner_id)) : undefined
      const ownerHandle      = oProf?.username?.trim() || null
      const ownerDisplay     = oProf?.company_name?.trim() || null
      const ownerRating      = oProf?.rating_avg  != null ? Number(oProf.rating_avg) : null
      const ownerRatingCount = oProf?.rating_count!= null ? Number(oProf.rating_count) : null

      // Preisaufschlüsselung
      const off = r.offer_id ? offersById.get(String(r.offer_id)) : undefined

      // Fallback-Deadlines (falls auto_* leer)
      const releaseAtUi =
        r.auto_release_at ?? (r.reported_at ? addDaysIso(r.reported_at, 28) : null)

      // Gleich wie Cron: min(created_at+7d, Ende Lieferdatum)
      const sevenDaysAfter = addDaysIso(r.created_at, 7)
      const eodLiefer      = endOfDayIso(lieferdatum)
      const minAutoRefund  =
        eodLiefer ? new Date(Math.min(+new Date(sevenDaysAfter), +new Date(eodLiefer))).toISOString()
                  : sevenDaysAfter

      const refundAtUi = r.auto_refund_at ?? minAutoRefund

      // Eigene Bewertung
      const mine = myReviewMap.get(String(r.id))
      const myReview = mine
        ? { stars: Math.max(1, Math.min(5, Number(mine.stars))) as 1|2|3|4|5, text: String(mine.comment ?? '') }
        : undefined

      // === Adressen (nur wenn ich Verkäufer bin → 'angenommen')
      let shippingAddressStr: string | undefined
      let billingAddressStr:  string | undefined

      // Zusätzlich als strukturierte Objekte zurückgeben
      let shippingAddress: {
        company?: string | null
        firstName?: string | null
        lastName?: string | null
        street?: string | null
        houseNumber?: string | null
        zip?: string | null
        city?: string | null
        country?: string | null
      } | undefined

      let billingAddress: {
        company?: string | null
        vat?: string | null
        firstName?: string | null
        lastName?: string | null
        street?: string | null
        houseNumber?: string | null
        zip?: string | null
        city?: string | null
        country?: string | null
        isBusiness?: boolean
      } | undefined

      if (kind === 'angenommen') {
        const d = (req?.data ?? {}) as any

        // ====== LIEFERADRESSE (aus Request-Daten) ======
        const shipCompany   = (d.firma && String(d.firma).trim()) || null
        const shipFirstName = (d.vorname && String(d.vorname).trim()) || null
        const shipLastName  = (d.nachname && String(d.nachname).trim()) || null
        const shipStreet    = (d.strasse && String(d.strasse).trim()) || null
        const shipHNr       = (d.hausnummer && String(d.hausnummer).trim()) || null
        const shipZip       = (d.plz && String(d.plz).trim()) || null
        const shipCity      = ((d.ort || d.lieferort) && String(d.ort || d.lieferort).trim()) || null
        const shipCountry   = (d.land && String(d.land).trim()) || null

        shippingAddress = {
          company: shipCompany,
          firstName: shipFirstName,
          lastName: shipLastName,
          street: shipStreet,
          houseNumber: shipHNr,
          zip: shipZip,
          city: shipCity,
          country: shipCountry,
        }

        // Falls bereits fertiger String existiert, trotzdem „schön“ mit Name/Firma ausgeben
        if (typeof d.lieferadresse === 'string' && d.lieferadresse.trim()) {
          // Ersetze durch beschriftete Version mit denselben Bausteinen
          shippingAddressStr = prettyAddress({
            company: shipCompany,
            firstName: shipFirstName,
            lastName: shipLastName,
            street: shipStreet,
            houseNumber: shipHNr,
            zip: shipZip,
            city: shipCity,
            country: shipCountry,
            includeNameLines: true,
          })
        } else {
          shippingAddressStr = prettyAddress({
            company: shipCompany,
            firstName: shipFirstName,
            lastName: shipLastName,
            street: shipStreet,
            houseNumber: shipHNr,
            zip: shipZip,
            city: shipCity,
            country: shipCountry,
            includeNameLines: true,
          })
        }

        // ====== RECHNUNGSADRESSE (aus Buyer-Profil) ======
        const buyerProf = r.buyer_id ? profById.get(String(r.buyer_id)) : undefined
        if (buyerProf) {
          const isBusiness = (buyerProf.account_type === 'business') || d.account_type === 'business' || d.istGewerblich === true
          const billCompany   = (buyerProf.company_name && String(buyerProf.company_name).trim()) || null
          const billVat       = (buyerProf.vat_number && String(buyerProf.vat_number).trim()) || null
          // Für private Käufer: Namen aus Request-Daten nehmen
          const billFirstName = !isBusiness ? shipFirstName : null
          const billLastName  = !isBusiness ? shipLastName  : null

          const addr = (buyerProf.address || {}) as any
          const billStreet  = (addr.street && String(addr.street).trim()) || null
          const billHNr     = (addr.houseNumber && String(addr.houseNumber).trim()) || null
          const billZip     = (addr.zip && String(addr.zip).trim()) || null
          const billCity    = (addr.city && String(addr.city).trim()) || null
          const billCountry = (addr.country && String(addr.country).trim()) || null

          billingAddress = {
            company: billCompany,
            vat: billVat,
            firstName: billFirstName,
            lastName: billLastName,
            street: billStreet,
            houseNumber: billHNr,
            zip: billZip,
            city: billCity,
            country: billCountry,
            isBusiness,
          }

          billingAddressStr = prettyAddress({
            company: billCompany,
            vat: billVat,
            firstName: billFirstName,
            lastName: billLastName,
            street: billStreet,
            houseNumber: billHNr,
            zip: billZip,
            city: billCity,
            country: billCountry,
            includeNameLines: true, // auch bei Firma die Person anzeigen, falls vorhanden
          })
        }
      }

      return {
        orderId: String(r.id),
        requestId: String(r.request_id),
        offerId: r.offer_id ?? undefined,
        amountCents: Number(r.amount_cents),
        itemCents: (typeof off?.item_amount_cents === 'number') ? off!.item_amount_cents : undefined,
        shippingCents: (typeof off?.shipping_cents === 'number') ? off!.shipping_cents : undefined,
        acceptedAt: String(r.created_at),
        kind,

        vendor: vendorName,

        vendorName,
        vendorUsername,
        vendorDisplay,
        vendorRating,
        vendorRatingCount,
        vendorId: r.supplier_id ?? null,
        ownerId : req?.owner_id ?? null,

        title,
        ort,
        lieferdatum,
        mengeKg: typeof menge === 'number' ? menge : null,

        ownerHandle,
        ownerDisplay,
        ownerRating,
        ownerRatingCount,

        status: uiStatus(r) as UiStatus,
        deliveredReportedAt: r.reported_at ?? undefined,
        deliveredConfirmedAt: r.released_at ?? undefined,
        autoReleaseAt: releaseAtUi ?? undefined,
        disputeOpenedAt: r.dispute_opened_at ?? undefined,
        disputeReason: r.dispute_reason ?? null,

        shippedAt: r.shipped_at ?? undefined,
        autoRefundAt: refundAtUi ?? undefined,
        refundedAt: r.refunded_at ?? undefined,

        myReview,

        // >>> neue Felder für Verkäufer-Ansicht
        shippingAddressStr,
        billingAddressStr,

        // zusätzlich strukturiert:
        shippingAddress,
        billingAddress,
      }
    }

    const vergeben   = rows.filter(r => r.buyer_id    === user.id).map(toUi)
    const angenommen = rows.filter(r => r.supplier_id === user.id).map(toUi)

    return NextResponse.json({ vergeben, angenommen })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list orders' }, { status: 500 })
  }
}
