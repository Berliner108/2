//app/api/page-views/purge/route.ts

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  // nur eingeloggte (optional: hier Admin-Check)
  const cookieClient = createRouteHandlerClient({ cookies })
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  // Standard: alles älter als 30 Tage löschen
  const cutoffDays = 30
  const cutoff = new Date(Date.now() - cutoffDays*24*60*60*1000).toISOString()

  const db = new createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await db.from('page_views').delete().lt('ts', cutoff)
  if (error) {
    return NextResponse.json({ ok:false, error: error.message }, { status:400 })
  }
  return NextResponse.redirect(new URL('/admin/analytics', req.url))
}
