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

  // Länder für Dropdown.
  // Ein Fehler/Timeout hier darf NICHT die komplette Analytics-Seite blockieren.
  const { data: countriesRaw, error: countriesErr } = await db.rpc('admin_visit_countries')

  const countries: string[] = countriesErr
    ? []
    : (countriesRaw || [])
        .map((r: any) => String(r.country || '').toUpperCase())
        .filter((c: string) => Boolean(c))

  // ---- Daten komplett serverseitig filtern/paginieren.
  // WICHTIG: Die SQL-Funktionen dazu stehen in admin_visits_sql.sql.
  const rpcArgs = {
    p_from: from || null,
    p_to: to || null,
    p_country: country || null,
    p_ip_prefix: ip || null,
    p_include_bots: includeBots,
  }

  // Gesamtzahl zuerst holen, damit auch ungültige/zu hohe Seiten sauber behandelt werden.
  const { data: countData, error: countErr } = await db.rpc('admin_visits_count', rpcArgs)

  if (countErr) {
    return <pre style={{ padding: 16, color: 'crimson' }}>
      {`Besuche konnten nicht gezählt werden: ${countErr.message}`}
    </pre>
  }

  const total = Number(countData ?? 0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageOffset = (safePage - 1) * pageSize

  const { data: pageRows, error } = await db.rpc('admin_visits_page', {
    ...rpcArgs,
    p_limit: pageSize,
    p_offset: pageOffset,
  })

  if (error) {
    return <pre style={{ padding: 16, color: 'crimson' }}>
      {`Besuche konnten nicht geladen werden: ${error.message}`}
    </pre>
  }

  const data = pageRows || []

  // Chart ebenfalls in PostgreSQL aggregieren – keine 10.000-Rohzeilen-Grenze mehr.
  // Ohne Datumsfilter zeigt der Chart weiterhin die letzten 30 Kalendertage.
  const { data: chartRows, error: chartErr } = await db.rpc('admin_visits_daily', rpcArgs)

  const chartData = (chartErr ? [] : (chartRows || [])).map((r: any) => ({
    date: new Date(`${r.day}T12:00:00`).toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
    }),
    count: Number(r.cnt ?? 0),
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
    <div style={{ padding: 16, width: '100%', maxWidth: '100%' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Besuche (visits)</h1>

      {countriesErr && (
        <div style={{ marginBottom: 12, padding: 10, color: '#92400e' }}>
          Länderliste konnte momentan nicht geladen werden. Die Besuchsdaten funktionieren trotzdem.
        </div>
      )}

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
