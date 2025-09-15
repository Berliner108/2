'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

type AdminInvoiceRow = {
  id?: string
  orderId?: string
  number?: string
  issuedAt?: string
  currency?: string
  totalGrossCents?: number
  feeCents?: number
  netPayoutCents?: number
  downloadPath?: string
  seller?: { id?: string; name?: string | null } | null
  buyer?: { id?: string; name?: string | null } | null
}

type AdminListResponse = {
  items: AdminInvoiceRow[]
  total: number
  page: number
  limit: number
}

const fetcher = (u: string) =>
  fetch(u, { credentials: 'include' }).then(async (r) => {
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`)
    return j as AdminListResponse
  })

const fmtMoney = (cents?: number, curr?: string) =>
  typeof cents === 'number'
    ? (cents / 100).toLocaleString('de-AT', { style: 'currency', currency: (curr || 'EUR').toUpperCase() })
    : '—'

export default function AdminInvoicesPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [q, setQ] = useState('')

  const key = useMemo(() => {
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('limit', String(limit))
    if (q.trim()) qs.set('q', q.trim())
    return `/api/invoices/admin/list?${qs.toString()}`
  }, [page, limit, q])

  const { data, error, isLoading } = useSWR<AdminListResponse>(key, fetcher)

  if (error) {
    return (
      <div style={{ padding: 24, color: 'crimson' }}>
        <strong>Fehler:</strong> {String((error as any)?.message || error)}
      </div>
    )
  }

  if (isLoading || !data) {
    return <div style={{ padding: 24 }}>Lade…</div>
  }

  const items = data.items ?? []
  const total = data.total ?? 0
  const pages = Math.max(1, Math.ceil(total / (data.limit || limit || 50)))

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Rechnungen (Admin)</h1>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          type="search"
          placeholder="Suche: Nummer, Order-ID, Name…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          style={{ padding: 8, minWidth: 280, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <label>
          Pro Seite:{' '}
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
            style={{ padding: 6 }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </label>
        <div style={{ marginLeft: 'auto', opacity: 0.8 }}>
          {total} Einträge • Seite {page}/{pages}
        </div>
      </div>

      {/* Tabelle */}
      {items.length === 0 ? (
        <div>Keine Rechnungen gefunden.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Nr.', 'Datum', 'Order', 'Verkäufer', 'Käufer', 'Auftragswert', 'Gebühr (7%)', 'Auszahlung', 'PDF'].map((h, i) => (
                <th key={i} style={{ textAlign: i >= 5 ? 'right' : 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              // Sicheren Download-HREF bauen (Fallbacks)
              const href =
                it.downloadPath
                  || (it.id ? `/api/invoices/${encodeURIComponent(it.id)}/download` : undefined)
                  || (it.orderId ? `/api/invoices/${encodeURIComponent(it.orderId)}/download` : undefined)

              const sellerName = it.seller?.name || it.seller?.id || '—'
              const buyerName  = it.buyer?.name  || it.buyer?.id  || '—'

              return (
                <tr key={`${it.id || it.orderId || Math.random()}`}>
                  <td style={{ padding: '8px' }}>{it.number || '—'}</td>
                  <td style={{ padding: '8px' }}>
                    {it.issuedAt ? new Date(it.issuedAt).toLocaleDateString('de-AT') : '—'}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {it.orderId || '—'}
                  </td>
                  <td style={{ padding: '8px' }}>{sellerName}</td>
                  <td style={{ padding: '8px' }}>{buyerName}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(it.totalGrossCents, it.currency)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(it.feeCents, it.currency)}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(it.netPayoutCents, it.currency)}</td>
                  <td style={{ padding: '8px' }}>
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">PDF</a>
                    ) : (
                      <span style={{ opacity: 0.6 }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button onClick={() => setPage(1)} disabled={page <= 1}>«</button>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>‹</button>
        <span>Seite {page} / {pages}</span>
        <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>›</button>
        <button onClick={() => setPage(pages)} disabled={page >= pages}>»</button>
      </div>
    </div>
  )
}
