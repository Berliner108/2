// src/lib/stripe-customer.ts
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Holt oder erstellt einen Stripe-Customer für den User und speichert die ID in profiles.
 * Wirft einen Error, wenn Stripe nicht konfiguriert ist oder DB-Operationen fehlschlagen.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email?: string | null
): Promise<string> {
  if (!userId) throw new Error('getOrCreateStripeCustomer: missing userId')

  const admin = supabaseAdmin()

  // 1) Schon vorhanden?
  const { data: prof, error: readErr } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()

  if (readErr) throw new Error(`profiles read failed: ${readErr.message}`)
  if (prof?.stripe_customer_id) return String(prof.stripe_customer_id)

  // 2) Stripe-Client holen (mit Guard)
  const stripe = getStripe()
  if (!stripe) {
    throw new Error('Stripe not configured (STRIPE_SECRET_KEY missing)')
  }

  // 3) Customer anlegen
  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  })

  // 4) In DB speichern
  const { error: updErr } = await admin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  if (updErr) {
    // Optional: Rollback versuchen
    // await stripe.customers.del(customer.id).catch(() => {})
    throw new Error(`profiles update failed: ${updErr.message}`)
  }

  return customer.id
}
