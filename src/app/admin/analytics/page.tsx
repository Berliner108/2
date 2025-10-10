//app/admin/analytics/page.tsx

import { createClient } from '@supabase/supabase-js'

export const revalidate = 0

type Props = { searchParams?: { from?: string; to?: string; country?: string } }

export default async function AdminAnalytics({ searchParams }: Props) {
  const from = searchParams?.from || ''
  const to = searchParams?.to || ''
  const country = (searchParams?.country || '').toUpperCase()

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // serverseitig
  )

  // Länder-Dropdown
  const { data: countriesRaw } = await db
    .from('page_views')
    .select('country')
    .not('country', 'is', null)
    .order('country', { ascending: true })
    .limit(5000)

  const countries = Array.from(new Set((countriesRaw || [])
    .map(r => (r.country || '').toUpperCase())
    .filter(Boolean)
  ))

  // Daten mit Filtern
  let query = db
    .from('page_views')
    .select('ts, path, referrer, ip_hash, country, is_bot')
    .order('ts', { ascending: false })
    .limit(500)

  if (from) query = query.gte('ts', new Date(from).toISOString())
  if (to)   query = query.lte('ts', new Date(new Date(to).getTime() + 24*60*60*1000).toISOString())
  if (country) query = query.eq('country', country)

  const { data, error } = await query
  if (error) {
    return <pre style={{ padding:16, color:'crimson' }}>{error.message}</pre>
  }

  return (
    <div style={{ padding:16 }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:12 }}>Besuche</h1>

      <form method="get" style={{ display:'flex', gap:8, alignItems:'end', marginBottom:12 }}>
        <div>
          <label style={{ display:'block', fontSize:12, color:'#6b7280' }}>Von</label>
          <input type="date" name="from" defaultValue={from} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, color:'#6b7280' }}>Bis</label>
          <input type="date" name="to" defaultValue={to} />
        </div>
        <div>
          <label style={{ display:'block', fontSize:12, color:'#6b7280' }}>Land</label>
          <select name="country" defaultValue={country}>
            <option value="">(alle)</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button type="submit" style={{ padding:'6px 10px', borderRadius:8 }}>Filtern</button>

        <button
          formAction="/api/page-views/purge"
          formMethod="post"
          style={{ marginLeft:'auto', padding:'6px 10px', borderRadius:8,
                   border:'1px solid #ef4444', color:'#ef4444', background:'transparent' }}
          title="Löscht ältere Einträge (Standard: >30 Tage)"
        >
          Ältere löschen
        </button>
      </form>

      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Zeit</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Pfad</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>IP (Hash)</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Land</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Bot?</th>
              <th style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb' }}>Referrer</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r:any, i:number) => (
              <tr key={i}>
                <td style={{ padding:8 }}>{new Date(r.ts).toLocaleString()}</td>
                <td style={{ padding:8 }}>{r.path}</td>
                <td style={{ padding:8 }}>{r.ip_hash ? r.ip_hash.slice(0,16)+'…' : ''}</td>
                <td style={{ padding:8 }}>{r.country || ''}</td>
                <td style={{ padding:8 }}>{r.is_bot ? '🟡' : ''}</td>
                <td style={{ padding:8, maxWidth:280, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {r.referrer || ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
