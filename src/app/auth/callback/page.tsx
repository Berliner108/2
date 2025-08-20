// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState('Bitte warten…');

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser();
      const url = window.location.href; // volle URL
      const redirectTo = params.get('redirect') ?? '/';
      const flow = params.get('flow');
      const typeParam = params.get('type') as
        | 'signup'
        | 'recovery'
        | 'magiclink'
        | 'email_change'
        | 'invite'
        | null;

      const finish = () => {
        if (flow === 'reset' || typeParam === 'recovery') {
          router.replace(`/auth/new-password?redirect=${encodeURIComponent(redirectTo)}`);
        } else {
          router.replace(redirectTo);
        }
        router.refresh();
      };

      try {
        // PKCE-Standardweg
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) throw error;
        setMsg('Erfolg. Weiterleiten…');
        finish();
        return;
      } catch (e: any) {
        // Fallback ohne code_verifier
        try {
          const token_hash = params.get('token_hash') || params.get('token');
          const type = typeParam ?? (flow === 'reset' ? 'recovery' : 'signup');
          if (!token_hash) throw e;

          const { error: vErr } = await supabase.auth.verifyOtp({ token_hash, type });
          if (vErr) throw vErr;

          setMsg('Verifiziert. Weiterleiten…');
          finish();
          return;
        } catch (e2: any) {
          setMsg(`Fehler: ${e2?.message || e?.message || 'Unbekannt'}`);
        }
      }
    })();
  }, [params, router]);

  return <p className="p-6 text-center">{msg}</p>;
}

export default function Page() {
  // Suspense verhindert die useSearchParams-Warnung
  return (
    <Suspense fallback={<p className="p-6 text-center">Bitte warten…</p>}>
      <CallbackClient />
    </Suspense>
  );
}

// (Optional) Falls du das brauchst, DARF nach 'use client' stehen:
export const dynamic = 'force-dynamic';
