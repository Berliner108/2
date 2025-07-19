'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './login.module.css';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

    setTimeout(() => {
      setLoading(false);
      if ((email === 'test' || email === 'test@example.com') && password === '1234') {
        const user = {
          name: 'Martin Zajac', // Simulierter vollständiger Name
          email: email,
        };

        if (rememberMe) {
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          sessionStorage.setItem('user', JSON.stringify(user));
        }

        window.location.href = '/';

      } else {
        setError('Benutzername oder Passwort ist falsch.');
      }
    }, 1000); // simulierte Serververzögerung
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.leftContainer}>
        <Image
          src="/images/signup.webp"
          alt="Login Bild"
          layout="fill"
          objectFit="cover"
          objectPosition="top center"
          priority
        />
      </div>

      <div className={styles.rightContainer}>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <h1>Willkommen zurück!</h1>
          <h2>Login</h2>

          {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

          <div className={styles.inputContainer}>
            <label htmlFor="email">E-Mail oder Benutzername</label>
            <input
              type="text"
              id="email"
              placeholder="z. B. max@beispiel.de oder max"
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
