import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type Props = {
  params: Promise<{ jobId: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { jobId } = await params
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
    .select('id, user_id, nda_required, nda_type, nda_file_bucket, nda_file_path, nda_file_name')
    .eq('id', jobId)
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

  if (!job.nda_required || job.nda_type !== 'custom') {
    return NextResponse.json(
      { error: 'custom_nda_not_available' },
      { status: 404 },
    )
  }

  if (!job.nda_file_bucket || !job.nda_file_path) {
    return NextResponse.json(
      { error: 'custom_nda_file_missing' },
      { status: 404 },
    )
  }

  const admin = supabaseAdmin()

  const { data, error: signedUrlError } = await admin.storage
    .from(job.nda_file_bucket)
    .createSignedUrl(job.nda_file_path, 60)

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json(
      {
        error: 'signed_url_failed',
        details: signedUrlError?.message,
      },
      { status: 500 },
    )
  }

  return NextResponse.redirect(data.signedUrl)
}