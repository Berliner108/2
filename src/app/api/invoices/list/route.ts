import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()
  const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isAdmin = me?.role === 'admin' || me?.role === 'moderator'
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('invoices')
    .select('id, created_at, order_id, vendor_id, gross_cents, vat_cents, net_amount_cents, currency, pdf_path, meta')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ items: data })
}
