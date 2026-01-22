// src/app/api/offers/received/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

function pickSnapPublic(snap: any) {
  const pub = snap?.public ?? {};
  const loc = pub?.location ?? {};
  return {
    snap_account_type: String(pub?.account_type ?? ''),
    snap_country: String(loc?.country ?? ''),
    snap_city: String(loc?.city ?? ''),
  };
}

export async function GET() {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const nowIso = new Date().toISOString();

    // Nur aktive Angebote für Jobs, die dem User gehören
    const { data: rows, error } = await admin
      .from('job_offers')
      .select(
        `
        id,
        job_id,
        bieter_id,
        artikel_cents,
        versand_cents,
        gesamt_cents,
        created_at,
        valid_until,
        status,
        anbieter_snapshot
      `
      )
      .eq('owner_id', user.id)
      .gt('valid_until', nowIso)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[received offers] db:', error);
      return NextResponse.json({ ok: false, error: 'db' }, { status: 500 });
    }

    const bieterIds = Array.from(new Set((rows ?? []).map((r: any) => String(r.bieter_id)).filter(Boolean)));

    // Live username + rating aus public.profiles (nur diese Felder!)
    const { data: profs, error: pErr } = bieterIds.length
      ? await admin
          .from('profiles')
          .select('id, username, rating_avg, rating_count')
          .in('id', bieterIds)
      : { data: [], error: null };

    if (pErr) {
      console.error('[received offers profiles] db:', pErr);
      return NextResponse.json({ ok: false, error: 'db_profiles' }, { status: 500 });
    }

    const profMap = new Map<string, any>();
    for (const p of profs ?? []) profMap.set(String((p as any).id), p);

    const offers = (rows ?? []).map((r: any) => {
      const p = profMap.get(String(r.bieter_id)) || {};
      const snap = pickSnapPublic(r.anbieter_snapshot);

      return {
        id: String(r.id),
        job_id: String(r.job_id),

        artikel_cents: Number(r.artikel_cents),
        versand_cents: Number(r.versand_cents),
        gesamt_cents: Number(r.gesamt_cents),

        created_at: String(r.created_at),
        valid_until: String(r.valid_until),

        // Snapshot (fix, nicht live)
        snap_country: snap.snap_country || '—',
        snap_city: snap.snap_city || '—',
        snap_account_type: snap.snap_account_type || '',

        // Live aus profiles
        username: typeof p.username === 'string' && p.username.trim() ? p.username : '',
        rating_avg: typeof p.rating_avg === 'number' ? p.rating_avg : Number(p.rating_avg ?? 0) || 0,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : Number(p.rating_count ?? 0) || 0,
      };
    });

    return NextResponse.json({ ok: true, offers }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[GET /api/offers/received] fatal:', e);
    return NextResponse.json({ ok: false, error: 'fatal' }, { status: 500 });
  }
}
