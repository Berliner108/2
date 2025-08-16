export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const customerId = await getOrCreateStripeCustomer(user.id, user.email ?? null);

  // Wir holen Karte + SEPA, zusammenführen
  const cards = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  const sepa  = await stripe.paymentMethods.list({ customer: customerId, type: "sepa_debit" });

  // Default-PM ermitteln
  const customer = await stripe.customers.retrieve(customerId) as any;
  const defaultPm = customer?.invoice_settings?.default_payment_method || null;

  const simplify = (pm: any) => {
    if (pm.type === "card") {
      return { id: pm.id, type: "card", brand: pm.card.brand, last4: pm.card.last4, exp: `${pm.card.exp_month}/${String(pm.card.exp_year).slice(-2)}` };
    }
    if (pm.type === "sepa_debit") {
      return { id: pm.id, type: "sepa_debit", bank: pm.sepa_debit.bank_code || null, last4: pm.sepa_debit.last4, exp: null };
    }
    return { id: pm.id, type: pm.type };
  };

  const items = [...cards.data, ...sepa.data].map(simplify);
  return NextResponse.json({ items, defaultPm });
}
