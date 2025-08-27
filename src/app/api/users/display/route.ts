// src/app/api/users/display/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || undefined
    const username = searchParams.get('username') || undefined
    if (!userId && !username) {
      return NextResponse.json({ error: 'Provide userId or username' }, { status: 400 })
    }

    let row: any = null
    if (userId) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, account_type, company_name')
        .eq('id', userId)
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      row = data
    } else {
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, account_type, company_name')
        .ilike('username', username!)
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      row = data
    }

    if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const acct = String(row.account_type || '').toLowerCase()
    const displayName =
      acct === 'business' && row.company_name ? row.company_name : (row.username ?? 'Unbekannt')

    return NextResponse.json({
      userId: row.id,
      username: row.username,
      accountType: row.account_type,
      companyName: row.company_name,
      displayName,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}
