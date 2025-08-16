'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './resetpassword.module.css';
import Image from 'next/image';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useSearchParams } from 'next/navigation';

const ResetPassword = () => {
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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        `${location.origin}/auth/callback?flow=reset&redirect=` +
        encodeURIComponent(params.get('redirect') ?? '/'),
    });

    setLoading(false);

    if (error) {
      // Generische Fehlermeldung, um keine Infos zu leaken
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
};

export default ResetPassword;
