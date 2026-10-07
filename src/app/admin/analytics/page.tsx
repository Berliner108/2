// app/admin/analytics/page.tsx
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

/** Referrer hübsch:
 * - Vercel-Preview-Hosts: nur Pfad+Query
 * - interne Hosts (eigene Domains könntest du ergänzen): ebenfalls nur Pfad+Query
 * - externe: host + pfad (ohne Protokoll)
 */
function prettyRef(ref?: string | null) {
  if (!ref) return ''
  try {
    const u = new URL(ref)
    const host = u.hostname
    const isVercelPreview = /\.vercel\.app$/i.test(host)
    const isLikelyInternal = isVercelPreview
    return isLikelyInternal ? (u.pathname + u.search) : (host + u.pathname + u.search)
  } catch {
    return safeDecode(ref)
  }
}

/** Bot-Heuristik – gleiche Muster wie im /api/track */
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

  // Länderfilter statisch halten, damit hierfür kein Full-Table-Scan nötig ist.
  const countries: string[] = ['AT', 'DE', 'CH']

  // ---- Filter
  const baseFilters = (q: any) => {
    if (from) {
      q = q.gte('ts', new Date(`${from}T00:00:00+02:00`).toISOString())
    }
    if (to) {
      const nextDay = new Date(`${to}T00:00:00+02:00`)
      nextDay.setDate(nextDay.getDate() + 1)
      q = q.lt('ts', nextDay.toISOString())
    }
    if (country) q = q.eq('country', country)
    if (ip) q = q.ilike('ip_hash', `${ip}%`)
    return q
  }

  // Standardansicht: nur echte Visits aus SQL-View.
  // Mit "Bots zeigen": direkt aus visits.
  const source = includeBots ? 'visits' : 'admin_visits_clean'

  // Erst zählen, bereits serverseitig gefiltert.
  let countQ = db
    .from(source)
    .select('*', { count: 'exact', head: true })

  countQ = baseFilters(countQ)
  const { count, error: countErr } = await countQ

  if (countErr) {
    return <pre style={{ padding: 16, color: 'crimson' }}>
      {`Besuche konnten nicht gezählt werden: ${countErr.message}`}
    </pre>
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageOffset = (safePage - 1) * pageSize
  const pageTo = pageOffset + pageSize - 1

  let dataQ = db
    .from(source)
    .select('ts, path, ref, ip_hash, country, city, ua')
    .order('ts', { ascending: false })
    .range(pageOffset, pageTo)

  dataQ = baseFilters(dataQ)
  const { data, error } = await dataQ

  if (error) {
    return <pre style={{ padding: 16, color: 'crimson' }}>
      {`Besuche konnten nicht geladen werden: ${error.message}`}
    </pre>
  }

  // Chart: für die letzten 30 Tage bzw. gewählten Zeitraum.
  // Auch hier wird bei normaler Ansicht die bereinigte View benutzt.
  const end = to ? new Date(`${to}T12:00:00`) : new Date()
  const start = from
    ? new Date(`${from}T12:00:00`)
    : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)

  let chartQ = db
    .from(source)
    .select('ts')
    .gte('ts', start.toISOString())
    .lt('ts', new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString())
    .order('ts', { ascending: true })
    .limit(10000)

  if (country) chartQ = chartQ.eq('country', country)
  if (ip) chartQ = chartQ.ilike('ip_hash', `${ip}%`)

  const { data: chartRows, error: chartErr } = await chartQ

  const bucketMap = new Map<string, number>()
  for (const r of chartRows || []) {
    const key = new Date(r.ts).toISOString().slice(0, 10)
    bucketMap.set(key, (bucketMap.get(key) || 0) + 1)
  }

  const chartData: { date: string; count: number }[] = []
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    const key = d.toISOString().slice(0, 10)
    chartData.push({
      date: d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }),
      count: bucketMap.get(key) ?? 0,
    })
  }

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
    <div style={{ padding: 16, width: '100%', maxWidth: '100%' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Besuche (visits)</h1>

      {chartErr && (
        <div style={{ marginBottom: 12, padding: 10, color: '#92400e' }}>
          Diagramm konnte momentan nicht vollständig geladen werden: {chartErr.message}
        </div>
      )}

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
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 6 }}>
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
      <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
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
              {['Zeit', 'Pfad', 'IP (Hash)', 'Land', 'Stadt', 'Referrer'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.map((r: any, i: number) => (
              <tr key={i} style={{ background: botLike(r.ua) ? '#fff7ed' : undefined }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {new Date(r.ts).toLocaleString()}
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.path}
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.ua || ''}>
                  {r.ip_hash ? r.ip_hash.slice(0, 16) + '…' : ''}
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.country || ''}
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {safeDecode(r.city)}
                </td>
                <td style={{ padding: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <a
          href={makeUrl(Math.max(1, safePage - 1))}
          aria-disabled={safePage <= 1}
          style={{
            pointerEvents: safePage <= 1 ? 'none' : 'auto',
            opacity: safePage <= 1 ? 0.5 : 1,
            padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8
          }}
        >
          ← Zurück
        </a>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          Seite {safePage} von {totalPages} (gesamt {total})
        </span>
        <a
          href={makeUrl(Math.min(totalPages, safePage + 1))}
          aria-disabled={safePage >= totalPages}
          style={{
            pointerEvents: safePage >= totalPages ? 'none' : 'auto',
            opacity: safePage >= totalPages ? 0.5 : 1,
            padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8
          }}
        >
          Weiter →
        </a>
      </div>
    </div>
  )
}
