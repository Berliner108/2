'use client';

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

function safeRedirectClient(input: string | null): string {
  const fallback = '/';
  if (!input) return fallback;
  try {
    const base = window.location.origin;
    const url = new URL(input, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash || fallback;
  } catch {
    return input.startsWith('/') ? input : fallback;
  }
}

export default function AuthConfirmPage() {
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser();

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const flow = url.searchParams.get('flow'); // "reset" etc.
      const redirect = safeRedirectClient(url.searchParams.get('redirect'));

      // Hash-Fragment wie "#access_token=...&refresh_token=...&type=recovery"
      const hash = url.hash.replace(/^#/, '');
      const h = new URLSearchParams(hash);
      const access_token = h.get('access_token');
      const refresh_token = h.get('refresh_token');
      const type = h.get('type') || url.searchParams.get('type');

      let ok = false;
      let errMsg = '';

      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          ok = !error;
          if (error) errMsg = error.message || '';
        } else if (access_token && refresh_token) {
          const { error } = await sb.auth.setSession({ access_token, refresh_token });
          ok = !error;
          if (error) errMsg = error.message || '';
        }
      } catch (e: any) {
        ok = false;
        errMsg = e?.message || String(e);
      }

      const next =
        flow === 'reset' || type === 'recovery'
          ? `/auth/new-password?redirect=${encodeURIComponent(redirect)}`
          : redirect;

      if (ok) {
        window.location.replace(next);
      } else {
        const err = new URL('/auth/error', window.location.origin);
        err.searchParams.set('code', 'callback_failed');
        if (type) err.searchParams.set('type', String(type));
        err.searchParams.set('redirect', redirect);
        if (errMsg) err.searchParams.set('message', errMsg);
        window.location.replace(err.toString());
      }
    })();
  }, []);

  return (
    <div style={{ display:'grid', placeContent:'center', minHeight:'70vh', gap:12, textAlign:'center' }}>
      <div style={{ fontSize:18, fontWeight:600 }}>Einen Moment…</div>
      <div>Wir prüfen deinen Bestätigungslink.</div>
    </div>
  );
}
