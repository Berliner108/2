'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './newpassword.module.css';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const MIN_LEN = 12;
const MAX_LEN = 256;

export default function NewPasswordPage() {
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
  const [ready, setReady] = useState(false);
  const [caps, setCaps] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const supabase = supabaseBrowser();

  const isAcceptable = (s: string) => s.length >= MIN_LEN && s.length <= MAX_LEN;

  // Nur mit aktiver Recovery-Session erlauben
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setErr('Sitzung abgelaufen. Bitte fordere den Link erneut an.');
      setReady(true);
    });
  }, [supabase]);

  // Live-Checks & Stärke (ohne Zwangsmuster)
  const checks = useMemo(() => {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const long12 = pw.length >= 12;
    const long16 = pw.length >= 16;
    const long24 = pw.length >= 24;

    const baseScore = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length; // 0–4
    const lenScore = long24 ? 3 : long16 ? 2 : long12 ? 1 : 0; // 0–3
    const score = Math.min(7, baseScore + lenScore); // 0–7

    const label =
      score >= 6 ? 'Sehr stark' :
      score >= 5 ? 'Stark' :
      score >= 4 ? 'Okay' :
      score >= 3 ? 'Schwach' : 'Sehr schwach';

    const pct = Math.min(100, Math.max(0, (score / 7) * 100));

    return { hasLower, hasUpper, hasDigit, hasSpecial, long12, long16, long24, score, label, pct };
  }, [pw]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!isAcceptable(pw)) {
      setErr(`Passwort muss zwischen ${MIN_LEN} und ${MAX_LEN} Zeichen lang sein.`);
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
            minLength={MIN_LEN}
            maxLength={MAX_LEN}
            required
            autoComplete="new-password"
            className={styles.input}
            placeholder="••••••••"
            aria-describedby="pw-req"
            aria-invalid={!!err}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className={styles.toggle}
            aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
            aria-pressed={show}
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
          <Req ok={checks.long12}>Mindestens {MIN_LEN} Zeichen</Req>
          <Req ok={checks.long16} subtle>Empfehlung: 16+ Zeichen (Passphrase)</Req>
          <Req ok={checks.hasLower}>Optional: Kleinbuchstaben (a–z)</Req>
          <Req ok={checks.hasUpper}>Optional: Großbuchstaben (A–Z)</Req>
          <Req ok={checks.hasDigit}>Optional: Zahl (0–9)</Req>
          <Req ok={checks.hasSpecial}>Optional: Sonderzeichen (!@#$…)</Req>
        </ul>

        <label className={styles.label} htmlFor="new-password2">Passwort bestätigen</label>
        <div className={styles.inputWrap}>
          <input
            id="new-password2"
            type={show ? 'text' : 'password'}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            minLength={MIN_LEN}
            maxLength={MAX_LEN}
            required
            autoComplete="new-password"
            className={styles.input}
            placeholder="••••••••"
            onKeyUp={(e) => setCaps((e as any).getModifierState?.('CapsLock'))}
          />
          </div>

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
          disabled={loading || !isAcceptable(pw) || pw !== pw2}
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
