import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || '';

export async function POST(req: Request) {
  try {
    const { email, redirect } = await req.json();
    const addr = (email || '').toString().trim().toLowerCase();
    if (!addr || !addr.includes('@')) {
      return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Rate-Limit: 5 Anfragen / 60s pro IP+E-Mail
    const scope = 'reset-resend';
    const key = `${ip}:${addr}`;
    const { data: allowed, error: rlErr } = await admin.rpc('rl_allow', {
      p_scope: scope, p_key: key, p_max: 5, p_window_seconds: 60,
    });

    if (rlErr) {
      return NextResponse.json({ error: 'RL_ERROR' }, { status: 500 });
    }
    if (!allowed) {
      return NextResponse.json({ error: 'RATE_LIMIT' }, { status: 429 });
    }

    // 2) Reset-Mail serverseitig auslösen (Full Gate)
    const redirectParam = typeof redirect === 'string' ? redirect : '/';
    const redirectTo = SITE_URL
      ? `${SITE_URL}/auth/callback?flow=reset&redirect=${encodeURIComponent(redirectParam)}`
      : `/auth/callback?flow=reset&redirect=${encodeURIComponent(redirectParam)}`;

    const { error } = await admin.auth.resetPasswordForEmail(addr, { redirectTo });
    if (error) {
      return NextResponse.json({ error: 'SEND_FAILED' }, { status: 400 });
    }

    // 3) Opportunistisches Aufräumen (ohne Cron), ~1% der Requests
    if (Math.random() < 0.01) {
      const windowSeconds = 60;                       // wie oben
      const keepWindows = 60 * 24;                    // z.B. 24h behalten
      const nowSlot = Math.floor(Date.now() / 1000 / windowSeconds);
      // alte Slots löschen
      await admin
        .from('rl_counter')
        .delete()
        .lt('slot', nowSlot - keepWindows);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
