'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'
import PageviewPing from './components/PageviewPing'

export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideFooter = pathname === '/login'

  return (
    <>
      <Header />

      {/* Tracker schickt Pageviews an /api/track */}
      <PageviewPing />

      <main>{children}</main>

      {!hideFooter && <Footer />}
    </>
  )
}