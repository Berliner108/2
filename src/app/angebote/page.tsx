import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Grundgerüst from './Grundgerüst';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      }
    >
      <Grundgerüst />
    </Suspense>
  );
}
