import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type Props = {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Props) {
  const { id } = await params
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

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, user_id, nda_required, nda_type, nda_version')
    .eq('id', id)
    .maybeSingle()

  if (jobError) {
    return NextResponse.json(
      { error: jobError.message },
      { status: 500 },
    )
  }

  if (!job) {
    return NextResponse.json(
      { error: 'job_not_found' },
      { status: 404 },
    )
  }

  if (!job.nda_required) {
    return NextResponse.json(
      { ok: true, skipped: 'nda_not_required' },
      { status: 200 },
    )
  }

  if (job.user_id === user.id) {
    return NextResponse.json(
      { ok: true, skipped: 'owner_does_not_need_acceptance' },
      { status: 200 },
    )
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null

  const userAgent = req.headers.get('user-agent')

  const { error: insertError } = await supabase
    .from('job_nda_acceptances')
    .insert({
      job_id: job.id,
      user_id: user.id,
      nda_type: job.nda_type ?? 'standard',
      nda_version: job.nda_version ?? 'v1',
      ip_address: ip,
      user_agent: userAgent,
    })

  if (insertError && insertError.code !== '23505') {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}