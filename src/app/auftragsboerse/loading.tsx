'use client';

import { usePathname } from 'next/navigation';
import BoerseLoading from '../components/loading/BoerseLoading';

function shouldHideBoerseLoading(pathname: string | null) {
  if (!pathname) return false;

  return /^\/auftragsboerse\/auftraege\/[^/]+\/?$/.test(pathname);
}

export default function Loading() {
  const pathname = usePathname();

  if (shouldHideBoerseLoading(pathname)) {
    return null;
  }

  return <BoerseLoading />;
}