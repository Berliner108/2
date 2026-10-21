// src/app/confirm-email/EmailConfirmationPage.tsx
'use client';

import { useEffect, useState } from 'react';

export default function EmailConfirmationPage() {
  const [confirmationUrl, setConfirmationUrl] = useState('');
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('confirmation_url');

      if (!raw) {
        setError('Der Bestätigungslink ist unvollständig oder ungültig.');
        return;
      }

      const url = new URL(raw);

      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co')) {
        setError('Der Bestätigungslink ist ungültig.');
        return;
      }

      setConfirmationUrl(url.toString());
    } catch {
      setError('Der Bestätigungslink ist ungültig.');
    }
  }, []);

  const handleConfirm = () => {
    if (!confirmationUrl || isConfirming) return;
    setIsConfirming(true);
    window.location.assign(confirmationUrl);
  };

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        fontFamily: 'Oswald, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2rem',
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: '0 0 1rem', fontSize: '1.7rem', color: '#111827' }}>
          E-Mail-Adresse bestätigen
        </h1>

        {error ? (
          <p style={{ margin: 0, color: 'crimson', fontSize: '1rem' }}>{error}</p>
        ) : (
          <>
            <p style={{ margin: '0 0 1.5rem', color: '#4b5563', fontSize: '1rem' }}>
              Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen und deinen Account zu aktivieren.
            </p>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!confirmationUrl || isConfirming}
              style={{
                padding: '0.75rem 1.25rem',
                border: 0,
                borderRadius: '6px',
                background: '#111827',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: !confirmationUrl || isConfirming ? 'default' : 'pointer',
                opacity: !confirmationUrl || isConfirming ? 0.65 : 1,
              }}
            >
              {isConfirming ? 'Bestätigung wird geöffnet…' : 'E-Mail-Adresse bestätigen'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
