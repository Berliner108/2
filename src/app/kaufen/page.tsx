import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import Shopseite from './shopseite'

export const metadata: Metadata = {
  title: 'Beschichter-Shop für Lacke, Arbeitsmittel & Restposten',
  description:
    'Im Beschichter-Shop finden und verkaufen Beschichter Lacke, Pulverlacke, Nasslacke, Arbeitsmittel, Restposten und Zubehör für die Oberflächentechnik.',
  alternates: {
    canonical: 'https://www.beschichterscout.com/kaufen',
  },
  openGraph: {
    title: 'Beschichter-Shop für Lacke, Arbeitsmittel & Restposten | BeschichterScout',
    description:
      'Lacke, Arbeitsmittel, Zubehör und Restposten kaufen oder anbieten. Der Shop für Beschichter, Händler und Unternehmen aus der Oberflächentechnik.',
    url: 'https://www.beschichterscout.com/kaufen',
    siteName: 'BeschichterScout',
    locale: 'de_AT',
    type: 'website',
  },
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Shopseite />
    </Suspense>
  )
}