import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe init
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

// Supabase Admin (Service Role) – Webhook ist nicht "eingeloggt"
function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  // Stripe braucht RAW body (nicht req.json())
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message ?? "unknown"}` },
      { status: 400 }
    );
  }

  try {
    // ✅ Erfolgreicher Checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.shop_order_id; // kommt aus deiner checkout-session route
      if (!orderId) {
        return NextResponse.json({ ok: true, note: "No shop_order_id in metadata" });
      }

      // Nur bei bezahlten Sessions direkt auf paid setzen
      // (bei async payment kann das später kommen)
      const isPaid =
        session.payment_status === "paid" ||
        session.status === "complete";

      if (isPaid) {
        const admin = supabaseAdmin();
        const { error } = await admin
          .from("shop_orders")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      return NextResponse.json({ ok: true });
    }

    // ✅ Falls du später asynchrone Zahlungsarten erlaubst:
    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.shop_order_id;
      if (!orderId) return NextResponse.json({ ok: true });

      const admin = supabaseAdmin();
      const { error } = await admin
        .from("shop_orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // alles andere ignorieren (aber 200 zurückgeben)
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}
