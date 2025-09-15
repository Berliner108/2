'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string|null>(null)
  const [order, setOrder] = useState<any>(null)
  const [isBuyer, setIsBuyer] = useState(false)
  const [isSupplier, setIsSupplier] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true); setErr(null)
    try {
      const r = await fetch(`/api/orders/${encodeURIComponent(String(id))}`, { cache:'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Laden fehlgeschlagen')
      setOrder(j.order); setIsBuyer(j.isBuyer); setIsSupplier(j.isSupplier)
    } catch(e:any) { setErr(e?.message||'Fehler') } finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [id])

  async function post(path: string, body: any) {
    setBusy(true); setErr(null)
    try {
      const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      const j = await r.json().catch(()=> ({}))
      if (!r.ok) throw new Error(j?.error || 'Aktion fehlgeschlagen')
      await load()
      alert('OK')
    } catch(e:any) { setErr(e?.message||'Fehler') } finally { setBusy(false) }
  }

  const fmt = (c:number) => (c/100).toLocaleString('de-DE',{style:'currency',currency: (order?.currency||'eur').toUpperCase()})

  if (loading) return <div style={{padding:16}}>Lade…</div>
  if (err)     return <div style={{padding:16,color:'#b91c1c'}}>Fehler: {err}</div>
  if (!order)  return <div style={{padding:16}}>Nicht gefunden.</div>

  const canShip    = isSupplier && order.status === 'funds_held'
  const canReceive = isBuyer    && order.status === 'funds_held'
  const canDispute = isBuyer    && order.status === 'funds_held'

  return (
    <div style={{maxWidth:720, margin:'24px auto', padding:16, border:'1px solid #e5e7eb', borderRadius:12}}>
      <h1 style={{marginBottom:8}}>Bestellung #{order.id.slice(0,8)}</h1>
      <div style={{opacity:.8, marginBottom:12}}>
        Status: <b>{order.status}</b> · Betrag: <b>{fmt(order.amount_cents)}</b> · Gebühr: {fmt(order.fee_cents||0)}
      </div>
      <div style={{display:'flex', gap:8, flexWrap:'wrap', margin:'12px 0'}}>
        {canShip && (
          <button disabled={busy} onClick={()=>post('/api/orders/mark-shipped',{orderId:order.id})}>
            {busy ? '…' : 'Versendet markieren'}
          </button>
        )}
        {canReceive && (
          <button disabled={busy} onClick={()=>post('/api/orders/mark-received',{orderId:order.id})}>
            {busy ? '…' : 'Erhalten (freigeben)'}
          </button>
        )}
        {canDispute && (
          <button disabled={busy} onClick={()=>post('/api/orders/dispute',{orderId:order.id, reason:'not_ok'})}>
            {busy ? '…' : 'Reklamieren (Rückzahlung)'}
          </button>
        )}
      </div>

      <div style={{marginTop:8}}>
        <Link href={`/lackanfragen/artikel/${encodeURIComponent(order.request_id)}`}>Zur Lackanfrage</Link>
      </div>

      <pre style={{marginTop:16, background:'#f9fafb', padding:12, borderRadius:8, overflow:'auto'}}>
        {JSON.stringify(order, null, 2)}
      </pre>
    </div>
  )
}
