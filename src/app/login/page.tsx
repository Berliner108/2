'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './login.module.css';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // aktuell ohne Funktion – wir persistieren immer
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailOrUsername = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

    // Supabase kann nur per E-Mail einloggen. Username-Login bauen wir später über profiles -> email.
    if (!emailOrUsername.includes('@')) {
      setLoading(false);
      setError('Bitte melde dich mit deiner E-Mail an (Username-Login folgt später).');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password,
    });

    setLoading(false);

    if (signInError) {
      // ein paar freundlichere Texte
      const msg = signInError.message.toLowerCase().includes('invalid login')
        ? 'E-Mail oder Passwort ist falsch.'
        : signInError.message;
      setError(msg);
      return;
    }

    // Erfolg → Home
    router.replace('/');
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.leftContainer}>
        <Image
          src="/images/signup.webp"
          alt="Login Bild"
          fill
          style={{ objectFit: 'cover', objectPosition: 'top center' }}
          priority
        />
      </div>

      <div className={styles.rightContainer}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h1>Willkommen zurück!</h1>
          <h2>Login</h2>

          {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

          <div className={styles.inputContainer}>
            <label htmlFor="email">E-Mail</label>
            <input
              type="text"
              id="email"
              placeholder="z. B. max@beispiel.de"
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className={styles.inputContainer}>
            <label htmlFor="password">Passwort</label>
            <div className={styles.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Passwort eingeben"
                required
                autoComplete="current-password"
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Passwort anzeigen/verbergen"
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </span>
            </div>
          </div>

          <div className={styles.rememberMe}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              disabled // wir persistieren ohnehin immer
              title="Sitzung wird dauerhaft gespeichert"
            />
            <label htmlFor="remember">Angemeldet bleiben</label>
          </div>

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? (
              <>
                Einloggen
                <span className={styles.spinner}></span>
              </>
            ) : (
              'Einloggen'
            )}
          </button>

          <div className={styles.forgotPassword}>
            <Link href="/reset-password">Passwort vergessen?</Link>
          </div>

          <div className={styles.registerLink}>
            <span>Noch kein Konto?</span>{' '}
            <Link href="/registrieren">Jetzt registrieren</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
