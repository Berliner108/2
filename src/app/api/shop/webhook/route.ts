// src/app/api/shop/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",

});

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_SHOP_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text(); // raw body ist Pflicht für Signatur
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid signature", message: err?.message ?? String(err) },
      { status: 400 }
    );
  }

  const supa = supabaseAdmin();

  try {
    const markPaidAndApplyPromo = async (session: Stripe.Checkout.Session) => {
      if (session.mode !== "payment") return;
      if (session.payment_status !== "paid") return;

      const sessionId = session.id;

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;

      // 1) promo_payments: pending -> paid (idempotent)
      const updated = await supa
        .from("promo_payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId,
          stripe_customer_id: customerId,
        })
        .eq("stripe_session_id", sessionId)
        .neq("status", "paid")
        .select("article_id, promo_score")
        .maybeSingle();

      if (!updated.data) return;

      const articleId = updated.data.article_id as string;
      const inc = Number(updated.data.promo_score || 0);
      if (!articleId || !inc) return;

      // 2) articles.promo_score erhöhen
      // (Hinweis: das ist ok; ganz “race-proof” machen wir im nächsten Schritt optional via SQL/RPC)
      const cur = await supa
        .from("articles")
        .select("promo_score")
        .eq("id", articleId)
        .maybeSingle();

      const currentScore = Number(cur.data?.promo_score || 0);

      await supa
        .from("articles")
        .update({ promo_score: currentScore + inc })
        .eq("id", articleId);
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markPaidAndApplyPromo(session);
        break;
      }

      // ✅ optional: falls du irgendwann async payment methods aktivierst
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await markPaidAndApplyPromo(session);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supa
          .from("promo_payments")
          .update({ status: "canceled" })
          .eq("stripe_session_id", session.id)
          .neq("status", "paid");
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supa
          .from("promo_payments")
          .update({ status: "failed" })
          .eq("stripe_session_id", session.id)
          .neq("status", "paid");
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Webhook error" }, { status: 500 });
  }
}
