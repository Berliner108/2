// src/app/sonderlacke/page.tsx
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ArtikelEinstellen from './ArtikelEinstellen';

export default function Seite() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      }
    >
      <ArtikelEinstellen />
    </Suspense>
  );
}
