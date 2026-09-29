// /app/admin/page.tsx  (oder /src/app/admin/page.tsx)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import styles from './admin.module.css'

type InviteRow = {
  id: string
  inviter_id: string
  invitee_email: string
  status: 'sent' | 'accepted' | 'failed' | 'revoked'
  created_at: string
  accepted_at: string | null
}


async function safeCall<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[admin] ${label} threw:`, error)
    return fallback
  }
}

function logSupabaseError(label: string, error: unknown) {
  if (error) console.error(`[admin] ${label} failed:`, error)
}

export default async function AdminDashboardPage() {
  // 1) Session + Whitelist prüfen
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?redirect=/admin')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  const myEmail = (user.email ?? '').toLowerCase()
  if (!adminEmails.includes(myEmail)) redirect('/')

  // 2) Optionale zweite Schranke (profiles.role === 'admin')
  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') redirect('/')

  // 3) Daten laden
  const admin = supabaseAdmin()

  const nowIso = new Date().toISOString()
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since7  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // WICHTIG: Unabhängige Dashboard-Abfragen parallel starten.
  // Ein Fehler bei Analytics oder Einladungen darf /admin nicht mehr komplett blockieren.
  const [
    usersTotalResult,
    adminCountResult,
    userCountResult,
    recentUsersResult,
    pv24Result,
    pv7Result,
    topPathsResult,
    invTotalResult,
    invAcceptedResult,
    recentInvResult,
    acceptedRowsResult,
  ] = await Promise.all([
    safeCall(
      'auth.admin.listUsers(total)',
      () => admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      { data: { users: [], total: 0 }, error: new Error('listUsers(total) failed') } as any,
    ),
    safeCall(
      'profiles admin count',
      () => admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      { count: 0, error: new Error('profiles admin count failed') } as any,
    ),
    safeCall(
      'profiles user count',
      () => admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
      { count: 0, error: new Error('profiles user count failed') } as any,
    ),
    safeCall(
      'auth.admin.listUsers(recent)',
      () => admin.auth.admin.listUsers({ page: 1, perPage: 8 }),
      { data: { users: [] }, error: new Error('listUsers(recent) failed') } as any,
    ),
    safeCall(
      'pv_stats 24h',
      () => admin.rpc('pv_stats', { p_from: since24, p_to: nowIso }),
      { data: [], error: new Error('pv_stats 24h failed') } as any,
    ),
    safeCall(
      'pv_stats 7d',
      () => admin.rpc('pv_stats', { p_from: since7, p_to: nowIso }),
      { data: [], error: new Error('pv_stats 7d failed') } as any,
    ),
    safeCall(
      'pv_top_paths',
      () => admin.rpc('pv_top_paths', { p_from: since7, p_to: nowIso, p_limit: 10 }),
      { data: [], error: new Error('pv_top_paths failed') } as any,
    ),
    safeCall(
      'invitations total',
      () => admin.from('invitations').select('*', { count: 'exact', head: true }),
      { count: 0, error: new Error('invitations total failed') } as any,
    ),
    safeCall(
      'invitations accepted',
      () => admin.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      { count: 0, error: new Error('invitations accepted failed') } as any,
    ),
    safeCall(
      'invitations recent',
      () =>
        admin
          .from('invitations')
          .select('id, inviter_id, invitee_email, status, created_at, accepted_at')
          .order('created_at', { ascending: false })
          .limit(10),
      { data: [], error: new Error('invitations recent failed') } as any,
    ),
    safeCall(
      'invitations accepted last 7d',
      () =>
        admin
          .from('invitations')
          .select('inviter_id')
          .eq('status', 'accepted')
          .gte('accepted_at', since7),
      { data: [], error: new Error('invitations accepted last 7d failed') } as any,
    ),
  ])

  logSupabaseError('auth.admin.listUsers(total)', usersTotalResult.error)
  logSupabaseError('profiles admin count', adminCountResult.error)
  logSupabaseError('profiles user count', userCountResult.error)
  logSupabaseError('auth.admin.listUsers(recent)', recentUsersResult.error)
  logSupabaseError('pv_stats 24h', pv24Result.error)
  logSupabaseError('pv_stats 7d', pv7Result.error)
  logSupabaseError('pv_top_paths', topPathsResult.error)
  logSupabaseError('invitations total', invTotalResult.error)
  logSupabaseError('invitations accepted', invAcceptedResult.error)
  logSupabaseError('invitations recent', recentInvResult.error)
  logSupabaseError('invitations accepted last 7d', acceptedRowsResult.error)

  const totalUsers = usersTotalResult.error ? 0 : (usersTotalResult.data?.total ?? 0)
  const adminCount = adminCountResult.error ? 0 : (adminCountResult.count ?? 0)
  const userCount = userCountResult.error ? 0 : (userCountResult.count ?? 0)
  const recent = recentUsersResult.error ? [] : (recentUsersResult.data?.users ?? [])

  const pv24 = pv24Result.error ? [] : (pv24Result.data ?? [])
  const pv7 = pv7Result.error ? [] : (pv7Result.data ?? [])
  const stats24 =
    pv24 && pv24[0]
      ? (pv24[0] as { total: number; uniques: number })
      : { total: 0, uniques: 0 }
  const stats7 =
    pv7 && pv7[0]
      ? (pv7[0] as { total: number; uniques: number })
      : { total: 0, uniques: 0 }

  const topPaths = (topPathsResult.error ? [] : (topPathsResult.data ?? [])) as {
    path: string
    hits: number
  }[]

  const invTotal = invTotalResult.error ? 0 : (invTotalResult.count ?? 0)
  const invAccepted = invAcceptedResult.error ? 0 : (invAcceptedResult.count ?? 0)
  const recentInv = (recentInvResult.error ? [] : (recentInvResult.data ?? [])) as InviteRow[]
  const acceptedRows = acceptedRowsResult.error ? [] : (acceptedRowsResult.data ?? [])

  const counts = new Map<string, number>()
  for (const r of acceptedRows || []) {
    if (!r.inviter_id) continue
    counts.set(r.inviter_id, (counts.get(r.inviter_id) || 0) + 1)
  }

  const topInv7Ids = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const inviterIds = Array.from(
    new Set([
      ...recentInv.map((r) => r.inviter_id),
      ...topInv7Ids,
    ].filter(Boolean)),
  )

  const inviterProfilesResult = inviterIds.length
    ? await safeCall(
        'profiles inviter names',
        () => admin.from('profiles').select('id, username').in('id', inviterIds),
        { data: [], error: new Error('profiles inviter names failed') } as any,
      )
    : ({ data: [], error: null } as any)

  logSupabaseError('profiles inviter names', inviterProfilesResult.error)

  const inviterNameById = new Map<string, string>(
    (inviterProfilesResult.error ? [] : (inviterProfilesResult.data ?? [])).map(
      (p: any) => [p.id, p.username || '—'],
    ),
  )

  const topInv7 = topInv7Ids.map((id) => ({
    inviter_id: id,
    count: counts.get(id) || 0,
    name: inviterNameById.get(id) || '—',
  }))

  const conversion = invTotal ? Math.round((invAccepted / invTotal) * 100) : 0

  return (
    <div className={styles.wrapper}>
      {/* Hero / KPIs */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Admin · Dashboard</h1>
        <p className={styles.heroText}>
          Willkommen, {user.email}. Hier siehst du einen schnellen Überblick.
        </p>

        <div className={styles.kpiGrid}>
          <KpiCard label="Gesamt-Nutzer" value={formatNumber(totalUsers)} />
          <KpiCard label="Admins" value={formatNumber(adminCount ?? 0)} />
          <KpiCard label="User" value={formatNumber(userCount ?? 0)} />

          {/* Pageviews / Visitors */}
          <KpiCard label="Pageviews (24h)" value={formatNumber(stats24.total)} />
          <KpiCard label="Visitors (24h)"  value={formatNumber(stats24.uniques)} />
          <KpiCard label="Pageviews (7T)"  value={formatNumber(stats7.total)} />
          <KpiCard label="Visitors (7T)"   value={formatNumber(stats7.uniques)} />

          {/* Einladungen */}
          <KpiCard label="Einladungen gesamt" value={formatNumber(invTotal ?? 0)} />
          <KpiCard label="Einladungen akzeptiert" value={formatNumber(invAccepted ?? 0)} />
          <KpiCard label="Conversion" value={`${conversion}%`} />
        </div>

        <div className={styles.heroBlurA}></div>
        <div className={styles.heroBlurB}></div>
      </section>
      {/* Aktionen */}
{/* Aktionen */}
<div className={styles.actions}>
  <a href="/admin/users" className={styles.linkBtn}>Nutzer verwalten</a>
  <a href="/admin/lackanfragen" className={styles.linkBtn}>Lackanfragen verwalten</a>
  {/* ⬇️ Neu: Besuche/Analytics */}
  <a href="/admin/analytics" className={styles.linkBtn}>Analytics (Besuche)</a>
   <a href="/admin/loeschanfragen" className={styles.linkBtn}>
    Löschanfragen
  </a>
</div>



      {/* Neu registriert */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Neu registriert</h2>
          <a href="/admin/users">Alle Nutzer ansehen</a>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>E-Mail</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Erstellt</th>
                <th className={styles.th}>Letzter Login</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u: any) => (
                <tr key={u.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.gridRow}>
                      <div className={styles.avatar}>{(u.email ?? u.id).charAt(0).toUpperCase()}</div>
                      <div>
                        <div>{u.email ?? '—'}</div>
                        <div className={styles.id}>{u.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.badge} ${u.email_confirmed_at ? styles.badgeOk : styles.badgeWarn}`}>
                      {u.email_confirmed_at ? 'bestätigt' : 'unbestätigt'}
                    </span>
                  </td>
                  <td className={`${styles.td} ${styles.nowrap}`}>
                    {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
                  </td>
                  <td className={`${styles.td} ${styles.nowrap}`}>
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}

              {recent.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={4}>
                    <div className="py-6" style={{ textAlign: 'center', color: '#6b7280' }}>
                      Keine Nutzer gefunden.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top-Seiten (7 Tage) */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Top-Seiten · letzte 7 Tage</h2>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Pfad</th>
                <th className={styles.th}>Aufrufe</th>
              </tr>
            </thead>
            <tbody>
              {topPaths.map((r) => (
                <tr key={r.path} className={styles.tr}>
                  <td className={styles.td}>{r.path}</td>
                  <td className={styles.td}>{formatNumber(Number(r.hits))}</td>
                </tr>
              ))}
              {topPaths.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={2} style={{ color: '#6b7280' }}>
                    Keine Daten im Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Einladungen – zuletzt */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Einladungen · zuletzt</h2>
          <a href="/admin/users">Zu Nutzern</a>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Einladender</th>
                <th className={styles.th}>E-Mail (Eingeladene/r)</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Gesendet</th>
                <th className={styles.th}>Akzeptiert</th>
              </tr>
            </thead>
            <tbody>
              {recentInv.map(r => (
                <tr key={r.id} className={styles.tr}>
                  <td className={styles.td}>{inviterNameById.get(r.inviter_id) || r.inviter_id}</td>
                  <td className={styles.td}>{r.invitee_email}</td>
                  <td className={styles.td}>
                    {r.status === 'accepted' ? (
                      <span className={`${styles.badge} ${styles.badgeOk}`}>akzeptiert</span>
                    ) : r.status === 'sent' ? (
                      <span className={`${styles.badge}`}>versendet</span>
                    ) : r.status === 'failed' ? (
                      <span className={`${styles.badge} ${styles.badgeWarn}`}>fehlgeschlagen</span>
                    ) : (
                      <span className={styles.badge}>zurückgezogen</span>
                    )}
                  </td>
                  <td className={`${styles.td} ${styles.nowrap}`}>{new Date(r.created_at).toLocaleString()}</td>
                  <td className={`${styles.td} ${styles.nowrap}`}>{r.accepted_at ? new Date(r.accepted_at).toLocaleString() : '—'}</td>
                </tr>
              ))}

              {recentInv.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={5}>
                    <div className="py-6" style={{ textAlign: 'center', color: '#6b7280' }}>
                      Noch keine Einladungen.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top-Einlader (7 Tage) */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Top-Einlader · letzte 7 Tage</h2>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Benutzer</th>
                <th className={styles.th}>Akzeptierte Einladungen</th>
              </tr>
            </thead>
            <tbody>
              {topInv7.map(row => (
                <tr key={row.inviter_id} className={styles.tr}>
                  <td className={styles.td}>{row.name} <span className={styles.id} style={{ marginLeft: 6 }}>{row.inviter_id}</span></td>
                  <td className={styles.td}>{formatNumber(row.count)}</td>
                </tr>
              ))}
              {topInv7.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={2} style={{ color: '#6b7280' }}>
                    Keine Daten in den letzten 7 Tagen.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

/* ---------- UI-Teile ---------- */

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <span>{label}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
    </div>
  )
}

function formatNumber(n: number) {
  try {
    return new Intl.NumberFormat('de-AT').format(n)
  } catch {
    return String(n)
  }
}
