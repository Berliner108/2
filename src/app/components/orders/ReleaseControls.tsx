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
        credentials: 'include', // 👈 wichtig: Cookies/Supabase-Session mitsenden
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json', // 👈 defensive
        },
        body: JSON.stringify({ orderId }),
      })

      // defensiv: erst content-type prüfen, sonst Text lesen
      const ct = res.headers.get('content-type') || ''
      const isJson = ct.includes('application/json')

      if (!isJson) {
        const text = await res.text().catch(() => '')
        throw new Error(`Antwort ist kein JSON (${res.status}). ${text.slice(0, 200)}`)
      }

      const json = await res.json().catch(() => ({} as any))

      if (!res.ok) {
        const code = (json?.error || '').toString() || `HTTP ${res.status}`
        // Bekannte Fehler hübscher mappen:
        if (/SELLER_NOT_CONNECTED/i.test(code)) {
          throw new Error('Der Anbieter hat sein Auszahlungsprofil noch nicht abgeschlossen.')
        }
        if (/not ready|payouts|charges/i.test(code)) {
          throw new Error('Der Anbieter ist noch nicht auszahlungsbereit (payouts/charges disabled).')
        }
        if (/not in releasable state|Invalid status/i.test(code)) {
          throw new Error('Die Bestellung ist noch nicht freigabebereit.')
        }
        if (res.status === 401 || /Not authenticated|Forbidden/i.test(code)) {
          throw new Error('Bitte erneut einloggen, um die Zahlung freizugeben.')
        }
        throw new Error(code)
      }

      // API gibt mind. { ok: true, transferId } zurück.
      // fee_cents / transferred_cents berechnen wir lokal (robuster).
      const transferId: string = json.transferId || ''
      setMsg('Zahlung freigegeben.')
      onReleased?.({
        transferId,
        fee_cents: fee,
        transferred_cents: net,
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
