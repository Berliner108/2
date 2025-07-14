import React, { Suspense } from 'react';
import EmailConfirmationPage from './EmailConfirmationPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Lade Bestätigung...</div>}>
      <EmailConfirmationPage />
    </Suspense>
  );
}
