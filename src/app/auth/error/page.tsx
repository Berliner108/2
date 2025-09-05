'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './error.module.css';

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

export default function AuthErrorPage() {
  const sp = useSearchParams();
  const code = sp.get('code') || 'unknown';
  const type = sp.get('type') || '';
  const redirect = safeInternal(sp.get('redirect'));

  let title = 'Anmeldung nicht möglich';
  let hint  = 'Der Bestätigungslink ist ungültig oder abgelaufen.';

  switch (type) {
    case 'signup':
      hint = 'Dein Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an oder logge dich erneut ein.'; break;
    case 'recovery':
      hint = 'Dein Passwort-Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'; break;
    case 'email_change':
      hint = 'Der E-Mail-Änderungslink ist ungültig oder abgelaufen.'; break;
    case 'magiclink':
    case 'invite':
      hint = 'Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'; break;
    default: break;
  }

  return (
  <div className={styles.wrapper}>
    <main className={styles.page}>
      <div className={styles.card} role="alert" aria-live="polite">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{hint}</p>

        <div className={styles.actions}>
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className={styles.btnPrimary}>
            Erneut einloggen
          </Link>
          {type === 'recovery' && (
            <Link href={`/reset-password?redirect=${encodeURIComponent(redirect)}`} className={styles.btnGhost}>
              Neuen Reset-Link anfordern
            </Link>
          )}
          <Link href="/" className={styles.btnGhost}>Zur Startseite</Link>
        </div>

        <div className={styles.meta}>
          Fehlercode:&nbsp;<code className={styles.code}>{code}{type ? `:${type}` : ''}</code>
        </div>
      </div>
    </main>
  </div>
);

}
