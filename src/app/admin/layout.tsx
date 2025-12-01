// /src/app/admin/layout.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()

  // 1) Nicht eingeloggt -> Login
  if (!user) {
    redirect('/login?redirect=/admin')
  }

  // 2) Whitelist per ENV
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  const myEmail = (user.email ?? '').toLowerCase()
  if (!adminEmails.includes(myEmail)) {
    redirect('/')
  }

  // 3) Rolle im Profil prüfen
  const { data: me } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'admin') {
    redirect('/')
  }

  // 4) Layout + Navigation
  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <nav
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <a
            href="/"
            style={{ fontWeight: 600, textDecoration: 'none', color: '#111827' }}
          >
            ← Zur Seite
          </a>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <a
              href="/admin"
              className="admin-nav-link"
              style={{ padding: '6px 10px', borderRadius: 10, textDecoration: 'none', color: '#111827' }}
            >
              Dashboard
            </a>
            <a
              href="/admin/users"
              className="admin-nav-link"
              style={{ padding: '6px 10px', borderRadius: 10, textDecoration: 'none', color: '#111827' }}
            >
              Nutzer
            </a>
            <a
              href="/admin/loeschanfragen"
              className="admin-nav-link"
              style={{ padding: '6px 10px', borderRadius: 10, textDecoration: 'none', color: '#111827' }}
            >
              Löschanfragen
            </a>
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</main>
    </div>
  )
}
