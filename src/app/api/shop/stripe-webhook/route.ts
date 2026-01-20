// src/app/api/shop/stripe-webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type ShopOrderStatus = "payment_pending" | "paid" | "shipped" | "released" | "compliant_open" | "refunded";

type ShopOrder = {
  id: string;
  status: ShopOrderStatus;
  paid_at: string | null;
  refunded_at: string | null;
  released_at: string | null;

  article_id: string | null;
  unit: "kg" | "stueck";
  qty: number;

  stock_adjusted: boolean;
  stock_reverted: boolean;

  stripe_payment_intent_id: string | null;
};

type Article = {
  id: string;
  sale_type: string | null;
  qty_kg: number | null;
  qty_piece: number | null;
  published: boolean | null;
  sold_out: boolean | null;
  stock_status: string | null;
};

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const webhookSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET!;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_SHOP_WEBHOOK_SECRET" }, { status: 500 });
  }

  let event: Stripe.Event;
  const rawBody = Buffer.from(await req.arrayBuffer());

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verify failed: ${err?.message ?? "unknown"}` },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();
  const nowIso = new Date().toISOString();

  // Helper: Order laden
  const loadOrder = async (orderId: string) => {
    const { data, error } = await admin
      .from("shop_orders")
      .select("id,status,paid_at,refunded_at,released_at,article_id,unit,qty,stock_adjusted,stock_reverted,stripe_payment_intent_id")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data ?? null) as unknown as ShopOrder | null;
  };

  // Helper: Article laden
  const loadArticle = async (articleId: string) => {
    const { data, error } = await admin
      .from("articles")
      .select("id,sale_type,qty_kg,qty_piece,published,sold_out,stock_status")
      .eq("id", articleId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data ?? null) as unknown as Article | null;
  };

  // Helper: bei gesamt-reservierung wieder freigeben (wenn Zahlung scheitert/abläuft)
  const unreserveIfGesamt = async (order: ShopOrder) => {
    if (!order.article_id) return;

    const art = await loadArticle(order.article_id);
    if (!art) return;

    const saleType = String(art.sale_type ?? "");
    if (saleType !== "gesamt") return;

    // nur "Listing" wieder aktivieren. Mengen wurden noch nicht reduziert (passiert erst bei paid).
    await admin
      .from("articles")
      .update({
        published: true,
        sold_out: false,
        updated_at: nowIso,
        // stock_status bleibt unverändert, weil wir den vorherigen Wert nicht kennen
      })
      .eq("id", art.id);
  };

  // Helper: Bestand abziehen (idempotent via shop_orders.stock_adjusted)
  const adjustStock = async (order: ShopOrder) => {
    if (order.stock_adjusted) return;
    if (!order.article_id) return;

    // wenn refund/release schon passiert, nicht mehr anfassen
    if (order.status === "refunded" || order.refunded_at) return;
    if (order.status === "released" || order.released_at) return;

    const qty = Math.max(0, Number(order.qty ?? 0));
    if (!Number.isFinite(qty) || qty <= 0) {
      // trotzdem Flag setzen, damit wir nicht in Retry-Schleifen hängen
      const { error } = await admin
        .from("shop_orders")
        .update({ stock_adjusted: true, updated_at: nowIso })
        .eq("id", order.id)
        .is("stock_adjusted", false);
      if (error) throw new Error(error.message);
      return;
    }

    const art = await loadArticle(order.article_id);
    if (!art) return;

    const field = order.unit === "kg" ? "qty_kg" : "qty_piece";

    const adjustOnce = async () => {
      const current = Number((art as any)[field] ?? 0);
      const newQty = Math.max(0, current - qty);

      const patch: any = {};
      patch[field] = newQty;

      if (newQty <= 0) {
        patch.sold_out = true;
        patch.published = false;
      } else {
        // bei pro_* lassen wir published wie es ist (keine erzwungene Wiederveröffentlichung)
        patch.sold_out = false;
      }

      // Wenn checkout-session bei "gesamt" reserviert hat (published=false), bleibt das ok,
      // weil newQty bei gesamt ohnehin 0 sein sollte.
      // stock_status lassen wir unverändert (vorherigen Wert kennen wir nicht zuverlässig)

      const { data: updatedArt, error: uErr } = await admin
        .from("articles")
        .update(patch)
        .eq("id", art.id)
        .eq(field, current) // optimistic lock
        .select("id")
        .maybeSingle();

      if (uErr) throw new Error(uErr.message);
      return !!updatedArt;
    };

    // 1 retry bei Konflikt
    let ok = await adjustOnce();
    if (!ok) {
      // neu laden und retry
      const art2 = await loadArticle(order.article_id);
      if (!art2) return;
      (art as any).qty_kg = art2.qty_kg;
      (art as any).qty_piece = art2.qty_piece;
      ok = await adjustOnce();
    }

    if (!ok) {
      // Konflikt bleibt -> nicht Stripe retry-spammen. Wir lassen stock_adjusted=false,
      // damit du es in der DB siehst und manuell prüfen kannst.
      console.error("Stock adjust conflict for order:", order.id, "article:", order.article_id);
      return;
    }

    const { error: flagErr } = await admin
      .from("shop_orders")
      .update({ stock_adjusted: true, updated_at: nowIso })
      .eq("id", order.id)
      .is("stock_adjusted", false);

    if (flagErr) throw new Error(flagErr.message);
  };

  try {
    // ✅ 1) Zahlung erfolgreich -> paid + Bestand abziehen
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = (pi.metadata?.shop_order_id as string | undefined) ?? null;
      if (!orderId) return NextResponse.json({ ok: true, skipped: "missing_order_id" });

      const order = await loadOrder(orderId);
      if (!order) return NextResponse.json({ ok: true, skipped: "order_not_found" });

      // paid setzen (nur aus payment_pending, idempotent)
      if (order.status === "payment_pending" && !order.paid_at) {
        const { error: payErr } = await admin
          .from("shop_orders")
          .update({
            status: "paid",
            paid_at: nowIso,
            stripe_payment_intent_id: pi.id,
            updated_at: nowIso,
          })
          .eq("id", orderId)
          .in("status", ["payment_pending"])
          .is("paid_at", null);

        if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 });
      } else if (!order.stripe_payment_intent_id) {
        // PI nachpflegen, falls leer
        const { error: piErr } = await admin
          .from("shop_orders")
          .update({ stripe_payment_intent_id: pi.id, updated_at: nowIso })
          .eq("id", orderId)
          .is("stripe_payment_intent_id", null);

        if (piErr) return NextResponse.json({ error: piErr.message }, { status: 500 });
      }

      // Bestand abziehen (nur 1x)
      await adjustStock(order);

      return NextResponse.json({ ok: true, handled: "payment_intent.succeeded" });
    }

    // ✅ 2) Zahlung fehlgeschlagen -> ggf. gesamt-Reservierung freigeben
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = (pi.metadata?.shop_order_id as string | undefined) ?? null;
      if (!orderId) return NextResponse.json({ ok: true, skipped: "missing_order_id" });

      const order = await loadOrder(orderId);
      if (!order) return NextResponse.json({ ok: true, skipped: "order_not_found" });

      if (!order.stripe_payment_intent_id) {
        await admin
          .from("shop_orders")
          .update({ stripe_payment_intent_id: pi.id, updated_at: nowIso })
          .eq("id", orderId)
          .is("stripe_payment_intent_id", null);
      }

      await unreserveIfGesamt(order);

      return NextResponse.json({ ok: true, handled: "payment_intent.payment_failed" });
    }

    // ✅ 3) Checkout Session abgelaufen -> ggf. gesamt-Reservierung freigeben
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId =
        (session.metadata?.shop_order_id as string | undefined) ??
        (session.client_reference_id as string | undefined) ??
        null;

      if (!orderId) return NextResponse.json({ ok: true, skipped: "missing_order_id" });

      const order = await loadOrder(orderId);
      if (!order) return NextResponse.json({ ok: true, skipped: "order_not_found" });

      // nur freigeben, wenn noch nicht bezahlt
      if (order.status === "payment_pending" && !order.paid_at) {
        await unreserveIfGesamt(order);
      }

      return NextResponse.json({ ok: true, handled: "checkout.session.expired" });
    }

    return NextResponse.json({ ok: true, ignored: event.type });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}
