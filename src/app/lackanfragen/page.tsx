import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import KaufenSeite from './KaufenSeite'

export const metadata: Metadata = {
  title: 'Lackbörse & Lackanfragen',
  description:
    'Finden Sie Lackanfragen, Pulverlacke, Nasslacke und Restposten oder stellen Sie eigene Lackanfragen ein. Die Lackbörse für Beschichter, Händler und Auftraggeber.',
  alternates: {
    canonical: 'https://www.beschichterscout.com/lackanfragen',
  },
  openGraph: {
    title: 'Lackbörse & Lackanfragen | BeschichterScout',
    description:
      'Lackanfragen finden, Lacke anbieten und Restposten handeln. Die Lackbörse für Pulverlack, Nasslack und Beschichterbedarf.',
    url: 'https://www.beschichterscout.com/lackanfragen',
    siteName: 'BeschichterScout',
    locale: 'de_AT',
    type: 'website',
  },
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <KaufenSeite />
    </Suspense>
  )
}