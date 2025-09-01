// /src/app/api/me/profile/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const admin = supabaseAdmin()

    // Wir holen ALLE Spalten und normalisieren unten → robust, egal wie deine Profile-Spalten heißen
    const { data: prof, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'db error' }, { status: 500 })
    if (!prof) return NextResponse.json({ error: 'profile not found' }, { status: 404 })

    // Mögliche Feldnamen zusammenführen (fallbacks)
    const city    = prof.address_city ?? prof.city ?? prof.ort ?? null
    const zip     = prof.address_zip  ?? prof.zip  ?? prof.postal_code ?? null
    const line1   = prof.address_line1 ?? prof.street ?? prof.address ?? null
    const country = prof.address_country ?? prof.country ?? null
    const username = prof.username ?? user.email ?? null

    const ortLabel =
      city && zip ? `${zip} ${city}`
      : city ? String(city)
      : zip  ? String(zip)
      : null

    return NextResponse.json({
      ok: true,
      profile: {
        id: prof.id,
        username,
        address: {
          line1: line1 ?? '',
          zip: zip ?? '',
          city: city ?? '',
          country: country ?? '',
          ortLabel: ortLabel ?? '',
        },
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
