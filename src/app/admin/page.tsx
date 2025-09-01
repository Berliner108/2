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

  // Gesamtzahl (Auth)
  const { data: page1, error: totalErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
  const totalUsers = totalErr ? 0 : (page1?.total ?? 0)

  // Rollen zählen (profiles)
  const [{ count: adminCount }, { count: userCount }] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ])

  // Neueste Nutzer
  const { data: recentList } = await admin.auth.admin.listUsers({ page: 1, perPage: 8 })
  const recent = recentList?.users ?? []

  // ===== Pageview-Stats =====
  const nowIso = new Date().toISOString()
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since7  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: pv24 }, { data: pv7 }] = await Promise.all([
    admin.rpc('pv_stats', { p_from: since24, p_to: nowIso }),
    admin.rpc('pv_stats', { p_from: since7,  p_to: nowIso }),
  ])

  const stats24 = (pv24 && pv24[0]) ? pv24[0] as { total: number; uniques: number } : { total: 0, uniques: 0 }
  const stats7  = (pv7  && pv7[0])  ? pv7[0]  as { total: number; uniques: number } : { total: 0, uniques: 0 }

  const { data: topPathsRaw } = await admin.rpc('pv_top_paths', { p_from: since7, p_to: nowIso, p_limit: 10 })
  const topPaths = (topPathsRaw || []) as { path: string; hits: number }[]

  // ==== Einladungen (KPIs + Liste) ====
  const [{ count: invTotal }, { count: invAccepted }] = await Promise.all([
    admin.from('invitations').select('*', { count: 'exact', head: true }),
    admin.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
  ])

  const { data: recentInvRaw } = await admin
    .from('invitations')
    .select('id, inviter_id, invitee_email, status, created_at, accepted_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const recentInv = (recentInvRaw || []) as InviteRow[]

  // Einlader-Namen auflösen
  const inviterIds = Array.from(new Set(recentInv.map(r => r.inviter_id))).filter(Boolean)
  const { data: inviterProfiles } = inviterIds.length
    ? await admin.from('profiles').select('id, username').in('id', inviterIds)
    : { data: [] as any[] }

  const inviterNameById = new Map<string, string>(
    (inviterProfiles || []).map((p: any) => [p.id, p.username || '—'])
  )

  // Top-Einlader (7 Tage) – Aggregation in JS
  const { data: acceptedRows } = await admin
    .from('invitations')
    .select('inviter_id')
    .eq('status', 'accepted')
    .gte('accepted_at', since7)

  const counts = new Map<string, number>()
  for (const r of acceptedRows || []) {
    if (!r.inviter_id) continue
    counts.set(r.inviter_id, (counts.get(r.inviter_id) || 0) + 1)
  }

  const topInv7Ids = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const missing = topInv7Ids.filter(id => !inviterNameById.has(id))
  if (missing.length) {
    const { data: moreProfiles } = await admin.from('profiles').select('id, username').in('id', missing)
    for (const p of moreProfiles || []) {
      inviterNameById.set(p.id, p.username || '—')
    }
  }

  const topInv7 = topInv7Ids.map(id => ({
    inviter_id: id,
    count: counts.get(id) || 0,
    name: inviterNameById.get(id) || '—',
  }))

  const conversion = invTotal ? Math.round(((invAccepted || 0) / invTotal) * 100) : 0

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
<div className={styles.actions}>
  <a href="/admin/users" className={styles.linkBtn}>Nutzer verwalten</a>
  <a href="/admin/lackanfragen" className={styles.linkBtn}>Lackanfragen verwalten</a>
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
