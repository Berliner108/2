// /src/components/checkout/CheckoutModal.tsx
'use client'
import { useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe-client'

function Inner({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    if (!stripe || !elements) return
    setLoading(true); setError(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    setLoading(false)
    if (error) {
      setError(error.message || 'Zahlung fehlgeschlagen.')
      return
    }
    onSuccess()
    onClose()
  }

  return (
    <div style={{ padding: 16 }}>
      <PaymentElement />
      {error && <div style={{ color: '#b91c1c', marginTop: 8 }}>{error}</div>}
      <div style={{ display:'flex', gap:8, marginTop:12 }}>
        <button onClick={onClose} disabled={loading} style={{ padding:'10px 12px', borderRadius:8, border:'1px solid #e5e7eb' }}>
          Abbrechen
        </button>
        <button onClick={pay} disabled={loading} style={{ padding:'10px 12px', borderRadius:8, background:'#111827', color:'#fff' }}>
          {loading ? 'Wird bezahlt…' : 'Jetzt bezahlen'}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutModal({
  clientSecret, open, onClose, onSuccess,
}: { clientSecret: string | null; open: boolean; onClose: () => void; onSuccess: () => void }) {
  if (!open || !clientSecret) return null
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'grid', placeItems:'center', zIndex:1000
    }}>
      <div style={{ width: 'min(520px, 92vw)', borderRadius: 12, background:'#fff', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <Elements stripe={stripePromise!} options={{ clientSecret }}>
          <Inner onClose={onClose} onSuccess={onSuccess} />
        </Elements>
      </div>
    </div>
  )
}
