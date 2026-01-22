// src/app/api/jobs/[jobId]/offers/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

type Body = {
  artikel_cents: number;
  versand_cents: number;
  gesamt_cents: number;
};

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n);
}

function parseBody(raw: any): { ok: true; value: Body } | { ok: false; error: string } {
  const a = raw?.artikel_cents;
  const v = raw?.versand_cents;
  const g = raw?.gesamt_cents;

  if (!isInt(a) || !isInt(v) || !isInt(g)) return { ok: false, error: 'invalid_price_format' };
  if (a < 0 || v < 0) return { ok: false, error: 'negative_prices_not_allowed' };
  if (g !== a + v) return { ok: false, error: 'sum_mismatch' };

  return { ok: true, value: { artikel_cents: a, versand_cents: v, gesamt_cents: g } };
}

function toISO(d: Date) {
  return d.toISOString();
}

export async function POST(req: Request, ctx: { params: { jobId: string } }) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }

    const jobId = String(ctx?.params?.jobId ?? '').trim();
    if (!jobId) {
      return NextResponse.json({ ok: false, error: 'missing_job_id' }, { status: 400 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = parseBody(raw);

    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const { artikel_cents, versand_cents, gesamt_cents } = parsed.value;

    const admin = supabaseAdmin();

    // 1) Job laden + Regeln prüfen
    const { data: job, error: jobErr } = await admin
      .from('jobs')
      .select('id, user_id, published, status, liefer_datum_utc')
      .eq('id', jobId)
      .maybeSingle();

    if (jobErr || !job) {
      return NextResponse.json({ ok: false, error: 'job_not_found' }, { status: 404 });
    }

    if (!job.published || String(job.status) !== 'open') {
      return NextResponse.json({ ok: false, error: 'job_not_open' }, { status: 409 });
    }

    const ownerId = String(job.user_id);
    if (ownerId === user.id) {
      return NextResponse.json({ ok: false, error: 'cannot_offer_on_own_job' }, { status: 403 });
    }

    const lieferDate = new Date(String(job.liefer_datum_utc));
    if (isNaN(+lieferDate)) {
      return NextResponse.json({ ok: false, error: 'job_missing_liefer_datum' }, { status: 409 });
    }

    // 24h vor Warenausgabe: Abgabe sperren
    const now = new Date();
    const cutOff = new Date(lieferDate.getTime() - 24 * 60 * 60 * 1000); // liefer - 24h
    if (+now >= +cutOff) {
      return NextResponse.json({ ok: false, error: 'offer_window_closed' }, { status: 403 });
    }

    // valid_until = min(now+72h, liefer-24h)
    const plus72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const valid_until = new Date(Math.min(+plus72h, +cutOff));
    if (+valid_until <= +now) {
      return NextResponse.json({ ok: false, error: 'valid_until_invalid' }, { status: 409 });
    }

    // 2) Profil (Snapshot-Quelle: city/country/account_type + private address/company/vat)
    const { data: prof, error: profErr } = await admin
      .from('profiles')
      .select('id, account_type, company_name, vat_number, address')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !prof) {
      return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 409 });
    }

    const addr: any = prof.address || {};
    const meta: any = user.user_metadata || {};

    // Snapshot: public kommt NUR aus Snapshot (wie du willst)
    const snapPublic = {
      account_type: String(prof.account_type || ''),
      location: {
        country: String(addr.country || ''),
        city: String(addr.city || ''),
      },
    };

    // Private Snapshot für später (nach Zahlung anzeigen)
    const snapPrivate = {
      firstName: String(meta.firstName || ''),
      lastName: String(meta.lastName || ''),
      address: {
        street: String(addr.street || ''),
        houseNumber: String(addr.houseNumber || ''),
        zip: String(addr.zip || ''),
        city: String(addr.city || ''),
        country: String(addr.country || ''),
      },
      company_name: String(prof.company_name || ''),
      vat_number: String(prof.vat_number || ''),
    };

    const anbieter_snapshot = {
      public: snapPublic,
      private: snapPrivate,
    };

    // 3) Insert offer (Unique(job_id, bieter_id) blockt 2. Angebot)
    const { data: inserted, error: insErr } = await admin
      .from('job_offers')
      .insert({
        job_id: jobId,
        bieter_id: user.id,
        owner_id: ownerId,
        artikel_cents,
        versand_cents,
        gesamt_cents,
        valid_until: toISO(valid_until),
        status: 'open',
        anbieter_snapshot,
      })
      .select('id, valid_until')
      .maybeSingle();

    if (insErr) {
      const code = (insErr as any)?.code;
      const msg = String((insErr as any)?.message ?? '');

      // Unique violation => schon angeboten
      if (code === '23505' || /duplicate key value violates unique constraint/i.test(msg)) {
        return NextResponse.json({ ok: false, error: 'already_offered' }, { status: 409 });
      }

      console.error('[job_offers insert] db:', insErr);
      return NextResponse.json({ ok: false, error: 'db', message: msg, code }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, offerId: inserted?.id, valid_until: inserted?.valid_until },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[POST /api/jobs/:jobId/offers] fatal:', e);
    return NextResponse.json(
      { ok: false, error: 'fatal', message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
