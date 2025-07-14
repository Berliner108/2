'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const EmailConfirmationPage = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Bitte warten...');
  const params = useSearchParams();
  const token = params.get('token');

 useEffect(() => {
  console.log('Token aus URL:', token); // ← Debug-Ausgabe

  if (!token) {
    setMessage('Kein Token gefunden.');
    return;
  }

  const usersJSON = localStorage.getItem('registeredUsers');
  if (!usersJSON) {
    setMessage('Keine Benutzer gefunden.');
    return;
  }

  const users = JSON.parse(usersJSON);
  console.log('Gefundene Nutzer:', users); // ← Debug-Ausgabe

  const userIndex = users.findIndex((user: any) => user.token === token);
  console.log('Benutzerindex:', userIndex); // ← Debug-Ausgabe

  if (userIndex === -1) {
    setMessage('Ungültiger oder abgelaufener Token.');
    return;
  }

  users[userIndex].verified = true;
  localStorage.setItem('registeredUsers', JSON.stringify(users));
  setMessage('E-Mail erfolgreich bestätigt! Du kannst dich jetzt einloggen.');
}, [token]);


  const icon = {
    loading: '⏳',
    success: '✅',
    error: '❌',
  };

  const color = {
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
};

export default EmailConfirmationPage;
