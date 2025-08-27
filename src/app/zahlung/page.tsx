// /src/app/zahlung/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function CheckoutInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const stripe = useStripe()
  const elements = useElements()

  const orderId  = sp.get('orderId')
  const returnTo = sp.get('returnTo') || '/konto/orders'
  const [clientSecret, setClientSecret] = useState<string | null>(sp.get('cs'))

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Falls client_secret nicht per URL kommt, vom Server holen
  useEffect(() => {
    (async () => {
      if (clientSecret || !orderId) return
      try {
        const res = await fetch('/api/orders/pi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Konnte PaymentIntent nicht laden.')
        setClientSecret(json.clientSecret)
      } catch (e: any) {
        setErr(e?.message || 'Fehler beim Laden.')
      }
    })()
  }, [clientSecret, orderId])

  async function onPay() {
    if (!stripe || !elements) return
    setBusy(true); setErr(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.origin + returnTo },
    })
    setBusy(false)

    if (error) {
      setErr(error.message || 'Zahlung fehlgeschlagen.')
      return
    }

    // Erfolg / Verarbeitung
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      router.push(returnTo)
      return
    }

    // z.B. requires_action wird von Stripe ggf. redirect handled (if_required)
    router.push(returnTo)
  }

  if (!orderId) {
    return <div style={{padding:20}}>Fehlender Parameter: orderId</div>
  }

  if (!clientSecret) {
    return <div style={{padding:20}}>Lade Zahlungsinformationen… {err && <div style={{color:'#b91c1c'}}>{err}</div>}</div>
  }

  return (
    <div style={{ maxWidth: 520, margin: '32px auto', padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Zahlung</h1>
      <PaymentElement />
      {err && <div style={{ marginTop: 10, color: '#b91c1c' }}>{err}</div>}
      <button
        onClick={onPay}
        disabled={busy}
        style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#111827', color: '#fff' }}
      >
        {busy ? 'Wird bestätigt…' : 'Jetzt bezahlen'}
      </button>
    </div>
  )
}

export default function ZahlungPage() {
  const sp = useSearchParams()
  const cs = sp.get('cs')
  const options = useMemo(() => cs ? ({ clientSecret: cs }) : undefined, [cs])
  if (!stripePromise) return <div style={{padding:20}}>Stripe nicht konfiguriert.</div>

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutInner />
    </Elements>
  )
}
