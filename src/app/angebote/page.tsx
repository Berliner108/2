import { Suspense } from 'react';
import Grundgerüst from './Grundgerüst';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Grundgerüst />
    </Suspense>
  );
}
