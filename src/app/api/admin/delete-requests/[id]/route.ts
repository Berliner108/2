// /src/app/api/admin/delete-requests/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin' // ggf. anpassen

type DeleteStatus = 'open' | 'rejected' | 'done'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    const sb = supabaseAdmin()
    const body = await req.json().catch(() => ({}))

    const nextStatus: DeleteStatus = body.status || 'rejected'
    const adminNote: string | null = body.admin_note ?? null

    // Wir erlauben hier nur "rejected" aus dem Admin-UI
    if (nextStatus !== 'rejected') {
      return NextResponse.json(
        { error: 'INVALID_STATUS', message: 'Nur Status "rejected" ist hier erlaubt.' },
        { status: 400 }
      )
    }

    const { data, error } = await sb
      .from('account_delete_requests')
      .update({
        status: nextStatus,
        admin_note: adminNote,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('DB-Fehler', error)
      return NextResponse.json(
        { error: 'DB_ERROR', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ request: data })
  } catch (err: any) {
    console.error('UNBEKANNTER FEHLER', err)
    return NextResponse.json(
      { error: 'UNKNOWN', message: 'Fehler beim Aktualisieren der Löschanfrage.' },
      { status: 500 }
    )
  }
}
