// src/app/api/lack/requests/[id]/offer/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // Next 15: params is a Promise
) {
  try {
    const { id } = await params

    const userClient = await supabaseServer()
    const { data: auth } = await userClient.auth.getUser()
    const user = auth?.user
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Beispiel: Angebot anlegen (Tabellen-/Feldnamen ggf. anpassen)
    const admin = supabaseAdmin()
    const insert = {
      request_id: id,
      user_id: user.id,
      amount: body.amount ?? null,
      message: body.message ?? null,
      // weitere Felder aus body übernehmen, falls vorhanden:
      // delivery_date: body.delivery_date ?? null,
      // attachments: body.attachments ?? null,
    }

    const { data, error } = await admin
      .from('lack_offers') // <— ggf. auf eure Tabelle ändern
      .insert(insert)
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, offerId: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Failed to create offer' }, { status: 500 })
  }
}
