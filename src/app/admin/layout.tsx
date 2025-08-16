// app/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <nav style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={{ fontWeight: 600, textDecoration: 'none', color: '#111827' }}>← Zur Seite</a>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <a href="/admin" className="admin-nav-link" style={{ padding: '6px 10px', borderRadius: 10, textDecoration: 'none', color: '#111827' }}>Dashboard</a>
            <a href="/admin/users" className="admin-nav-link" style={{ padding: '6px 10px', borderRadius: 10, textDecoration: 'none', color: '#111827' }}>Nutzer</a>
          </div>
        </nav>
      </header>
      <main style={{ maxWidth: 1200, margin: '0 auto' }}>{children}</main>
    </div>
  )
}
