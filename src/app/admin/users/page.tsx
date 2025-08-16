export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { redirect } from 'next/navigation'
import styles from './users.module.css'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NoticeToast, DeleteUserButton, UserDetailsButton, ExportCsvButton } from './ClientWidgets'
import { updateRole, toggleBan, deleteUser } from './actions'

type Search = { page?: string; q?: string; role?: string; confirmed?: string }
type HashRow = { user_id: string; ip_hash: string; created_at: string }

export default async function AdminUsersPage({ searchParams }: { searchParams?: Search }) {
  const sp = searchParams ?? {}
  const page = Math.max(1, parseInt(sp.page || '1', 10))
  const perPage = 25
  const q = (sp.q || '').trim().toLowerCase()

  const roleFilter = (sp.role || '').toLowerCase()
  const confFilter = (sp.confirmed || '').toLowerCase()

  // 1) Session + Whitelist
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/users')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  const myEmail = (user.email ?? '').toLowerCase()
  if (!adminEmails.includes(myEmail)) redirect('/')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') redirect('/')

  // 3) Nutzerliste
  const admin = supabaseAdmin()
  const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage })
  if (error) {
    return (
      <main className={styles.wrapper}>
        <div className={styles.head}>
          <h1 className={styles.title}>Admin · Nutzer</h1>
        </div>
        <p style={{ color: '#b91c1c' }}>Fehler beim Laden: {error.message}</p>
      </main>
    )
  }

  const users = list.users || []
  const total = list.total || 0
  const pages = Math.max(1, Math.ceil(total / perPage))

  // 4) Profile (username/role/address)
  const ids = users.map(u => u.id)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, role, address')
    .in('id', ids)

  const pmap = new Map((profiles || []).map(p => [p.id, p as any]))

  // 5) Letzter IP-Hash je User (neu)
  const { data: ipRows } = ids.length
    ? await admin
        .from('user_ip_hashes')
        .select('user_id, ip_hash, created_at')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
    : { data: [] as HashRow[] }

  const ipByUser = new Map<string, HashRow>()
  for (const r of (ipRows || []) as HashRow[]) {
    if (!ipByUser.has(r.user_id)) ipByUser.set(r.user_id, r)
  }

  // 6) Suche + Filter
  const filtered = users.filter(u => {
    if (q) {
      const p = pmap.get(u.id)
      const email = (u.email || '').toLowerCase()
      const uname = (p?.username || '').toLowerCase()
      if (!email.includes(q) && !uname.includes(q)) return false
    }
    if (roleFilter) {
      const role = (pmap.get(u.id)?.role || 'user').toLowerCase()
      if (role !== roleFilter) return false
    }
    if (confFilter === 'yes' && !u.email_confirmed_at) return false
    if (confFilter === 'no'  &&  u.email_confirmed_at) return false
    return true
  })

  const qp = (p: number) =>
    `/admin/users?page=${p}`
    + (q ? `&q=${encodeURIComponent(q)}` : '')
    + (roleFilter ? `&role=${encodeURIComponent(roleFilter)}` : '')
    + (confFilter ? `&confirmed=${encodeURIComponent(confFilter)}` : '')

  return (
    <main className={styles.wrapper}>
      <div className={styles.head}>
        <h1 className={styles.title}>Admin · Nutzer <span className={styles.count}>({total})</span></h1>
        <a href="/admin" className={styles.btn}>← Zurück zum Dashboard</a>
      </div>

      {/* Toolbar */}
      <form className={styles.toolbar} method="GET">
        <input name="q" placeholder="Suche nach E-Mail oder Username" defaultValue={q} className={styles.input} />
        <select name="role" defaultValue={roleFilter} className={styles.select} title="Rolle">
          <option value="">alle Rollen</option>
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>
        <select name="confirmed" defaultValue={confFilter} className={styles.select} title="Bestätigung">
          <option value="">alle</option>
          <option value="yes">bestätigt</option>
          <option value="no">unbestätigt</option>
        </select>
        <button className={styles.btn} type="submit">Filtern</button>

        <ExportCsvButton
          className={styles.btn}
          rows={filtered.map(u => {
            const p = pmap.get(u.id)
            const m: any = u.user_metadata || {}
            const a: any = m.address || {}
            const ip = ipByUser.get(u.id)
            const bannedUntil = (u as any).banned_until as string | null | undefined
            const banned = Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now())
            return {
              id: u.id,
              email: u.email || '',
              username: (p?.username || m.username || ''),
              role: (p?.role || 'user'),
              confirmed: u.email_confirmed_at ? 'yes' : 'no',
              created_at: u.created_at || '',
              last_sign_in_at: u.last_sign_in_at || '',
              ip_hash: ip?.ip_hash || '',
              ip_last_seen: ip?.created_at || '',
              banned_until: bannedUntil || '',
              banned,
              accountType: (m.accountType || ''),
              firstName: (m.firstName || ''),
              lastName: (m.lastName || ''),
              companyName: (m.companyName || ''),
              vatNumber: (m.vatNumber || ''),
              street: (a.street || ''),
              houseNumber: (a.houseNumber || ''),
              zip: (a.zip || ''),
              city: (a.city || ''),
              country: (a.country || ''),
            }
          })}
        />
      </form>

      {/* Tabelle */}
      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>E-Mail</th>
                <th className={styles.th}>Username</th>
                <th className={styles.th}>Typ</th>
                <th className={styles.th}>Rolle</th>
                <th className={styles.th}>Bestätigt</th>
                <th className={styles.th}>Stadt</th>
                <th className={styles.th}>Erstellt</th>
                <th className={styles.th}>Letzter Login</th>
                <th className={styles.th}>IP-Hash</th>
                <th className={styles.th}>Zuletzt Hash</th>
                <th className={styles.th}>Sperre</th>
                <th className={styles.th}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const prof = pmap.get(u.id)
                const role = prof?.role || 'user'
                const isSelf = u.id === user!.id
                const isAdmin = role === 'admin'

                const m: any = u.user_metadata || {}
                const a: any = m.address || {}
                const typeRaw = (m.accountType || '').toString().toUpperCase()
                const typeLabel = typeRaw === 'PRIVATE' ? 'Privat'
                                : typeRaw === 'COMPANY' ? 'Gewerblich'
                                : (m.accountType || '—')

                const ip = ipByUser.get(u.id)
                const bannedUntilStr = (u as any).banned_until as string | null | undefined
                const bannedUntil = bannedUntilStr ? new Date(bannedUntilStr) : null
                const isBanned = !!bannedUntil && bannedUntil.getTime() > Date.now()

                return (
                  <tr key={u.id} className={styles.tr}>
                    <td className={styles.td}>{u.email ?? '—'}</td>
                    <td className={styles.td}>{prof?.username || '—'}</td>
                    <td className={styles.td}>{typeLabel}</td>
                    <td className={styles.td}>
                      <span className={`${styles.role} ${isAdmin ? styles.roleAdmin : styles.roleUser}`}>{role}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${u.email_confirmed_at ? styles.badgeOk : styles.badgeWarn}`}>
                        {u.email_confirmed_at ? 'bestätigt' : 'unbestätigt'}
                      </span>
                    </td>
                    <td className={styles.td}>{a.city || '—'}</td>
                    <td className={styles.td}>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                    <td className={styles.td}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</td>
                    <td className={styles.td} style={{ fontFamily: 'monospace' }}>
                      {ip?.ip_hash ? `${ip.ip_hash.slice(0, 16)}…` : '—'}
                    </td>
                    <td className={styles.td}>{ip?.created_at ? new Date(ip.created_at).toLocaleString() : '—'}</td>
                    <td className={styles.td}>
                      {isBanned ? (
                        <span className={`${styles.badge} ${styles.badgeWarn}`}>gesperrt bis {bannedUntil!.toLocaleString()}</span>
                      ) : '—'}
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <UserDetailsButton user={u} profile={prof} className={styles.btn} />
                        <a href={`/admin/users/${u.id}/logins`} className={styles.btn}>Logins</a>

                        <form action={updateRole}>
                          <input type="hidden" name="userId" value={u.id} />
                          <select name="role" defaultValue={role} className={styles.select}>
                            <option value="user">user</option>
                            <option value="admin" disabled={!isSelf}>admin</option>
                          </select>
                          <button className={styles.btn}>Speichern</button>
                        </form>

                        {!isSelf && (
                          <form action={toggleBan} style={{ display: 'inline-flex', gap: 8 }}>
                            <input type="hidden" name="userId" value={u.id} />
                            {isBanned ? (
                              <>
                                <input type="hidden" name="action" value="unban" />
                                <button className={styles.btn}>Entsperren</button>
                              </>
                            ) : (
                              <>
                                <input type="hidden" name="action" value="ban" />
                                <select name="duration" className={styles.select} defaultValue="24h" title="Dauer">
                                  <option value="2h">2h</option>
                                  <option value="24h">24h</option>
                                  <option value="168h">7 Tage</option>
                                  <option value="720h">30 Tage</option>
                                  <option value="8760h">1 Jahr</option>
                                  <option value="87600h">10 Jahre</option>
                                </select>
                                <button className={`${styles.btn} ${styles.btnDanger}`}>Sperren</button>
                              </>
                            )}
                          </form>
                        )}

                        {!isAdmin && !isSelf && (
                          <DeleteUserButton
                            userId={u.id}
                            action={deleteUser}
                            className={`${styles.btn} ${styles.btnDanger}`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={12} style={{ color: '#6b7280' }}>
                    Keine Nutzer gefunden.
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

      <NoticeToast />
    </main>
  )
}
