// src/app/auth/confirm/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function safeInternal(path?: string | null) {
  if (!path) return '/';
  try {
    const u = new URL(path, window.location.origin);
    return u.origin === window.location.origin
      ? (u.pathname + u.search + u.hash || '/')
      : '/';
  } catch {
    return path?.startsWith('/') ? path : '/';
  }
}

function parseHash(hash: string): Record<string, string> {
  const out: Record<string, string> = {};
  hash.replace(/^#/, '').split('&').forEach(kv => {
    const [k, v] = kv.split('=');
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return out;
}

export default function ConfirmPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const redirect = safeInternal(sp.get('redirect'));
      const flow = sp.get('flow') || '';
      const type = sp.get('type') || ''; // Supabase hängt manchmal ?type=recovery an
      let ok = false;

      try {
        // 1) PKCE: ?code=...
        const code = sp.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) ok = true;
        }

        // 2) Hash-Token: #access_token=...&refresh_token=...
        if (!ok && typeof window !== 'undefined' && window.location.hash) {
          const h = parseHash(window.location.hash);
          if (h.access_token && h.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token: h.access_token,
              refresh_token: h.refresh_token,
            });
            if (!error && data.session) ok = true;
          }
          // Hash aus der URL entfernen
          try { window.history.replaceState({}, '', window.location.pathname + window.location.search); } catch {}
        }

        if (ok) {
          const goNewPw = flow === 'reset' || type === 'recovery';
          router.replace(goNewPw
            ? `/auth/new-password?redirect=${encodeURIComponent(redirect)}`
            : redirect
          );
          return;
        }
      } catch {
        /* fallthrough -> Fehlerredirect */
      }

      router.replace(`/auth/error?code=confirm_failed&redirect=${encodeURIComponent(redirect)}`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional: Loader anzeigen
  return null;
}
