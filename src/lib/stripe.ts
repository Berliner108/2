// src/lib/stripe.ts
import Stripe from 'stripe'

let _stripe: Stripe | null = null

/**
 * Lazy + build-sicher. Gibt null zurück, wenn STRIPE_SECRET_KEY fehlt.
 * apiVersion wird nur gesetzt, wenn STRIPE_API_VERSION vorhanden ist,
 * damit es keinen Type-Literal-Mismatch gibt.
 */
export function getStripe(): Stripe | null {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null

  const cfg: Stripe.StripeConfig = {}

  // Optional: ENV setzen, z.B. "2025-07-30.basil"
  const apiVer = process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion | undefined
  if (apiVer) cfg.apiVersion = apiVer

  _stripe = new Stripe(key, cfg)
  return _stripe
}

// Kompat-Export – kann null sein, daher immer null-checken
export const stripe: Stripe | null = getStripe()

export type { Stripe }
