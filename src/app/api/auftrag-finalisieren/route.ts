import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: 401 },
      )
    }

    const body = await req.json()

    console.log('auftrag-finalisieren body:', body)

    return NextResponse.json({
      ok: true,
      message: 'Finalisieren-Route funktioniert',
      userId: user.id,
    })
  } catch (err: any) {
    console.error('Fehler in /api/auftrag-finalisieren:', err)

    return NextResponse.json(
      {
        error: 'internal_error',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    )
  }
}