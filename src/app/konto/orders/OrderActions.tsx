'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OrderActions({
  orderId,
  canRelease,
}: {
  orderId: string
  canRelease: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  async function releaseFunds() {
    setBusy(true); setErr(null); setMsg(null)
    try {
      const res = await fetch('/api/orders/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Freigabe fehlgeschlagen.')
      setMsg('Zahlung freigegeben.')
      router.refresh()
    } catch (e: any) {
      setErr(e?.message || 'Fehler bei der Freigabe.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
      <button
        onClick={releaseFunds}
        disabled={!canRelease || busy}
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: '#111827',
          color: '#fff',
          cursor: canRelease && !busy ? 'pointer' : 'not-allowed',
        }}
      >
        {busy ? 'Gibt frei…' : 'Zahlung freigeben'}
      </button>
      {msg && <span style={{ color: '#059669' }}>{msg}</span>}
      {err && <span style={{ color: '#b91c1c' }}>{err}</span>}
    </div>
  )
}
