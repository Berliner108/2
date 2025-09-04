// /src/app/auth/confirm/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function safeInternal(path?: string | null) {
  if (!path) return '/';
  try {
    const u = new URL(path, window.location.origin);
    return u.origin === window.location.origin ? (u.pathname + u.search + u.hash || '/') : '/';
  } catch {
    return path && path.startsWith('/') ? path : '/';
  }
}

function parseHashTokens(hash: string) {
  // erwartet "#access_token=...&refresh_token=...&type=recovery"
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token') || undefined;
  const refresh_token = params.get('refresh_token') || undefined;
  const type = params.get('type') || undefined; // z.B. "recovery", "signup"
  return { access_token, refresh_token, type };
}

function ConfirmInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [err, setErr] = useState<string>('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();
      const redirect = safeInternal(sp.get('redirect'));
      const flow = sp.get('flow') || '';         // z.B. "reset"
      const urlType = sp.get('type') || '';      // z.B. "recovery" | "signup" | "magiclink" | "email_change" | "invite"
      const code = sp.get('code');               // PKCE
      const token_hash = sp.get('token_hash') || sp.get('token'); // OTP Fallback

      try {
        // 1) PKCE: ?code=...
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // 2) Hash-Flow: #access_token=...&refresh_token=...
        else if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
          const { access_token, refresh_token } = parseHashTokens(window.location.hash);
          if (!access_token || !refresh_token) throw new Error('missing_tokens');
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }
        // 3) OTP-Fallback: token_hash + type
        else if (token_hash) {
          const otpType =
            (urlType as 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite') ||
            (flow === 'reset' ? 'recovery' : 'signup');
          const { error } = await supabase.auth.verifyOtp({ token_hash, type: otpType });
          if (error) throw error;
        }
        // 4) Wenn nichts davon: prüfen ob Session schon existiert
        else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('no_session');
        }

        // Ziel bestimmen
        const next =
          flow === 'reset' || urlType === 'recovery'
            ? `/auth/new-password?redirect=${encodeURIComponent(redirect)}`
            : redirect;

        router.replace(next);
        router.refresh();
      } catch (e: any) {
        console.error('[auth/confirm] failed:', e);
        setErr('Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.');
      } finally {
        setBusy(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      {busy ? (
        <div style={{ fontSize: 16, color: '#334155' }}>Wird bestätigt …</div>
      ) : err ? (
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>Bestätigung fehlgeschlagen</h1>
          <p style={{ color: '#6b7280' }}>{err}</p>
          <p style={{ marginTop: 16 }}>
            <a href="/auth/reset-password" style={{ color: '#0ea5e9' }}>
              Neuen Reset-Link anfordern
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
