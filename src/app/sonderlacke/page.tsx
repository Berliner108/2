// src/app/sonderlacke/page.tsx
import { Suspense } from 'react';
import ArtikelEinstellen from './ArtikelEinstellen';

export default function Seite() {
  return (
    <Suspense fallback={<div>Lade Formular...</div>}>
      <ArtikelEinstellen />
    </Suspense>
  );
}
