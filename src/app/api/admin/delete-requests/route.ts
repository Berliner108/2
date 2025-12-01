// /src/app/api/admin/delete-requests/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin' // ggf. anpassen

export async function GET() {
  try {
    const sb = supabaseAdmin()

    const { data, error } = await sb
      .from('account_delete_requests') // TABELLENNAME anpassen falls anders
      .select(
        `
          id,
          status,
          reason,
          admin_note,
          created_at,
          updated_at,
          user_id,
          user:auth.users!inner(email)
        `
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('DB-Fehler', error)
      return NextResponse.json(
        { error: 'DB_ERROR', message: error.message },
        { status: 500 }
      )
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      status: row.status,
      reason: row.reason,
      admin_note: row.admin_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id,
      user_email: row.user?.email ?? null,
    }))

    return NextResponse.json({ items })
  } catch (err: any) {
    console.error('UNBEKANNTER FEHLER', err)
    return NextResponse.json(
      { error: 'UNKNOWN', message: 'Fehler beim Laden der Löschanfragen.' },
      { status: 500 }
    )
  }
}
