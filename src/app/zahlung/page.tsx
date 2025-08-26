// /src/app/zahlung/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function Toast({ msg, onClose }: { msg: string | null; onClose: () => void }) {
  if (!msg) return null
  return (
    <div style={{
      position:'fixed', right:16, bottom:16, padding:'10px 12px',
      background:'#111827', color:'#fff', borderRadius:10, zIndex:1000
    }}>
      {msg}
      <button onClick={onClose} style={{ marginLeft:8, color:'#fff' }}>×</button>
    </div>
  )
}

function CheckoutForm({
  orderId,
  returnTo,
  onDone,
}: {
  orderId: string
  returnTo: string | null
  onDone: (ok: boolean, message?: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handlePay = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // bleibt auf der Seite, außer SCA erzwingt Redirect
    })
    setSubmitting(false)

    if (error) {
      onDone(false, error.message || 'Zahlung fehlgeschlagen.')
      return
    }
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      // Erfolg; Webhook setzt Order.status endgültig auf 'succeeded'
      onDone(true)
      return
    }
    onDone(false, 'Zahlung nicht abgeschlossen.')
  }

  return (
    <div style={{ maxWidth: 520, margin: '24px auto', padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Zahlung abschließen</h1>
      <p style={{ color:'#6b7280', marginBottom: 14 }}>
        Bestellnummer: <strong>{orderId}</strong>
      </p>
      <PaymentElement options={{ layout:'tabs' }} />
      <button
        type="button"
        onClick={handlePay}
        disabled={submitting}
        style={{
          marginTop: 12,
          padding: '10px 14px',
          borderRadius: 10,
          border: 'none',
          background: '#111827',
          color: '#fff',
          cursor: 'pointer'
        }}
      >
        {submitting ? 'Zahle…' : 'Jetzt zahlen'}
      </button>

      {returnTo && (
        <div style={{ marginTop: 10 }}>
          <a href={returnTo} style={{ color:'#2563eb', textDecoration:'underline' }}>Zurück</a>
        </div>
      )}
    </div>
  )
}

export default function ZahlungPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const orderId   = sp.get('orderId')
  const csParam   = sp.get('cs')
  const returnTo  = sp.get('returnTo')

  const [clientSecret, setClientSecret] = useState<string | null>(csParam)
  const [toast, setToast] = useState<string | null>(null)

  // Fallback: falls Seite neu geladen wurde ohne ?cs=…, hole client_secret serverseitig
  useEffect(() => {
    (async () => {
      if (clientSecret || !orderId) return
      try {
        const res = await fetch('/api/orders/pi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j?.error || 'Konnte PaymentIntent nicht laden.')
        if (!j.clientSecret) throw new Error('client_secret fehlt.')
        setClientSecret(j.clientSecret)
      } catch (e: any) {
        setToast(e?.message || 'Fehler beim Laden der Zahlung.')
      }
    })()
  }, [clientSecret, orderId])

  const options = useMemo(
    () => (clientSecret ? ({ clientSecret, appearance: { theme: 'stripe' } } as const) : null),
    [clientSecret],
  )

  useEffect(() => {
    if (!orderId) setToast('orderId fehlt.')
  }, [orderId])

  return (
    <>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
        {!orderId ? (
          <div style={{ color:'#b91c1c' }}>Fehlende Parameter.</div>
        ) : !stripePromise ? (
          <div>Stripe nicht konfiguriert.</div>
        ) : !options ? (
          <div>Lade Zahlung…</div>
        ) : (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm
              orderId={orderId}
              returnTo={returnTo}
              onDone={(ok, msg) => {
                if (ok) {
                  setToast('Zahlung erfasst. Du kannst die Seite schließen oder zurückgehen.')
                  // Optional: direkt zurück zur Übersicht
                  if (returnTo) router.replace(returnTo)
                } else {
                  setToast(msg || 'Zahlung fehlgeschlagen.')
                }
              }}
            />
          </Elements>
        )}
      </div>
      <Toast msg={toast} onClose={() => setToast(null)} />
    </>
  )
}
