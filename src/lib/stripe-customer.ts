import { stripe } from "./stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** Holt oder erstellt einen Stripe-Customer für den User und speichert die ID im Profile */
export async function getOrCreateStripeCustomer(userId: string, email: string | null) {
  const admin = supabaseAdmin();
  const { data: prof } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (prof?.stripe_customer_id) return prof.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: { supabase_user_id: userId },
  });

  await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}
