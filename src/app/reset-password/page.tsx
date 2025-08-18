// src/app/auth/reset-password/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './resetpassword.module.css';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';

/** Der eigentliche Screen – nutzt useSearchParams */
function ResetPasswordInner() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const params = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setLoading(true);
    const supabase = supabaseBrowser();

    const redirectParam = params.get('redirect') ?? '/';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?flow=reset&redirect=${encodeURIComponent(redirectParam)}`,
    });

    setLoading(false);

    if (error) {
      // Generisch halten, um keine Infos zu leaken
      setError('Senden fehlgeschlagen. Bitte prüfe die E-Mail-Adresse oder versuche es später erneut.');
      return;
    }

    setSubmitted(true);
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
            </>
          ) : (
            <p className={styles.success} aria-live="polite">
              Wenn die E-Mail existiert, wurde dir ein Link zum Zurücksetzen gesendet.
            </p>
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
