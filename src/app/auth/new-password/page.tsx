// src/app/auth/new-password/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './newpassword.module.css';

export default function NewPasswordPage() {
  // WICHTIG: Hook-Nutzung in ein Suspense-Child auslagern
  return (
    <Suspense fallback={<p className={styles.info}>Lade…</p>}>
      <NewPasswordInner />
    </Suspense>
  );
}

function NewPasswordInner() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false); // Guard

  // Wie bei Registrieren
  const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

  const router = useRouter();
  const params = useSearchParams();
  const supabase = supabaseBrowser();

  // Nur mit aktiver Recovery-Session erlauben
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setErr('Sitzung abgelaufen. Bitte fordere den Link erneut an.');
      setReady(true);
    });
  }, [supabase]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!PASSWORD_RE.test(pw)) {
      setErr('Passwort zu schwach: mind. 8 Zeichen, Groß-/Kleinbuchstaben & ein Sonderzeichen.');
      return;
    }
    if (pw !== pw2) {
      setErr('Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk('Passwort aktualisiert.');
    // Sicherheit: Recovery-Session beenden & zum Login
    await supabase.auth.signOut();
    const to = params.get('redirect') ?? '/login?changed=1';
    const next = to.includes('/login') ? to : '/login?changed=1';
    router.replace(next);
  };

  if (!ready) return <p className={styles.info}>Lade…</p>;

  return (
    <div className={styles.container}>
      <form onSubmit={save} className={styles.form}>
        <h1>Neues Passwort</h1>

        <label className={styles.label}>Neues Passwort</label>
        <div className={styles.inputWrap}>
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
            title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
            required
            autoComplete="new-password"
            className={styles.input}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className={styles.toggle}
            aria-label="Passwort anzeigen/verbergen"
          >
            {show ? 'Verbergen' : 'Anzeigen'}
          </button>
        </div>

        <label className={styles.label}>Passwort bestätigen</label>
        <input
          type={show ? 'text' : 'password'}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          minLength={8}
          pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
          title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
          required
          autoComplete="new-password"
          className={styles.input}
          placeholder="••••••••"
        />

        {err && (
          <p className={styles.error} aria-live="polite">
            {err}
          </p>
        )}
        {ok && (
          <p className={styles.success} aria-live="polite">
            {ok}
          </p>
        )}

        <button
          className={styles.button}
          disabled={loading || !PASSWORD_RE.test(pw) || pw !== pw2}
          type="submit"
        >
          {loading ? 'Speichere…' : 'Speichern'}
        </button>
      </form>
    </div>
  );
}
