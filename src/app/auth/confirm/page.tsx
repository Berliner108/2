'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function safeInternal(path?: string | null) {
  if (!path) return '/';
  try {
    const u = new URL(path, window.location.origin);
    return u.origin === window.location.origin ? (u.pathname + u.search + u.hash || '/') : '/';
  } catch {
    return path?.startsWith('/') ? path : '/';
  }
}
const parseHash = (h: string) =>
  Object.fromEntries(h.replace(/^#/, '').split('&').map(p => {
    const [k, v=''] = p.split('=');
    return [decodeURIComponent(k), decodeURIComponent(v)];
  }));

export default function ConfirmPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const redirect = safeInternal(sp.get('redirect'));
      const flow = sp.get('flow') || '';
      const typeParam = sp.get('type') || '';

      // 0) Schon Session? -> direkt weiter
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace(
            flow === 'reset' || typeParam === 'recovery'
              ? `/auth/new-password?redirect=${encodeURIComponent(redirect)}`
              : redirect
          );
          return;
        }
      } catch {}

      let ok = false;

      // 1) Hash-Tokens (#access_token / #refresh_token / #code)
      if (window.location.hash) {
        const h = parseHash(window.location.hash);
        if (!ok && h.access_token && h.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: h.access_token,
            refresh_token: h.refresh_token,
          });
          if (!error && data.session) ok = true;
          try { history.replaceState({}, '', location.pathname + location.search); } catch {}
        }
        if (!ok && h.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(h.code);
          if (!error) ok = true;
        }
      }

      // 2) PKCE (?code=...)
      if (!ok) {
        const code = sp.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) ok = true;
        }
      }

      // 3) OTP (?token_hash=...&type=...)
      if (!ok) {
        const token_hash = sp.get('token_hash') || sp.get('token');
        const otpType =
          (typeParam as 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite') ||
          (flow === 'reset' ? 'recovery' : 'signup');
        if (token_hash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type: otpType });
          if (!error) ok = true;
        }
      }

      if (ok) {
        router.replace(
          flow === 'reset' || typeParam === 'recovery'
            ? `/auth/new-password?redirect=${encodeURIComponent(redirect)}`
            : redirect
        );
      } else {
        router.replace(`/auth/error?code=confirm_failed&redirect=${encodeURIComponent(redirect)}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
