// src/app/layout.tsx
import '../styles/layout.css'; // CSS-Datei für Layout importieren
import Header from './Header'; // Header importieren
import React from 'react';
import Footer from './Footer'; // Den Footer importieren
import { Oswald } from 'next/font/google';


const oswald = Oswald({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});


// Definiere metadata ohne "use client"
export const metadata = {
  title: 'Beschichter Scout',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    
    <html lang="de">
      <head>
        {/* Favicon für alle Browser */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* 96x96 Favicon für bestimmte Browser */}
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        
        {/* Apple Touch Icon für iOS-Geräte */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Manifest für Web-App */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* 192x192 und 512x512 Icons für Web-App */}
        <link rel="icon" type="image/png" sizes="192x192" href="/web-app-manifest-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/web-app-manifest-512x512.png" />
      </head>
      <body className={oswald.className}>
        <Header />
        <main>{children}</main>
        <Footer /> {/* Footer hier einfügen */}
      </body>
    </html>
  );
}
