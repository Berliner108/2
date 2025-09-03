'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

type CheckoutInnerProps = {
  returnTo: string
}

function CheckoutInner({ returnTo }: CheckoutInnerProps) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onPay() {
    if (!stripe || !elements) return
    setBusy(true); setErr(null)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      // Wenn 3DS/Redirect nötig ist, übernimmt Stripe das,
      // danach kommst du auf returnTo zurück.
      confirmParams: { return_url: window.location.origin + returnTo },
    })

    setBusy(false)

    if (error) {
      // Bekannte Fehlertypen hübscher behandeln
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setErr(error.message || 'Zahlung fehlgeschlagen.')
      } else {
        setErr('Unerwarteter Fehler bei der Zahlung.')
      }
      return
    }

    // Erfolg oder noch in Verarbeitung → zurück zur Übersicht
    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      router.push(returnTo)
      return
    }

    // Fallback: in allen anderen Fällen auch zurück (z. B. requires_action via Redirect)
    router.push(returnTo)
  }

  return (
    <div style={{ maxWidth: 520, margin: '32px auto', padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Zahlung</h1>
      <PaymentElement />
      {err && <div style={{ marginTop: 10, color: '#b91c1c' }}>{err}</div>}
      <button
        onClick={onPay}
        disabled={busy || !stripe || !elements}
        style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#111827', color: '#fff' }}
      >
        {busy ? 'Wird bestätigt…' : 'Jetzt bezahlen'}
      </button>
    </div>
  )
}

export default function ZahlungPage() {
  const sp = useSearchParams()
  const router = useRouter()

  const orderId  = sp.get('orderId')
  const returnTo = sp.get('returnTo') || '/konto/orders'
  const csFromQS = sp.get('cs') // optionaler client_secret aus URL

  const [clientSecret, setClientSecret] = useState<string | null>(csFromQS)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!csFromQS)

  // Falls client_secret nicht via QS kam, vom Server holen
  useEffect(() => {
    (async () => {
      if (!orderId) { setErr('Fehlender Parameter: orderId'); setLoading(false); return }
      if (clientSecret) { setLoading(false); return }

      try {
        const res = await fetch('/api/orders/pi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Konnte PaymentIntent nicht laden.')
        setClientSecret(json.clientSecret)
        setErr(null)
      } catch (e: any) {
        setErr(e?.message || 'Fehler beim Laden.')
      } finally {
        setLoading(false)
      }
    })()
  }, [orderId, clientSecret])

  const options = useMemo(() => {
    if (!clientSecret) return undefined
    return {
      clientSecret,
      locale: 'de', // deutsch
      appearance: { theme: 'stripe' as const },
      // Optional: billingDetails Autofill könntest du hier angeben (defaultValues),
      // z.B. name/email, wenn du sie im State hast.
    }
  }, [clientSecret])

  if (!stripePromise) {
    return <div style={{ padding: 20 }}>Stripe nicht konfiguriert.</div>
  }

  if (!orderId) {
    return <div style={{ padding: 20 }}>Fehlender Parameter: orderId</div>
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Lade Zahlungsinformationen… {err && <div style={{ color: '#b91c1c' }}>{err}</div>}</div>
  }

  if (!clientSecret || !options) {
    return (
      <div style={{ padding: 20 }}>
        Konnte Zahlungsinformationen nicht laden.
        {err && <div style={{ color: '#b91c1c', marginTop: 8 }}>{err}</div>}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => router.back()} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            Zurück
          </button>
        </div>
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutInner returnTo={returnTo} />
    </Elements>
  )
}
