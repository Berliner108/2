import { Suspense } from 'react';
import AngebotEinstellen from './AngebotEinstellen';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AngebotEinstellen />
    </Suspense>
  );
}
