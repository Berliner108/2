'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import type { StripeElementsOptions, StripeElementLocale } from '@stripe/stripe-js' // 👈 neu
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

type CheckoutInnerProps = { returnTo: string }

/* ... dein CheckoutInner bleibt unverändert ... */

export default function ZahlungPage() {
  const sp = useSearchParams()
  const router = useRouter()

  const orderId  = sp.get('orderId')
  const returnTo = sp.get('returnTo') || '/konto/orders'
  const csFromQS = sp.get('cs')

  const [clientSecret, setClientSecret] = useState<string | null>(csFromQS)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(!csFromQS)

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

  // 👇 klar typisiert und locale verengt
  const options = useMemo<StripeElementsOptions | undefined>(() => {
    if (!clientSecret) return undefined
    return {
      clientSecret,
      locale: 'de' as StripeElementLocale,
      appearance: { theme: 'stripe' as const },
    }
  }, [clientSecret])

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <div style={{ padding: 20 }}>Stripe nicht konfiguriert.</div>
  }
  if (!orderId) return <div style={{ padding: 20 }}>Fehlender Parameter: orderId</div>
  if (loading) return <div style={{ padding: 20 }}>Lade Zahlungsinformationen… {err && <div style={{ color: '#b91c1c' }}>{err}</div>}</div>
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
