'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export function NoticeToast() {
  const sp = useSearchParams()
  const router = useRouter()
  const [msg, setMsg] = useState<string | null>(null)
  const [type, setType] = useState<'success'|'error'|'info'>('info')

  useEffect(() => {
    const error = sp.get('error')
    const notice = sp.get('notice')
    if (error) {
      setMsg(error)
      setType('error')
    } else if (notice === 'deleted') {
      setMsg('Nutzer wurde gelöscht.')
      setType('success')
    } else if (notice === 'role') {
      const r = sp.get('r') ?? ''
      setMsg(r === 'admin' ? 'Rolle auf admin gesetzt.' : 'Rolle auf user gesetzt.')
      setType('success')
    } else {
      setMsg(null)
    }
  }, [sp])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => {
      setMsg(null)
      // Query-Params wegräumen
      const url = new URL(window.location.href)
      url.searchParams.delete('notice')
      url.searchParams.delete('r')
      url.searchParams.delete('error')
      router.replace(url.pathname + (url.search ? '?' + url.searchParams.toString() : ''), { scroll: false })
    }, 3200)
    return () => clearTimeout(t)
  }, [msg, router])

  const palette = useMemo(() => {
    if (type === 'success') return { bg: '#10b981', border: '#059669', color: '#fff' }
    if (type === 'error')   return { bg: '#ef4444', border: '#dc2626', color: '#fff' }
    return { bg: '#3b82f6', border: '#2563eb', color: '#fff' }
  }, [type])

  if (!msg) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', right: 16, bottom: 16, zIndex: 1000,
        maxWidth: 420, padding: '12px 14px', borderRadius: 12,
        background: palette.bg, color: palette.color, border: `1px solid ${palette.border}`,
        boxShadow: '0 10px 25px rgba(0,0,0,.15)', display: 'flex', alignItems: 'center', gap: 10
      }}
    >
      <span style={{ lineHeight: 1.35 }}>{msg}</span>
      <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: 'inherit', fontSize: 18, cursor: 'pointer', opacity: .9 }}>×</button>
    </div>
  )
}

export function DeleteUserButton({
  userId,
  action,
  className,
}: {
  userId: string
  action: (formData: FormData) => Promise<void>
  className?: string
}) {
  return (
    <form
      action={async (fd) => {
        const ok = confirm('Diesen Nutzer wirklich löschen?')
        if (!ok) return
        fd.set('userId', userId)
        await action(fd)
      }}
    >
      <button type="submit" className={className}>Löschen</button>
    </form>
  )
}
export function UserDetailsButton({
  user,
  profile,
  className,
}: {
  user: any
  profile?: any
  className?: string
}) {
  'use client'
  const [open, setOpen] = useState(false)

  const m = (user?.user_metadata ?? {}) as any
  const addr = (m?.address ?? {}) as any
  const prof = profile ?? {}
  const accountType = (m?.accountType || '').toString().toUpperCase()
  const accountLabel =
    accountType === 'PRIVATE' ? 'Privat'
    : accountType === 'COMPANY' ? 'Gewerblich'
    : (m?.accountType || '—')

  const fullName = [m?.firstName, m?.lastName].filter(Boolean).join(' ') || '—'
  const username = (prof?.username || m?.username || '—').toString()
  const mailConfirmed = !!user?.email_confirmed_at
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleString() : '—'
  const lastLogin = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>Details</button>

      {!open ? null : (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000,
            display: 'grid', placeItems: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(860px, 100%)', background: '#fff', borderRadius: 16,
              boxShadow: '0 20px 60px rgba(2,6,23,.25)', border: '1px solid #e5e7eb', overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #eef2f7' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '999px',
                display: 'grid', placeItems: 'center',
                background: 'rgba(79,70,229,.12)', color: '#4338ca',
                border: '1px solid rgba(99,102,241,.35)', fontWeight: 700
              }}>
                {(user?.email ?? user?.id ?? '?').toString().charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <div style={{ fontWeight: 600 }}>{user?.email ?? '—'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{user?.id}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ marginLeft: 'auto', background: 'transparent', border: 0, fontSize: 20, cursor: 'pointer', color: '#111827' }}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Spalte 1 */}
              <div style={{ display: 'grid', gap: 10 }}>
                <Section title="Kontakt">
                  <Row k="E-Mail" v={user?.email ?? '—'} />
                  <Row k="Name" v={fullName} />
                  <Row k="Username" v={username} />
                </Section>

                <Section title="Account">
                  <Row k="Typ" v={accountLabel} />
                  <Row k="Unternehmen" v={m?.companyName || '—'} />
                  <Row k="USt-IdNr." v={m?.vatNumber || '—'} />
                </Section>

                <Section title="Status">
                  <Row k="E-Mail bestätigt" v={mailConfirmed ? 'ja' : 'nein'} badge={mailConfirmed ? 'ok' : 'warn'} />
                  <Row k="Erstellt" v={createdAt} />
                  <Row k="Letzter Login" v={lastLogin} />
                </Section>
              </div>

              {/* Spalte 2 */}
              <div style={{ display: 'grid', gap: 10 }}>
                <Section title="Adresse (bei Registrierung)">
                  <Row k="Straße" v={[addr?.street, addr?.houseNumber].filter(Boolean).join(' ') || '—'} />
                  <Row k="PLZ / Stadt" v={[addr?.zip, addr?.city].filter(Boolean).join(' ') || '—'} />
                  <Row k="Land" v={addr?.country || '—'} />
                </Section>

                <Section title="Profil (DB)">
                  <Row k="Rolle" v={profile?.role || 'user'} />
                  <Row k="Adresse (Profil)" v={profile?.address || '—'} />
                </Section>

                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer' }}>Rohdaten (user_metadata)</summary>
                  <pre style={{ background: '#0b1020', color: '#d1e7ff', padding: 12, borderRadius: 8, overflow: 'auto' }}>
                  {JSON.stringify(m, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: '#f9fafb', borderBottom: '1px solid #eef2f7', fontWeight: 600, fontSize: 14 }}>
        {title}
      </div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>{children}</div>
    </div>
  )
}

function Row({ k, v, badge }: { k: string; v: React.ReactNode; badge?: 'ok'|'warn' }) {
  const badgeStyle = badge === 'ok'
    ? { background: '#ecfdf5', color: '#065f46', border: '1px solid rgba(16,185,129,.25)' }
    : { background: '#fffbeb', color: '#92400e', border: '1px solid rgba(251,191,36,.35)' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'center' }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{k}</div>
      <div>
        {badge ? (
          <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, ...badgeStyle }}>{v as string}</span>
        ) : (
          <span>{v}</span>
        )}
      </div>
    </div>
  )
}
export function ExportCsvButton({
  rows,
  className,
}: {
  rows: any[]
  className?: string
}) {
  'use client'
  const onClick = () => {
    if (!rows?.length) return

    const headers = [
      'id','email','username','role','confirmed',
      'created_at','last_sign_in_at',
      'accountType','firstName','lastName',
      'companyName','vatNumber',
      'street','houseNumber','zip','city','country',
    ]

    const esc = (v: any) => {
      const s = (v ?? '').toString()
      // CSV-escape: quotes doppeln, Feld in "
      return `"${s.replace(/"/g, '""')}"`
    }

    const lines = [
      headers.join(','), // Kopfzeile
      ...rows.map(r => headers.map(h => esc(r[h])).join(',')),
    ]
    const csv = lines.join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const ts = new Date()
      .toISOString()
      .replace(/[:T]/g, '')
      .slice(0, 13)
    a.href = url
    a.download = `users_${ts}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      CSV exportieren
    </button>
  )
}
