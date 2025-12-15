import { Suspense } from 'react';
import Grundgerüst from './Grundgerüst';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        </div>
      }
    >
      <Grundgerüst />
    </Suspense>
  );
}
