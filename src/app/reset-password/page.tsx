'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './resetpassword.module.css';
import Image from 'next/image';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    if (!email.includes('@')) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setLoading(true);

    // Simuliere eine Anfrage
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 2000);
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
                />
                {error && <p className={styles.error}>{error}</p>}
              </div>

              <button type="submit" disabled={loading}>
                {loading ? (
                  <div className={styles.spinner}></div>
                ) : (
                  'Passwort zurücksetzen'
                )}
              </button>
            </>
          ) : (
            <p className={styles.success}>
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
