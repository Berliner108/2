// src/app/api/profile/nda/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const NDA_BUCKET = 'user-ndas';
const MAX_NDA_SIZE_BYTES = 10 * 1024 * 1024;

function jsonError(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...(extra ?? {}) }, { status });
}

function makeNdaVersion() {
  return `custom-${new Date().toISOString()}`;
}

function isPdf(file: File) {
  const name = file.name.toLowerCase();
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}

export async function GET() {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();

    if (error || !user) {
      return jsonError('unauthenticated', 401);
    }

    const admin = supabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(`
        id,
        account_type,
        custom_nda_file_path,
        custom_nda_file_name,
        custom_nda_file_size,
        custom_nda_uploaded_at,
        custom_nda_version
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return jsonError('db', 500, { message: profileError.message });
    }

    if (!profile) {
      return jsonError('profile_not_found', 404);
    }

    return NextResponse.json(
      {
        ok: true,
        nda: profile.custom_nda_file_path
          ? {
              filePath: profile.custom_nda_file_path,
              fileName: profile.custom_nda_file_name,
              fileSize: profile.custom_nda_file_size,
              uploadedAt: profile.custom_nda_uploaded_at,
              version: profile.custom_nda_version,
            }
          : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    console.error('[profile nda GET] fatal:', e);
    return jsonError('fatal', 500, { message: String(e?.message ?? e) });
  }
}

export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();

    if (error || !user) {
      return jsonError('unauthenticated', 401);
    }

    const formData = await req.formData();
    const rawFile = formData.get('file');

    if (!(rawFile instanceof File)) {
      return jsonError('missing_file', 400);
    }

    if (!isPdf(rawFile)) {
      return jsonError('invalid_file_type', 400);
    }

    if (rawFile.size <= 0) {
      return jsonError('empty_file', 400);
    }

    if (rawFile.size > MAX_NDA_SIZE_BYTES) {
      return jsonError('file_too_large', 400);
    }

    const admin = supabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, account_type, custom_nda_file_path')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return jsonError('db', 500, { message: profileError.message });
    }

    if (!profile) {
      return jsonError('profile_not_found', 404);
    }

    if (profile.account_type !== 'business') {
      return jsonError('only_business_users_can_upload_nda', 403);
    }

    const path = `${user.id}/current.pdf`;
    const arrayBuffer = await rawFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const version = makeNdaVersion();
    const uploadedAt = new Date().toISOString();

    const { error: uploadError } = await admin.storage
      .from(NDA_BUCKET)
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[profile nda POST] storage upload:', uploadError);
      return jsonError('storage_upload_failed', 500, {
        message: uploadError.message,
      });
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({
        custom_nda_file_path: path,
        custom_nda_file_name: rawFile.name || 'nda.pdf',
        custom_nda_file_size: rawFile.size,
        custom_nda_uploaded_at: uploadedAt,
        custom_nda_version: version,
        updated_at: uploadedAt,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[profile nda POST] profile update:', updateError);
      return jsonError('db', 500, { message: updateError.message });
    }

    return NextResponse.json({
      ok: true,
      nda: {
        filePath: path,
        fileName: rawFile.name || 'nda.pdf',
        fileSize: rawFile.size,
        uploadedAt,
        version,
      },
    });
  } catch (e: any) {
    console.error('[profile nda POST] fatal:', e);
    return jsonError('fatal', 500, { message: String(e?.message ?? e) });
  }
}