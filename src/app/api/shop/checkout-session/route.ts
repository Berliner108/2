import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type Body = {
  articleId: string;
  tierId: string;
  unit: "kg" | "stueck";
  qty: number;
};

const eurToCents = (v: any) => Math.round(Number(v ?? 0) * 100);

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  // 1) auth
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  // 2) body
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.articleId || !body?.tierId || !body?.unit || !body?.qty) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // 3) article laden (seller_id + sale_type brauchen wir)
  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select("id, title, seller_id, sale_type")
    .eq("id", body.articleId)
    .maybeSingle();

  if (aErr || !article) {
    return NextResponse.json({ error: "Artikel nicht gefunden." }, { status: 404 });
  }

  if (article.seller_id === user.id) {
    return NextResponse.json({ error: "Du kannst nicht deinen eigenen Artikel kaufen." }, { status: 400 });
  }

  // 4) tier laden (deine Tabelle: price/shipping sind EUR numeric)
  const { data: tier, error: tErr } = await supabase
    .from("article_price_tiers")
    .select("id, unit, min_qty, max_qty, price, shipping")
    .eq("id", body.tierId)
    .eq("article_id", body.articleId)
    .maybeSingle();

  if (tErr || !tier) return NextResponse.json({ error: "Preisstaffel nicht gefunden." }, { status: 400 });
  if (tier.unit !== body.unit) return NextResponse.json({ error: "Falsche Einheit." }, { status: 400 });

  const qty = article.sale_type === "gesamt" ? 1 : Math.max(1, Number(body.qty || 1));

  if (qty < Number(tier.min_qty)) {
    return NextResponse.json({ error: "Menge zu klein." }, { status: 400 });
  }
  if (tier.max_qty != null && qty > Number(tier.max_qty)) {
    return NextResponse.json({ error: "Menge zu groß." }, { status: 400 });
  }

  const unitPriceCents = eurToCents(tier.price);
  const shippingCents = eurToCents(tier.shipping);

  const totalCents =
    article.sale_type === "gesamt"
      ? unitPriceCents + shippingCents
      : qty * unitPriceCents + shippingCents;

  // 5) Order anlegen (shop_orders muss existieren; Spalten wie bei dir: *_gross_cents)
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .insert({
      status: "payment_pending",
      buyer_id: user.id,
      seller_id: article.seller_id,
      article_id: article.id,
      unit: body.unit,
      qty,
      price_gross_cents: unitPriceCents,
      shipping_gross_cents: shippingCents,
      total_gross_cents: totalCents,
    })
    .select("id")
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "Order konnte nicht erstellt werden." }, { status: 500 });
  }

  // 6) Stripe Checkout Session
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: article.title ?? "Artikel",
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/konto/bestellungen?success=1&order=${order.id}`,
    cancel_url: `${baseUrl}/kaufen/artikel/${article.id}?canceled=1`,
    metadata: {
      shop_order_id: order.id,
      article_id: article.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
