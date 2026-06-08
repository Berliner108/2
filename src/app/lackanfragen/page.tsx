import React, { Suspense } from 'react';
import KaufenSeite from './KaufenSeite';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <KaufenSeite />
    </Suspense>
  );
}