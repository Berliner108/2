import React, { Suspense } from 'react';
import Shopseite from './shopseite';

export default function Page() {
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <Shopseite />
    </Suspense>
  );
}
