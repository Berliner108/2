import { createClient } from '@supabase/supabase-js'
import VisitsChart from './VisitsChart'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParams = {
  from?: string
  to?: string
  country?: string
  page?: string
  ip?: string
  bots?: string // "1" = Bots einschließen
}

function safeDecode(s?: string | null) {
  try { return s ? decodeURIComponent(s) : '' } catch { return s || '' }
}

/** Referrer schön anzeigen:
 *  - Vercel-Preview-Hosts: nur Pfad+Query (Host verwirrt)
 *  - Interne gleiche-Origin-Hosts (z. B. www.deine-domain.tld): ebenfalls nur Pfad+Query
 *  - Externe: host + pfad (ohne Protokoll)
 */
function prettyRef(ref?: string | null) {
  if (!ref) return ''
  try {
    const u = new URL(ref)
    const host = u.hostname
    const isVercelPreview = /\.vercel\.app$/i.test(host)
    // interne Hosts optional erweitern: eigene Domains hier ergänzen
    const isLikelyInternal = isVercelPreview
    if (isLikelyInternal) {
      return u.pathname + u.search
    }
    return host + u.pathname + u.search
  } catch {
    // kein absolute URL? Dann ggf. URL-encoding bereinigen
    return safeDecode(ref)
  }
}

/** Einfache Bot-Heuristik (muss mit /api/track deckungsgleich sein) */
const BOT_PATTERNS = [
  'bot', 'crawler', 'spider', 'crawl', 'curl', 'httpx', 'node-fetch',
  'axios', 'headless', 'preview', 'uptime',
  'vercel-screenshot', 'vercel edge functions',
]
function botLike(ua?: string | null) {
  if (!ua) return false
  const s = ua.toLowerCase()
  return BOT_PATTERNS.some(p => s.includes(p))
}

export default async function AdminAnalytics({
  searchParams,
}: {
  searchParams: Promise<SearchParams> // Next 15
}) {
  const sp = await searchParams
  const from = sp?.from || ''
  const to = sp?.to || ''
  const ip = (sp?.ip || '').trim().toLowerCase()
  const includeBots = sp?.bots === '1'
  const country = (sp?.country || '').toUpperCase()

  const pageSize = 50
  const page = Math.max(1, parseInt(sp?.page || '1', 10) || 1)
  const offset = (page - 1) * pageSize
  const toIndex = offset + pageSize - 1

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Länder für Dropdown
  const { data: countriesRaw } = await db
    .from('visits')
    .select('country')
    .not('country', 'is', null)
    .order('country', { ascending: true })
    .limit(5000)

  const countries = Array.from(
    new Set((countriesRaw || []).map(r => (r.country || '').toUpperCase()).filter(Boolean))
  )

  // ---- Query-Builder (für Data & Count identisch anwenden)
  const baseFilters = (q: any) => {
    if (from) q = q.gte('ts', new Date(from).toISOString())
    if (to)   q = q.lte('ts', new Date(new Date(to).getTime() + 24*60*60*1000).toISOString())
    if (country) q = q.eq('country', country)
    if (ip) q = q.ilike('ip_hash', `${ip}%`) // Prefix-Suche (hex)
    if (!includeBots) {
      // mehrere "not ilike" Filter nacheinander
      for (const p of BOT_PATTERNS) {
        q = q.not('ua', 'ilike', `%${p}%`)
      }
    }
    return q
  }

  // Daten (paged)
  let dataQ = db
    .from('visits')
    .select('ts, path, ref, ip_hash, country, city, ua', { count: 'exact' })
    .order('ts', { ascending: false })
    .range(offset, toIndex)

  dataQ = baseFilters(dataQ)
  const { data, count: countMeta, error } = await dataQ

  if (error) {
    return <pre style={{ padding: 16, color: 'crimson' }}>{error.message}</pre>
  }

  // Fallback-Count
  let total = typeof countMeta === 'number' ? countMeta : 0
  if (!total) {
    let countQ = db.from('visits').select('*', { count: 'exact', head: true })
    countQ = baseFilters(countQ)
    const { count } = await countQ
    total = count || 0
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // --- Chart (einfach): auf Basis der aktuellen Seite – schnell & ok für einen Überblick
  const end = to ? new Date(to) : new Date()
  const start = from ? new Date(from) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)

  const seriesMap = new Map<string, number>()
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 24*60*60*1000)) {
    const key = d.toISOString().slice(0,10)
    seriesMap.set(key, 0)
  }
  for (const r of data || []) {
    const key = new Date(r.ts as any).toISOString().slice(0,10)
    if (seriesMap.has(key)) seriesMap.set(key, (seriesMap.get(key) || 0) + 1)
  }
  const chartData = Array.from(seriesMap.entries())
    .sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([k,v]) => ({
      date: new Date(k).toLocaleDateString('de-AT', { day:'2-digit', month:'2-digit' }),
      count: v
    }))

  // Helper: URL mit aktualisierten Params
  const makeUrl = (p: number) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (country) params.set('country', country)
    if (ip) params.set('ip', ip)
    if (includeBots) params.set('bots', '1')
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/admin/analytics${qs ? `?${qs}` : ''}`
  }

  return (
    <div style={{ padding: 16, width:'100%', maxWidth:'100%' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Besuche (visits)</h1>

      {/* Chart */}
      <div style={{ marginBottom: 12 }}>
        <VisitsChart data={chartData} />
      </div>

      {/* Filterleiste */}
      <form method="get" style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Von</label>
          <input type="date" name="from" defaultValue={from} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Bis</label>
          <input type="date" name="to" defaultValue={to} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>Land</label>
          <select name="country" defaultValue={country}>
            <option value="">(alle)</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280' }}>IP (Hash-Prefix)</label>
          <input
            type="text"
            name="ip"
            placeholder="z. B. a3c89c7b…"
            defaultValue={ip}
            style={{ width: 180 }}
          />
        </div>
        <label style={{ display:'inline-flex', gap:6, alignItems:'center', marginLeft: 6 }}>
          <input type="checkbox" name="bots" value="1" defaultChecked={includeBots} />
          Bots zeigen
        </label>

        <button type="submit" style={{ padding: '6px 10px', borderRadius: 8 }}>Filtern</button>

        {/* Manuelles Aufräumen */}
        <button
          formAction="/api/visits/purge"
          formMethod="post"
          style={{
            marginLeft: 'auto',
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid #ef4444',
            color: '#ef4444',
            background: 'transparent'
          }}
          title="Löscht ältere Einträge (Standard: >30 Tage)"
        >
          Ältere löschen
        </button>
      </form>

      {/* Tabelle */}
      <div style={{ width:'100%', maxWidth:'100%', overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            maxWidth: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            tableLayout: 'fixed'
          }}
        >
          <colgroup>
            <col style={{ width: 160 }} />     {/* Zeit */}
            <col style={{ width: '26%' }} />   {/* Pfad */}
            <col style={{ width: 220 }} />     {/* IP */}
            <col style={{ width: 90 }} />      {/* Land */}
            <col style={{ width: 160 }} />     {/* Stadt */}
            <col />                             {/* Referrer */}
          </colgroup>

          <thead>
            <tr>
              {['Zeit','Pfad','IP (Hash)','Land','Stadt','Referrer'].map((h) => (
                <th key={h} style={{ textAlign:'left', padding:8, borderBottom:'1px solid #e5e7eb', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((r: any, i: number) => (
              <tr key={i} style={{ background: botLike(r.ua) ? '#fff7ed' : undefined }}>
                <td style={{ padding: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {new Date(r.ts).toLocaleString()}
                </td>
                <td style={{ padding: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {r.path}
                </td>
                <td style={{ padding: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }} title={r.ua || ''}>
                  {r.ip_hash ? r.ip_hash.slice(0, 16) + '…' : ''}
                </td>
                <td style={{ padding: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {r.country || ''}
                </td>
                <td style={{ padding: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {safeDecode(r.city)}
                </td>
                <td style={{ padding: 8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {prettyRef(r.ref)}
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: '#6b7280', textAlign: 'center' }}>
                  Keine Daten im Zeitraum.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:12 }}>
        <a
          href={makeUrl(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          style={{
            pointerEvents: page <= 1 ? 'none' : 'auto',
            opacity: page <= 1 ? 0.5 : 1,
            padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8
          }}
        >
          ← Zurück
        </a>
        <span style={{ fontSize:12, color:'#6b7280' }}>
          Seite {page} von {totalPages} (gesamt {total})
        </span>
        <a
          href={makeUrl(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          style={{
            pointerEvents: page >= totalPages ? 'none' : 'auto',
            opacity: page >= totalPages ? 0.5 : 1,
            padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8
          }}
        >
          Weiter →
        </a>
      </div>
    </div>
  )
}
