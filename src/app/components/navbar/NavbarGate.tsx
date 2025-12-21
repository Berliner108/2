'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

const HIDE_ON = ['/login', '/registrieren', '/passwort-vergessen']

export default function NavbarGate() {
  const pathname = usePathname()
  const hide = HIDE_ON.some((p) => pathname.startsWith(p))

  // NICHT return null -> sonst unmount und springt wieder
  return (
    <div style={{ display: hide ? 'none' : 'block' }} aria-hidden={hide}>
      <Navbar />
    </div>
  )
}
