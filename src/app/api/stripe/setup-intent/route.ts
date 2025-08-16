export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";
import { stripe } from "@/lib/stripe";

export async function POST() {
  // Session check
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const customerId = await getOrCreateStripeCustomer(user.id, user.email ?? null);

  // SetupIntent für zukünftige Zahlungen (off_session)
  const intent = await stripe.setupIntents.create({
    customer: customerId,
    usage: "off_session",
    // Lass Stripe die erlaubten PM-Types anhand deines Accounts bestimmen.
    // Optional: payment_method_types: ["card", "sepa_debit"],
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
