// src/app/login/ChangedPasswordNotice.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css'; // anpassen, falls anderer Pfad

export default function ChangedPasswordNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.get('changed') === '1') {
      setShow(true);
      // URL aufräumen, damit beim Reload die Meldung nicht erneut erscheint
      const url = new URL(window.location.href);
      url.searchParams.delete('changed');
      router.replace(url.pathname + (url.search ? `?${url.searchParams.toString()}` : ''), { scroll: false });
      // Fokus für Screenreader setzen
      setTimeout(() => boxRef.current?.focus(), 0);
    }
  }, [params, router]);

  if (!show) return null;

  return (
    <div
      ref={boxRef}
      className={styles.alertSuccess}
      role="status"
      aria-live="polite"
      tabIndex={-1}
    >
      <span>✅ Passwort geändert. Bitte mit dem neuen Passwort einloggen.</span>
      <button
        type="button"
        className={styles.alertClose}
        onClick={() => setShow(false)}
        aria-label="Meldung schließen"
      >
        ×
      </button>
    </div>
  );
}
