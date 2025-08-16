// src/app/api/check-mail/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  return s ? s : null
}

/**
 * POST /api/check-mail
 * Body: { email: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const email = normalizeEmail(body?.email)
    if (!email) {
      return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // auth.users abfragen (Service-Role erforderlich)
    const { data, error } = await admin
      .schema('auth')
      .from('users')
      .select('id, email_confirmed_at')
      .eq('email', email)
      .maybeSingle()

    // PGRST116 = no rows; bei maybeSingle() kommt i.d.R. kein Fehler – nur Vorsicht
    if (error && (error as any).code !== 'PGRST116') {
      return NextResponse.json(
        { ok: false, error: 'db', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      exists: !!data,
      confirmed: !!data?.email_confirmed_at,
    })
  } catch (err: any) {
    console.error('[check-mail POST] fatal:', err)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/check-mail?email=foo@bar.tld
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const email = normalizeEmail(searchParams.get('email'))
    if (!email) {
      return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    const { data, error } = await admin
      .schema('auth')
      .from('users')
      .select('id, email_confirmed_at')
      .eq('email', email)
      .maybeSingle()

    if (error && (error as any).code !== 'PGRST116') {
      return NextResponse.json(
        { ok: false, error: 'db', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      exists: !!data,
      confirmed: !!data?.email_confirmed_at,
    })
  } catch (err: any) {
    console.error('[check-mail GET] fatal:', err)
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
