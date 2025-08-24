'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './newpassword.module.css';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

function safeInternal(path?: string | null) {
  if (!path) return '/';
  try {
    const u = new URL(path, window.location.origin);
    return u.origin === window.location.origin
      ? (u.pathname + u.search + u.hash || '/')
      : '/';
  } catch {
    return path.startsWith('/') ? path : '/';
  }
}

function NewPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const redirect = safeInternal(sp.get('redirect'));
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>('');

  // 1) Sicherstellen, dass eine gültige (Recovery-)Session existiert,
  //    sonst auf Fehlerseite schicken.
  useEffect(() => {
    const run = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace(
            `/auth/error?code=no_session&type=recovery&redirect=${encodeURIComponent(redirect)}`
          );
        }
      } catch {
        router.replace(
          `/auth/error?code=session_check_failed&type=recovery&redirect=${encodeURIComponent(redirect)}`
        );
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr('');

    // 2) Clientseitige Validierung
    if (!PASSWORD_RE.test(pw)) {
      setErr('Passwort zu schwach: mind. 8 Zeichen, Groß-/Kleinbuchstaben & ein Sonderzeichen.');
      return;
    }
    if (pw !== pw2) {
      setErr('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    try {
      const supabase = supabaseBrowser();

      // 3) Passwort setzen (benötigt aktive Session – kommt vom Callback)
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        const m = (error.message || '').toLowerCase();
        // freundliche Standard-Fehler
        if (m.includes('token') || m.includes('session')) {
          setErr('Der Reset-Link ist abgelaufen. Bitte fordere einen neuen Link an.');
        } else if (m.includes('short') || m.includes('weak')) {
          setErr('Das Passwort erfüllt die Anforderungen nicht.');
        } else {
          setErr('Passwort konnte nicht aktualisiert werden. Bitte später erneut versuchen.');
        }
        setLoading(false);
        return;
      }

      // 4) Sicherheit: hart abmelden (Server + Client), damit alte Session nicht weiterlebt
      try {
        await fetch('/auth/signout', { method: 'POST', credentials: 'include', cache: 'no-store' });
      } catch {}
      try {
        await supabase.auth.signOut();
      } catch {}

      // 5) Zur Login-Seite mit Hinweis zurück
      router.replace(`/login?changed=1&redirect=${encodeURIComponent(redirect)}`);
      router.refresh();
    } catch {
      setErr('Unerwarteter Fehler. Bitte später erneut versuchen.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1>Neues Passwort setzen</h1>
        <p className={styles.hint}>
          Bitte vergib ein starkes Passwort (mind. 8 Zeichen, Groß-/Kleinbuchstaben & ein Sonderzeichen).
        </p>

        {err && <p className={styles.error} role="alert" aria-live="polite">{err}</p>}

        <div className={styles.field}>
          <label htmlFor="pw">Neues Passwort</label>
          <input
            id="pw"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="********"
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
            title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
            disabled={loading}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="pw2">Passwort bestätigen</label>
          <input
            id="pw2"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="********"
            disabled={loading}
          />
        </div>

        <button type="submit" className={styles.btn} disabled={loading}>
          {loading ? 'Speichere…' : 'Passwort speichern'}
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NewPasswordInner />
    </Suspense>
  );
}
