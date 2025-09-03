'use client'

import { useState } from 'react'

type Props = {
  orderId: string
  amountCents: number
  currency?: string // 'eur' etc.
  status: string    // erwartet u.a. 'funds_held'
  isBuyer?: boolean // optional: zum Anzeigen/Verbergen im UI
  onReleased?: (info: { transferId: string; fee_cents: number; transferred_cents: number }) => void
}

const fmtCurrency = (cents: number, currency = 'eur') =>
  (cents / 100).toLocaleString('de-AT', { style: 'currency', currency: currency.toUpperCase() })

export default function ReleaseControls({
  orderId,
  amountCents,
  currency = 'eur',
  status,
  isBuyer = true,
  onReleased,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const fee = Math.round(amountCents * 0.07)
  const net = amountCents - fee

  const canRelease = isBuyer && status === 'funds_held'

  async function doRelease() {
    setErr(null); setMsg(null); setBusy(true)
    try {
      const res = await fetch('/api/orders/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const json = await res.json()
      if (!res.ok) {
        // Bekannte Fehler hübscher mappen:
        const code = (json?.error || '').toString()
        if (code.includes('Supplier not onboarded')) {
          throw new Error('Der Anbieter hat sein Auszahlungsprofil noch nicht abgeschlossen.')
        }
        if (code.includes('not ready for payouts')) {
          throw new Error('Der Anbieter ist noch nicht auszahlungsbereit (payouts/charges disabled).')
        }
        if (code.includes('Invalid status')) {
          throw new Error('Die Bestellung ist noch nicht freigabebereit.')
        }
        throw new Error(code || 'Freigabe fehlgeschlagen.')
      }
      setMsg('Zahlung freigegeben.')
      onReleased?.({
        transferId: json.transferId,
        fee_cents: json.fee_cents,
        transferred_cents: json.transferred_cents,
      })
    } catch (e: any) {
      setErr(e?.message || 'Freigabe fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  if (!isBuyer) return null

  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 10 }}>
      <div style={{ marginBottom: 8, color: '#374151' }}>
        <div><strong>Gesamt:</strong> {fmtCurrency(amountCents, currency)}</div>
        <div><strong>Plattformgebühr (7%):</strong> {fmtCurrency(fee, currency)}</div>
        <div><strong>Auszahlung an Verkäufer:</strong> {fmtCurrency(net, currency)}</div>
      </div>

      <button
        type="button"
        onClick={doRelease}
        disabled={!canRelease || busy}
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: canRelease && !busy ? '#111827' : '#9ca3af',
          color: '#fff',
          cursor: canRelease && !busy ? 'pointer' : 'not-allowed'
        }}
        title={canRelease ? 'Zahlung an Verkäufer freigeben' : 'Aktuell nicht freigabebereit'}
      >
        {busy ? 'Gebe frei…' : 'Zahlung freigeben'}
      </button>

      {msg && <div style={{ marginTop: 8, color: '#065f46' }}>{msg}</div>}
      {err && <div style={{ marginTop: 8, color: '#b91c1c' }}>{err}</div>}
      {!canRelease && (
        <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
          Freigabe ist nur möglich, wenn die Zahlung eingegangen ist (Status: <code>funds_held</code>).
        </div>
      )}
    </div>
  )
}
