// src/app/admin/users/[id]/logins/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import styles from '../../users.module.css'

// kleine Helfer
function pickOne(v: unknown, fallback = ''): string {
  if (Array.isArray(v)) return (v[0] ?? fallback) + ''
  if (typeof v === 'string') return v
  return fallback
}

export default async function UserLoginsPage(props: any) {
  // In Next 15 können params/searchParams Promises sein → sicher “entpacken”
  const params = await Promise.resolve(props?.params ?? {})
  const searchParams = await Promise.resolve(props?.searchParams ?? {})

  const userId: string = params.id

  const pageRaw = pickOne(searchParams.page, '1')
  const perPageRaw = pickOne(searchParams.perPage, '50')

  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1)
  const perPage = Math.max(1, Math.min(100, Number.parseInt(perPageRaw, 10) || 50))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // ---- Admin-Check
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect(`/login?redirect=/admin/users/${encodeURIComponent(userId)}/logins`)

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const myEmail = (user.email ?? '').toLowerCase()
  if (!adminEmails.includes(myEmail)) redirect('/')

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') redirect('/')

  // ---- Daten holen
  const admin = supabaseAdmin()
  const { data: rows, count, error } = await admin
    .from('user_login_events')
    .select('occurred_at, ip_hash, user_agent', { count: 'exact' })
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .range(from, to)

  if (error) {
    return (
      <main className={styles.wrapper}>
        <div className={styles.head}>
          <h1 className={styles.title}>Loginverlauf</h1>
          <a href="/admin/users" className={styles.btn}>← Zurück</a>
        </div>
        <p style={{ color: '#b91c1c' }}>Fehler: {error.message}</p>
      </main>
    )
  }

  const total = count ?? (rows?.length || 0)
  const pages = Math.max(1, Math.ceil(total / perPage))
  const qp = (p: number) => `/admin/users/${userId}/logins?page=${p}&perPage=${perPage}`

  return (
    <main className={styles.wrapper}>
      <div className={styles.head}>
        <h1 className={styles.title}>
          Loginverlauf <span className={styles.count}>({total})</span>
        </h1>
        <a href="/admin/users" className={styles.btn}>← Zurück zur Nutzerliste</a>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Zeitpunkt</th>
                <th className={styles.th}>IP-Hash (präfixiert)</th>
                <th className={styles.th}>User-Agent</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <tr key={i} className={styles.tr}>
                  <td className={styles.td}>
                    {r.occurred_at ? new Date(r.occurred_at as string).toLocaleString() : '—'}
                  </td>
                  <td
                    className={styles.td}
                    style={{
                      // sichere Quotes → kein TSX-Parser-Fehler
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    }}
                  >
                    {r.ip_hash ? `${(r.ip_hash as string).slice(0, 16)}…` : '—'}
                  </td>
                  <td className={styles.td}>{(r.user_agent as string) || '—'}</td>
                </tr>
              ))}
              {(!rows || rows.length === 0) && (
                <tr>
                  <td className={styles.td} colSpan={3} style={{ color: '#6b7280' }}>
                    Keine Logins gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.pagination}>
        <a className={styles.pageBtn} href={qp(page - 1)} aria-disabled={page <= 1}>← Zurück</a>
        <span className={styles.count}>Seite {page} / {pages}</span>
        <a className={styles.pageBtn} href={qp(page + 1)} aria-disabled={page >= pages}>Weiter →</a>
      </div>
    </main>
  )
}
