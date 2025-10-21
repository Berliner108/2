'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import styles from './newpassword.module.css';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const MIN_LEN = 8;
const MAX_LEN = 24;

// 🔎 Übersetzer für Supabase-Auth-Fehler
function translateAuthError(msg?: string): string {
  const m = (msg || '').toLowerCase();

  if (/new password should be different/.test(m)) {
    return 'Das neue Passwort muss sich vom alten unterscheiden.';
  }
  if (/password should be at least|password must be at least|minimum password length/.test(m)) {
    return `Passwort zu kurz. Mindestens ${MIN_LEN} Zeichen.`;
  }
  if (/email link is invalid|expired|token.*invalid|session not found|invalid token/.test(m)) {
    return 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.';
  }
  if (/invalid login credentials|invalid credentials/.test(m)) {
    return 'Anmeldedaten ungültig.';
  }
  if (/rate limit|too many requests|too many attempts/.test(m)) {
    return 'Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.';
  }
  if (/password.*too weak/.test(m)) {
    return 'Passwort zu schwach.';
  }
  if (/network|fetch|timeout/.test(m)) {
    return 'Netzwerkproblem. Bitte später erneut versuchen.';
  }
  // Fallback
  return 'Speichern fehlgeschlagen. Bitte versuche es erneut.';
}

function safeRedirect(input: string | null, origin: string) {
  const fallback = '/login?changed=1';
  if (!input) return fallback;
  try {
    const url = new URL(input, origin);
    if (url.origin !== origin) return fallback;
    const path = url.pathname + url.search + url.hash;
    return path || fallback;
  } catch {
    return input.startsWith('/') ? input : fallback;
  }
}

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setErr('Sitzung abgelaufen. Bitte fordere den Link erneut an.');
      setReady(true);
    });
  }, [supabase]);

  const checks = useMemo(() => {
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);

    const long8  = pw.length >= 8;
    const long12 = pw.length >= 12;
    const long16 = pw.length >= 16;
    const long24 = pw.length >= 24;
    const withinMax = pw.length <= MAX_LEN;

    const baseScore = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    const lenScore = long24 ? 3 : long16 ? 2 : long12 ? 1 : long8 ? 0.5 : 0;
    const score = Math.min(7, baseScore + lenScore);

    const label =
      score >= 6 ? 'Sehr stark' :
      score >= 5 ? 'Stark' :
      score >= 4 ? 'Okay' :
      score >= 3 ? 'Schwach' : 'Sehr schwach';

    const pct = Math.min(100, Math.max(0, (score / 7) * 100));

    return { hasLower, hasUpper, hasDigit, hasSpecial, long8, long12, long16, long24, withinMax, score, label, pct };
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
      setErr(translateAuthError(error.message));
      return;
    }

    setOk('Passwort aktualisiert.');
    await supabase.auth.signOut();
    const next = safeRedirect(params.get('redirect'), window.location.origin);
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
          <Req ok={checks.long8}>Mindestens {MIN_LEN} Zeichen</Req>
          <Req ok={checks.withinMax}>Maximal {MAX_LEN} Zeichen</Req>
          <Req ok={checks.long12} subtle>Empfehlung: 12+ Zeichen (Passphrase)</Req>
          <Req ok>Alle Zeichen erlaubt (inkl. Leerzeichen/Unicode)</Req>
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
