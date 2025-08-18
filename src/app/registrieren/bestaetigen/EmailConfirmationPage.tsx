// src/app/confirm-email/page.tsx  (oder wo deine Seite liegt)
'use client';

import { useEffect, useState } from 'react';

export default function EmailConfirmationPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Bitte warten…');

  useEffect(() => {
    // Token direkt aus der URL lesen – ohne useSearchParams()
    let token: string | null = null;
    try {
      token = new URLSearchParams(window.location.search).get('token');
      // Debug:
      // console.log('Token aus URL:', token);
    } catch {
      /* ignore */
    }

    if (!token) {
      setStatus('error');
      setMessage('Kein Token gefunden.');
      return;
    }

    const usersJSON = localStorage.getItem('registeredUsers');
    if (!usersJSON) {
      setStatus('error');
      setMessage('Keine Benutzer gefunden.');
      return;
    }

    let users: any[] = [];
    try {
      users = JSON.parse(usersJSON) ?? [];
      // console.log('Gefundene Nutzer:', users);
    } catch {
      setStatus('error');
      setMessage('Gespeicherte Daten sind beschädigt.');
      return;
    }

    const userIndex = users.findIndex((u) => u?.token === token);
    // console.log('Benutzerindex:', userIndex);

    if (userIndex === -1) {
      setStatus('error');
      setMessage('Ungültiger oder abgelaufener Token.');
      return;
    }

    users[userIndex].verified = true;
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    setStatus('success');
    setMessage('E-Mail erfolgreich bestätigt! Du kannst dich jetzt einloggen.');
  }, []);

  const icon: Record<typeof status, string> = {
    loading: '⏳',
    success: '✅',
    error: '❌',
  };

  const color: Record<typeof status, string> = {
    loading: '#888',
    success: 'green',
    error: 'crimson',
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
      <div style={{ fontSize: '4rem', color: color[status], marginBottom: '1rem' }}>
        {icon[status]}
      </div>
      <h1 style={{ color: color[status], fontSize: '1.5rem' }}>{message}</h1>
    </div>
  );
}
