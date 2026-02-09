// /src/components/checkout/CheckoutModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe-client'

type SuccessPayload = { status: string; paymentIntentId?: string }

function Inner({
  clientSecret,
  onCancelAction,
  onSuccessAction,
}: {
  clientSecret: string
  onCancelAction: () => void
  onSuccessAction: (payload?: SuccessPayload) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    // 1) Bestätigen (ohne Hard-Redirect)
    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmErr) {
      setLoading(false)
      setError(confirmErr.message || 'Zahlung fehlgeschlagen.')
      return
    }

    // 2) Finalen Status prüfen (reliable)
    const { paymentIntent, error: retrieveErr } = await stripe.retrievePaymentIntent(clientSecret)
    setLoading(false)

    if (retrieveErr || !paymentIntent) {
      setError(retrieveErr?.message || 'Konnte Zahlungsstatus nicht ermitteln.')
      return
    }

    const s = paymentIntent.status

    // ✅ Erfolg: NUR Success feuern (Modal schließt Parent selbst)
    if (s === 'succeeded' || s === 'processing') {
      onSuccessAction({ status: s, paymentIntentId: paymentIntent.id })
      return
    }

    // ❗ Kein Auto-Unselect hier – User soll bewusst abbrechen,
    // sonst riskierst du, dass er nur eine andere Zahlungsmethode wählen will.
    if (s === 'requires_payment_method') setError('Zahlung abgebrochen oder andere Zahlungsmethode nötig.')
    else if (s === 'requires_action') setError('Zusätzliche Bestätigung erforderlich. Bitte erneut versuchen.')
    else if (s === 'canceled') setError('Zahlung abgebrochen.')
    else setError(`Unbekannter Zahlungsstatus: ${s}`)
  }

  return (
    <div style={{ padding: 16 }}>
      <PaymentElement />

      {error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={onCancelAction}
          disabled={loading}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
        >
          Abbrechen
        </button>

        <button
          type="button"
          onClick={pay}
          disabled={loading}
          style={{ padding: '10px 12px', borderRadius: 8, background: '#111827', color: '#fff' }}
        >
          {loading ? 'Wird bezahlt…' : 'Jetzt bezahlen'}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutModal({
  clientSecret,
  open,
  onCancelAction,
  onSuccessAction,
}: {
  clientSecret: string | null
  open: boolean
  onCancelAction: () => void
  onSuccessAction: (payload?: SuccessPayload) => void
}) {
  // ESC + Overlay click sollen zuverlässig "cancel" auslösen
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelAction()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancelAction])

  if (!open || !clientSecret) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // ✅ Klick auf Overlay -> cancel
        if (e.target === e.currentTarget) onCancelAction()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 'min(520px, 92vw)',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* key erzwingt Remount bei neuem clientSecret */}
        <Elements key={clientSecret} stripe={stripePromise!} options={{ clientSecret }}>
          <Inner clientSecret={clientSecret} onCancelAction={onCancelAction} onSuccessAction={onSuccessAction} />
        </Elements>
      </div>
    </div>
  )
}
