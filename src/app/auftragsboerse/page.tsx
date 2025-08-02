import React, { Suspense } from 'react';
import AuftragsboerseSeite from './AuftragsboerseSeite';

export default function Page() {
  return (
    <React.Suspense fallback={<div>Lade…</div>}>
      <AuftragsboerseSeite />
    </React.Suspense>
  );
}
