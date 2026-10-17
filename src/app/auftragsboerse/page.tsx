// src/app/auftragsboerse/page.tsx
import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import AuftragsboerseSeite from './AuftragsboerseSeite'
import BoerseLoading from '../components/loading/BoerseLoading'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Auftragsbörse für Beschichtungsaufträge',
  description:
    'Finden Sie aktuelle Beschichtungsaufträge oder vergeben Sie Aufträge für Pulverbeschichtung, Nasslackierung, Eloxieren, Verzinken und weitere Oberflächenverfahren.',
  alternates: {
    canonical: 'https://www.beschichterscout.com/auftragsboerse',
  },
  openGraph: {
    title: 'Auftragsbörse für Beschichtungsaufträge | BeschichterScout',
    description:
      'Aktuelle Beschichtungsaufträge finden oder eigene Aufträge einstellen. Für Beschichter, Auftraggeber und Unternehmen aus der Oberflächentechnik.',
    url: 'https://www.beschichterscout.com/auftragsboerse',
    siteName: 'BeschichterScout',
    locale: 'de_AT',
    type: 'website',
  },
}

export default function Page() {
  return (
    <Suspense fallback={<BoerseLoading />}>
      <AuftragsboerseSeite />
    </Suspense>
  )
}
