import React, { Suspense } from 'react';
import Verkaufsseite from './VerkaufenClient';

export default function Page() {
  return (
    <Suspense
      
    >
      <Verkaufsseite />
    </Suspense>
  );
}
