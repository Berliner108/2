// src/app/reset-password/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './resetpassword.module.css';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';

const OTP_TTL_MIN = 30;          // Link 30 Minuten gültig
const RESEND_COOLDOWN_SEC = 60;  // Cooldown für „Erneut senden“

/** Der eigentliche Screen – nutzt useSearchParams */
function ResetPasswordInner() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Neu: Resend + Cooldown
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown(c => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const params = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const value = email.trim().toLowerCase();
    if (!value || !value.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setLoading(true);
    const supabase = supabaseBrowser();

    const redirectParam = params.get('redirect') ?? '/';
    const origin = window.location.origin;

    const { error } = await supabase.auth.resetPasswordForEmail(value, {
      // Callback leitet danach zu /auth/new-password weiter
      redirectTo: `${origin}/auth/callback?flow=reset&redirect=${encodeURIComponent(redirectParam)}`,
    });

    setLoading(false);

    if (error) {
      setError('Senden fehlgeschlagen. Bitte prüfe die E-Mail-Adresse oder versuche es später erneut.');
      return;
    }

    setSubmitted(true);
    setCooldown(RESEND_COOLDOWN_SEC); // ⬅︎ Cooldown starten
  };

  // ✅ Neu: Erneut senden (ohne neue API-Route; einfacher Client-Call)
  const handleResend = async () => {
  if (resending || cooldown > 0 || !email) return;
  setResending(true);
  setError('');
  try {
    const redirectParam = params.get('redirect') ?? '/';
    const res = await fetch('/api/auth/resend-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        redirect: redirectParam,
      }),
    });

    if (res.status === 429) {
      setError('Zu viele Anfragen. Bitte kurz warten und erneut versuchen.');
      return;
    }
    if (!res.ok) {
      setError('Erneutes Senden fehlgeschlagen. Bitte später erneut versuchen.');
      return;
    }

    setSubmitted(true);
    setCooldown(60); // dein Cooldown
  } finally {
    setResending(false);
  }
};


  return (
    <div className={styles.resetPasswordContainer}>
      <div className={styles.leftContainer}>
        <Image
          src="/images/solution.webp"
          alt="Passwort vergessen"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
      </div>

      <div className={styles.rightContainer}>
        <form className={styles.resetForm} onSubmit={handleSubmit}>
          <h1>Passwort zurücksetzen</h1>
          <h2>Gib deine E-Mail-Adresse ein</h2>

          {!submitted ? (
            <>
              <div className={styles.inputContainer}>
                <label htmlFor="email">E-Mail</label>
                <input
                  type="email"
                  id="email"
                  placeholder="E-Mail-Adresse eingeben"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                {error && (
                  <p className={styles.error} aria-live="polite">
                    {error}
                  </p>
                )}
              </div>

              <button type="submit" disabled={loading || !email}>
                {loading ? <div className={styles.spinner}></div> : 'Passwort zurücksetzen'}
              </button>

              <p className={styles.hint} aria-live="polite" style={{ marginTop: 8 }}>
                Der Link ist {OTP_TTL_MIN} Minuten gültig.
              </p>
            </>
          ) : (
            <>
              <p className={styles.success} aria-live="polite">
                Wenn die E-Mail existiert, wurde dir ein Link zum Zurücksetzen gesendet. Er ist {OTP_TTL_MIN} Minuten gültig.
              </p>

              {/* ✅ Neu: Resend-Button mit Cooldown */}
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0 || !email}
                  className={styles.linkButton}
                  style={{ opacity: resending || cooldown > 0 ? 0.6 : 1 }}
                >
                  {resending ? 'Sende…' : cooldown > 0 ? `E-Mail erneut senden (${cooldown}s)` : 'E-Mail erneut senden'}
                </button>
              </div>
            </>
          )}

          <div className={styles.backToLogin}>
            <Link href="/login">Zurück zum Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Page-Export: packt die Inner-Komponente in Suspense */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
