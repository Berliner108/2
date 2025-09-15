// /src/app/api/invoices/admin/list/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAdminEmail(email?: string | null) {
  const raw = process.env.ADMIN_EMAILS || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return !!(email && list.includes(email.toLowerCase()))
}

export async function GET(req: Request) {
  try {
    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Admin-Gate: entweder per Profile.role === 'admin' ODER in ADMIN_EMAILS
    const admin = supabaseAdmin()
    const { data: me } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const roleIsAdmin = (me?.role || '').toLowerCase() === 'admin'
    const mailIsAdmin = isAdminEmail(user.email)
    if (!roleIsAdmin && !mailIsAdmin) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Query-Params
    const url   = new URL(req.url)
    const page  = Math.max(parseInt(url.searchParams.get('page')  || '1', 10), 1)
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200)
    const q     = (url.searchParams.get('q') || '').trim()

    const from = (page - 1) * limit
    const to   = from + limit - 1

    // Selektiere aus platform_invoices + join auf profiles (seller/buyer)
    let query = admin
      .from('platform_invoices')
      .select(`
        id,
        order_id,
        number,
        issued_at,
        currency,
        total_gross_cents,
        fee_cents,
        net_payout_cents,
        pdf_path,
        seller:profiles!platform_invoices_supplier_id_fkey ( id, username, company_name ),
        buyer:profiles!platform_invoices_buyer_id_fkey     ( id, username, company_name )
      `, { count: 'exact' })
      .order('issued_at', { ascending: false })
      .range(from, to)

    if (q) {
      // Suche in Rechnungsnummer oder Order-ID
      query = query.or(`number.ilike.%${q}%,order_id.ilike.%${q}%`)
    }

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const items = (data || []).map((r: any) => {
      const sellerName = r.seller?.company_name || r.seller?.username || r.seller?.id || ''
      const buyerName  = r.buyer?.company_name  || r.buyer?.username  || r.buyer?.id  || ''
      return {
        id: r.id,
        orderId: r.order_id,
        number: r.number,
        issuedAt: r.issued_at,
        currency: (r.currency || 'eur').toUpperCase(),

        // WICHTIG: Zahlen als Cents für deine UI-Formatierung
        totalGrossCents: r.total_gross_cents,
        feeCents:        r.fee_cents,
        netPayoutCents:  r.net_payout_cents,

        seller: { id: r.seller?.id, name: sellerName },
        buyer:  { id: r.buyer?.id,  name: buyerName  },

        // gültige Download-URL (nutzt deine /api/invoices/[id]/download)
        downloadUrl: `/api/invoices/${r.id}/download`,
      }
    })

    return NextResponse.json({
      items,
      total: count ?? items.length,
      page,
      limit,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
