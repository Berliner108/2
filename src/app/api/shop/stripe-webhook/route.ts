// src/app/shop/stripe-webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion optional
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  if (!webhookSecret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  let event: Stripe.Event;

  // ✅ Wichtig: raw body verwenden
  const rawBody = await req.text();

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verify failed: ${err?.message ?? "unknown"}` }, { status: 400 });
  }

  const admin = supabaseAdmin();

  try {
    // ---- 1) Checkout abgeschlossen -> Order auf "paid" setzen + Charge ID speichern ----
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Wir brauchen deine Order-ID (du setzt sie in metadata in checkout-session route)
      const orderId =
        (session.metadata?.shop_order_id as string | undefined) ??
        (session.client_reference_id as string | undefined) ??
        null;

      if (!orderId) {
        // ohne Order-ID können wir nichts mappen -> trotzdem 200 zurückgeben (Stripe soll nicht retry-spammen)
        return NextResponse.json({ ok: true, skipped: "missing_order_id" });
      }

      // payment_intent holen + latest_charge expanden => stripe_charge_id
      const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      let paymentIntent: Stripe.PaymentIntent | null = null;

      if (piId) {
        paymentIntent = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      }

      const chargeId =
        typeof paymentIntent?.latest_charge === "string"
          ? paymentIntent.latest_charge
          : (paymentIntent?.latest_charge as Stripe.Charge | null)?.id ?? null;

      const nowIso = new Date().toISOString();

      // idempotent update: nur wenn noch nicht paid_at gesetzt
      const { data: updated, error: uErr } = await admin
        .from("shop_orders")
        .update({
          status: "paid",
          paid_at: nowIso,
          stripe_payment_intent_id: piId ?? null,
          stripe_charge_id: chargeId,
          updated_at: nowIso,
        })
        .eq("id", orderId)
        .is("paid_at", null)
        .select("id,status,paid_at,stripe_payment_intent_id,stripe_charge_id")
        .maybeSingle();

      // Falls bereits paid_at gesetzt (idempotent), ist updated null -> ok.
      if (uErr) {
        // Stripe soll retryen, falls DB gerade Probleme hat
        return NextResponse.json({ error: uErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, updated: !!updated });
    }

    // ---- 2) Optional: charge.succeeded als Fallback, falls session-event mal fehlt ----
    // (nützlich wenn du später Sessions anders machst oder Charge-ID sicher willst)
    if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;

      const orderId = (charge.metadata?.shop_order_id as string | undefined) ?? null;
      if (!orderId) return NextResponse.json({ ok: true, skipped: "missing_order_id" });

      const nowIso = new Date().toISOString();

      // Hier setzen wir nur stripe_charge_id, falls noch leer
      const { error: cErr } = await admin
        .from("shop_orders")
        .update({
          stripe_charge_id: charge.id,
          updated_at: nowIso,
        })
        .eq("id", orderId)
        .is("stripe_charge_id", null);

      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

      return NextResponse.json({ ok: true, updated: true });
    }

    // ---- 3) Optional: payment_intent.payment_failed -> Order markieren ----
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;

      const orderId = (pi.metadata?.shop_order_id as string | undefined) ?? null;
      if (!orderId) return NextResponse.json({ ok: true, skipped: "missing_order_id" });

      const nowIso = new Date().toISOString();

      // Wir lassen status auf payment_pending (oder du setzt "payment_failed" wenn du willst)
      // Hier nur stripe_payment_intent_id speichern, falls nicht vorhanden
      const { error: pErr } = await admin
        .from("shop_orders")
        .update({
          stripe_payment_intent_id: pi.id,
          updated_at: nowIso,
        })
        .eq("id", orderId)
        .is("stripe_payment_intent_id", null);

      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

      return NextResponse.json({ ok: true, updated: true });
    }

    // Alles andere: einfach ok
    return NextResponse.json({ ok: true, ignored: event.type });
  } catch (e: any) {
    // bei Fehler -> 500, Stripe retryt dann automatisch
    return NextResponse.json({ error: e?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}
