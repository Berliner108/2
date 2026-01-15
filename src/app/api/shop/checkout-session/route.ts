import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

type Body = {
  articleId?: string; // optional (wir validieren über tierId + join)
  tierId: string;
  unit?: "kg" | "stueck";
  qty: number;
};

const eurToCents = (v: any) => Math.round(Number(v ?? 0) * 100);

type TierJoinRow = {
  id: string;
  article_id: string;
  unit: "kg" | "stueck";
  min_qty: number;
  max_qty: number | null;
  price: number;
  shipping: number;
  articles:
    | { id: string; title: string | null; seller_id: string; sale_type: string | null }
    | { id: string; title: string | null; seller_id: string; sale_type: string | null }[]
    | null;
};

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // 1) auth
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  // 2) body
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.tierId || !body?.qty) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // 3) Tier laden + Artikel via Join (damit "Artikel nicht gefunden" sauber wird)
  const { data: tierRaw, error: tierErr } = await admin
    .from("article_price_tiers")
    .select(
      [
        "id",
        "article_id",
        "unit",
        "min_qty",
        "max_qty",
        "price",
        "shipping",
        "articles:article_id ( id, title, seller_id, sale_type )",
      ].join(",")
    )
    .eq("id", body.tierId)
    .maybeSingle();

  if (tierErr || !tierRaw) {
    return NextResponse.json({ error: "Preisstaffel nicht gefunden." }, { status: 404 });
  }

  // ✅ TS-Narrow (verhindert GenericStringError-Probleme)
  const tierRow = tierRaw as unknown as TierJoinRow;

  const joined = tierRow.articles;
  const article = Array.isArray(joined) ? joined[0] ?? null : joined ?? null;

  if (!article?.id) {
    return NextResponse.json(
      { error: "Artikel nicht gefunden (Join über Tier liefert keinen Artikel)." },
      { status: 404 }
    );
  }

  // optional: wenn articleId im Body kommt, muss er passen
  if (body.articleId && String(body.articleId) !== String(article.id)) {
    return NextResponse.json(
      { error: "Ungültige Daten (articleId passt nicht zum tierId)." },
      { status: 400 }
    );
  }

  // Käufer darf nicht eigenen Artikel kaufen
  if (article.seller_id === user.id) {
    return NextResponse.json({ error: "Du kannst nicht deinen eigenen Artikel kaufen." }, { status: 400 });
  }

  // unit/qty normalisieren
  const unit: "kg" | "stueck" = (body.unit ?? tierRow.unit) as "kg" | "stueck";
  if (unit !== tierRow.unit) {
    return NextResponse.json({ error: "Falsche Einheit." }, { status: 400 });
  }

  const saleType = String(article.sale_type ?? "");
  const qty = saleType === "gesamt" ? 1 : Math.max(1, Number(body.qty || 1));

  if (qty < Number(tierRow.min_qty)) {
    return NextResponse.json({ error: "Menge zu klein." }, { status: 400 });
  }
  if (tierRow.max_qty != null && qty > Number(tierRow.max_qty)) {
    return NextResponse.json({ error: "Menge zu groß." }, { status: 400 });
  }

  // 4) Preis berechnen (EUR numeric -> cents)
  const unitPriceCents = eurToCents(tierRow.price);
  const shippingCents = eurToCents(tierRow.shipping);

  const totalCents = saleType === "gesamt" ? unitPriceCents + shippingCents : qty * unitPriceCents + shippingCents;

  // 5) Order anlegen
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .insert({
      status: "payment_pending",
      buyer_id: user.id,
      seller_id: article.seller_id,
      article_id: article.id,
      unit,
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
          product_data: { name: article.title ?? "Artikel" },
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
      tier_id: tierRow.id,
      unit,
      qty: String(qty),
    },
  });

  return NextResponse.json({ url: session.url });
}
