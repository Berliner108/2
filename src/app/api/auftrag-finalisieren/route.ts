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

    const jobId = body.jobId as string | undefined

    if (!jobId) {
      return NextResponse.json(
        { error: 'missing_job_id' },
        { status: 400 },
      )
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id,user_id,published,status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'job_not_found', details: jobError?.message },
        { status: 404 },
      )
    }

    if (job.user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403 },
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Job gehört eingeloggtem Benutzer',
      job,
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