import React, { Suspense } from 'react';
import Verkaufsseite from './VerkaufenClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Lade Verkaufsseite...</div>}>
      <Verkaufsseite />
    </Suspense>
  );
}
