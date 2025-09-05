'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './newpassword.module.css';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [caps, setCaps] = useState(false);

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

  // Live-Checks & Stärke
  const checks = useMemo(() => {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const long8 = pw.length >= 8;
    const long12 = pw.length >= 12;

    const baseScore = [hasLower, hasUpper, hasSpecial].filter(Boolean).length;
    const lenScore = long12 ? 2 : long8 ? 1 : 0;
    const score = baseScore + lenScore; // 0–5

    const label =
      score >= 5 ? 'Sehr stark' :
      score >= 4 ? 'Stark' :
      score >= 3 ? 'Okay' :
      score >= 2 ? 'Schwach' : 'Sehr schwach';

    const pct = Math.min(100, Math.max(0, (score / 5) * 100));

    return { hasLower, hasUpper, hasSpecial, long8, long12, score, label, pct };
  }, [pw]);

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
      <form onSubmit={save} className={styles.form} noValidate>
        <div className={styles.header}>
          <div className={styles.iconWrap} aria-hidden="true">
            <Lock className={styles.icon} />
          </div>
          <div>
            <h1 className={styles.title}>Neues Passwort</h1>
            <p className={styles.sub}>Setze dein Passwort sicher und schnell zurück.</p>
          </div>
        </div>

        <label className={styles.label} htmlFor="new-password">Neues Passwort</label>
        <div className={styles.inputWrap}>
          <input
            id="new-password"
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyUp={(e) => setCaps((e as any).getModifierState?.('CapsLock'))}
            minLength={8}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}"
            title="Mind. 8 Zeichen, Groß- und Kleinbuchstaben sowie ein Sonderzeichen."
            required
            autoComplete="new-password"
            className={styles.input}
            placeholder="••••••••"
            aria-describedby="pw-req"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className={styles.toggle}
            aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {caps && <p className={styles.note} role="status"><AlertCircle size={16} /> Feststelltaste ist aktiv.</p>}

        <div className={styles.meter} aria-live="polite">
          <div className={styles.meterBar} style={{ width: `${checks.pct}%` }} />
          <span className={styles.meterLabel}>{checks.label}</span>
        </div>

        <ul id="pw-req" className={styles.requirements}>
          <Req ok={checks.hasLower}>Mind. ein Kleinbuchstabe (a–z)</Req>
          <Req ok={checks.hasUpper}>Mind. ein Großbuchstabe (A–Z)</Req>
          <Req ok={checks.hasSpecial}>Mind. ein Sonderzeichen (!@#$…)</Req>
          <Req ok={checks.long8}>Mindestens 8 Zeichen</Req>
          <Req ok={checks.long12} subtle>Empfehlung: 12+ Zeichen</Req>
        </ul>

        <label className={styles.label} htmlFor="new-password2">Passwort bestätigen</label>
        <input
          id="new-password2"
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

function Req({ ok, children, subtle = false }: { ok: boolean; children: React.ReactNode; subtle?: boolean }) {
  return (
    <li className={`${styles.req} ${ok ? styles.reqOk : ''} ${subtle ? styles.reqSubtle : ''}`}>
      <CheckCircle2 className={styles.reqIcon} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
