// src/app/layout.tsx
import '../styles/layout.css'
import Header from './Header'
import React, { Suspense } from 'react'
import Footer from './Footer'
import { Oswald } from 'next/font/google'
import PageviewPing from './components/PageviewPing' // Client

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata = {
  title: 'Beschichter Scout',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="icon" type="image/png" sizes="192x192" href="/web-app-manifest-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/web-app-manifest-512x512.png" />
      </head>
      <body className={oswald.className}>
        <Suspense fallback={null}>
          <Header />
          {/* Tracker schickt Pageviews an /api/track */}
          <PageviewPing />
          <main>{children}</main>
          <Footer />
        </Suspense>
      </body>
    </html>
  )
}
