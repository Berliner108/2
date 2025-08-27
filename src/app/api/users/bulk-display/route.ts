// src/app/api/users/bulk-display/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin()
    const { searchParams } = new URL(req.url)
    const idsParam = searchParams.get('ids') // comma-separated
    if (!idsParam) return NextResponse.json({ error: 'Provide ids=uuid1,uuid2' }, { status: 400 })
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
    if (!ids.length) return NextResponse.json({ users: [] })

    const { data, error } = await admin
      .from('profiles')
      .select('id, username, account_type, company_name')
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const users = (data ?? []).map(r => {
      const acct = String(r.account_type || '').toLowerCase()
      const displayName =
        acct === 'business' && r.company_name ? r.company_name : (r.username ?? 'Unbekannt')
      return {
        userId: r.id,
        username: r.username,
        accountType: r.account_type,
        companyName: r.company_name,
        displayName,
      }
    })

    return NextResponse.json({ users })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
