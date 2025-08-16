export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const { pmId } = await req.json() as { pmId?: string };
  if (!pmId) return NextResponse.json({ error: "pmId required" }, { status: 400 });

  const customerId = await getOrCreateStripeCustomer(user.id, user.email ?? null);
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pmId } });
  return NextResponse.json({ ok: true });
}
