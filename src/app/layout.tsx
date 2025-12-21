import '../styles/layout.css'
import React, { Suspense } from 'react'
import { Oswald } from 'next/font/google'

import Header from './Header'
import Footer from './Footer'
import NavbarGate from '@/components/navbar/NavbarGate'

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata = { title: 'Beschichter Scout' }

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
          <NavbarGate />
          <main>{children}</main>
          <Footer />
        </Suspense>

        {/* Tracking bleibt wie bei dir */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try{
                var payload = {
                  path: location.pathname + location.search,
                  referrer: document.referrer || null,
                  secret: ${JSON.stringify(process.env.NEXT_PUBLIC_TRACK_SECRET || '')}
                };
                var blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
                if (navigator.sendBeacon) {
                  navigator.sendBeacon('/api/track', blob);
                } else {
                  fetch('/api/track', {
                    method:'POST',
                    headers:{'content-type':'application/json'},
                    body: JSON.stringify(payload),
                    keepalive:true
                  });
                }
              }catch(e){}
            })();`,
          }}
        />
      </body>
    </html>
  )
}
