// /src/app/admin/lackanfragen/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import styles from '../admin.module.css'
import Actions from './Actions'

type LR = {
  id: string
  owner_id: string
  title: string
  created_at: string
  updated_at: string
  published: boolean | null
  status: string | null
  delivery_at: string | null
  lieferdatum: string | null
}

export default async function LackanfragenAdminPage() {
  // Auth + Whitelist
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/lackanfragen')

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (!adminEmails.includes((user.email ?? '').toLowerCase())) redirect('/')

  const { data: me } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') redirect('/')

  const admin = supabaseAdmin()

  // Anfragen laden (neueste zuerst)
  const { data: reqsRaw, error } = await admin
    .from('lack_requests')
    .select('id, owner_id, title, created_at, updated_at, published, status, delivery_at, lieferdatum')
    .order('created_at', { ascending: false })
    .limit(50)

  const reqs = (reqsRaw || []) as LR[]

  // Owner-Namen (optional)
  const ownerIds = Array.from(new Set(reqs.map(r => r.owner_id))).filter(Boolean)
  const { data: profsRaw } = ownerIds.length
    ? await admin.from('profiles').select('id, username').in('id', ownerIds)
    : { data: [] as any[] }

  const nameById = new Map<string, string>((profsRaw || []).map((p: any) => [p.id, p.username || '—']))

  return (
    <div className={styles.wrapper}>
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Lackanfragen verwalten</h2>
          <div style={{ opacity: 0.7 }}>Neueste 50 Einträge</div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Titel</th>
                <th className={styles.th}>Owner</th>
                <th className={styles.th}>Lieferdatum</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Published</th>
                <th className={styles.th}>Erstellt</th>
                <th className={styles.th}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {reqs.map(r => {
                const deliv = r.lieferdatum || r.delivery_at
                const delivStr = deliv ? new Date(deliv).toLocaleDateString('de-DE') : '—'
                const ownerName = nameById.get(r.owner_id) || r.owner_id

                return (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.title || '—'}</div>
                        <div className={styles.id} style={{ marginTop: 2 }}>{r.id}</div>
                        <div style={{ marginTop: 6 }}>
                          <a
                            href={`/lackanfragen/artikel/${r.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.linkBtn}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            ansehen
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <div>{ownerName}</div>
                      <div className={styles.id}>{r.owner_id}</div>
                    </td>
                    <td className={`${styles.td} ${styles.nowrap}`}>{delivStr}</td>
                    <td className={styles.td}>
                      <span className={styles.badge}>{r.status || '—'}</span>
                    </td>
                    <td className={styles.td}>
                      {r.published
                        ? <span className={`${styles.badge} ${styles.badgeOk}`}>ja</span>
                        : <span className={`${styles.badge} ${styles.badgeWarn}`}>nein</span>}
                    </td>
                    <td className={`${styles.td} ${styles.nowrap}`}>
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                    <td className={styles.td}>
                      <Actions id={r.id} initialPublished={!!r.published} />
                    </td>
                  </tr>
                )
              })}

              {reqs.length === 0 && (
                <tr>
                  <td className={styles.td} colSpan={7} style={{ textAlign: 'center', color: '#6b7280' }}>
                    Keine Lackanfragen gefunden.
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
