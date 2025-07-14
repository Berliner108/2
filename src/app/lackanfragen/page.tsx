import React, { Suspense } from 'react';
import KaufenSeite from './KaufenSeite';

export default function Page() {
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <KaufenSeite />
    </Suspense>
  );
}
