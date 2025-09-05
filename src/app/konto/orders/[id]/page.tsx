import Link from 'next/link'
import { supabaseServer } from '@/lib/supabase-server'
import OrderActions from '../OrderActions'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <div style={{ padding: 20 }}>Bitte melde dich an.</div>

  const { data: order, error } = await sb
    .from('orders')
    .select(`
      id, created_at, updated_at,
      buyer_id, supplier_id,
      amount_cents, currency,
      status, auto_release_at, released_at, refunded_at,
      charge_id, transfer_id, fee_cents, transferred_cents,
      kind, request_id, offer_id
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) return <div style={{ padding: 20, color: '#b91c1c' }}>Fehler: {error.message}</div>
  if (!order) return <div style={{ padding: 20 }}>Bestellung nicht gefunden.</div>

  const canSee = order.buyer_id === user.id || order.supplier_id === user.id
  if (!canSee) return <div style={{ padding: 20 }}>Kein Zugriff.</div>

  const isBuyer = order.buyer_id === user.id
  const canRelease = isBuyer && order.status === 'funds_held'

  const fmt = new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: (order.currency || 'eur').toUpperCase(),
  })
  const amount = fmt.format(order.amount_cents / 100)
  const fee = typeof order.fee_cents === 'number' ? fmt.format(order.fee_cents / 100) : '—'
  const net = typeof order.transferred_cents === 'number' ? fmt.format(order.transferred_cents / 100) : '—'

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Bestellung #{order.id.slice(0, 8)}</h1>
      <div style={{ marginBottom: 12, color: '#6b7280' }}>
        Erstellt: {new Date(order.created_at).toLocaleString('de-AT')}
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><strong>Status:</strong> {order.status}</div>
          <div><strong>Betrag:</strong> {amount}</div>
          <div><strong>Typ:</strong> {order.kind}</div>
          <div>
            <strong>Anfrage:</strong>{' '}
            {order.request_id ? (
              <Link href={`/lackanfragen/artikel/${encodeURIComponent(String(order.request_id))}`}>
                {String(order.request_id)}
              </Link>
            ) : '—'}
          </div>
          <div><strong>Käufer:</strong> {order.buyer_id}</div>
          <div><strong>Verkäufer:</strong> {order.supplier_id}</div>
          <div>
            <strong>Auto-Freigabe am:</strong>{' '}
            {order.auto_release_at ? new Date(order.auto_release_at).toLocaleString('de-AT') : '—'}
          </div>
          <div>
            <strong>Freigegeben:</strong>{' '}
            {order.released_at ? new Date(order.released_at).toLocaleString('de-AT') : '—'}
          </div>
          <div><strong>Gebühr (7%):</strong> {fee}</div>
          <div><strong>Netto an Verkäufer:</strong> {net}</div>
          <div><strong>Charge ID:</strong> {order.charge_id || '—'}</div>
          <div><strong>Transfer ID:</strong> {order.transfer_id || '—'}</div>
        </div>

        {isBuyer && (
          <OrderActions orderId={order.id} canRelease={canRelease} />
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/konto/lackanfragen">← Zurück zu deinen Lackanfragen</Link>
      </div>
    </div>
  )
}
