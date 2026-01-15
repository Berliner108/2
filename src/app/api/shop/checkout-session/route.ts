import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORM_FEE_RATE = 0.07;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

type Body = {
  articleId?: string; // optional (wir validieren nur, wenn mitgesendet)
  tierId: string;
  unit?: "kg" | "stueck";
  qty?: number;
};

const eurToCents = (v: any) => Math.round(Number(v ?? 0) * 100);

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
  if (!body?.tierId) {
    return NextResponse.json({ error: "Ungültige Daten (tierId fehlt)." }, { status: 400 });
  }

  // 3) Tier laden + Artikel direkt joinen (ADMIN => RLS egal)
  //    WICHTIG: Join kann je nach FK/Select als Objekt ODER Array kommen -> wir normalisieren.
  const { data: tierRow, error: tierErr } = await admin
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

  if (tierErr || !tierRow) {
    return NextResponse.json({ error: "Preisstaffel nicht gefunden." }, { status: 404 });
  }

  const joined = (tierRow as any).articles;
  const article =
    Array.isArray(joined) ? joined[0] ?? null : joined ?? null;

  if (!article?.id) {
    return NextResponse.json(
      { error: "Artikel nicht gefunden (Join über Tier liefert keinen Artikel)." },
      { status: 404 }
    );
  }

  // optional: wenn articleId mitgesendet wird, muss sie passen
  if (body.articleId && String(body.articleId) !== String(article.id)) {
    return NextResponse.json(
      {
        error: "Ungültige Daten (articleId passt nicht zum tierId).",
      },
      { status: 400 }
    );
  }

  // unit/qty normalisieren
  const unit = (body.unit ?? tierRow.unit) as "kg" | "stueck";
  if (unit !== tierRow.unit) {
    return NextResponse.json({ error: "Falsche Einheit." }, { status: 400 });
  }

  const saleType = String(article.sale_type ?? "");
  const qty =
    saleType === "gesamt" ? 1 : Math.max(1, Number(body.qty || 1));

  if (qty < Number(tierRow.min_qty)) {
    return NextResponse.json({ error: "Menge zu klein." }, { status: 400 });
  }
  if (tierRow.max_qty != null && qty > Number(tierRow.max_qty)) {
    return NextResponse.json({ error: "Menge zu groß." }, { status: 400 });
  }

  // Käufer darf nicht eigener Verkäufer sein
  if (String(article.seller_id) === String(user.id)) {
    return NextResponse.json({ error: "Du kannst nicht deinen eigenen Artikel kaufen." }, { status: 400 });
  }

  // 4) Preise
  const unitPriceCents = eurToCents(tierRow.price);
  const shippingCents = eurToCents(tierRow.shipping);
  const itemsTotalCents = saleType === "gesamt" ? unitPriceCents : qty * unitPriceCents;
  const totalCents = itemsTotalCents + shippingCents;

  // 5) profiles laden (Snapshots + Connect Destination)
  const { data: sellerProf } = await admin
    .from("profiles")
    .select("id, username, account_type, company_name, vat_number, address, stripe_account_id, stripe_connect_id, connect_ready")
    .eq("id", article.seller_id)
    .maybeSingle();

  if (!sellerProf) {
    return NextResponse.json({ error: "Verkäuferprofil nicht gefunden." }, { status: 409 });
  }

  const sellerStripeAccount =
    (sellerProf as any).stripe_account_id || (sellerProf as any).stripe_connect_id;

  if (!sellerStripeAccount) {
    return NextResponse.json({ error: "Verkäufer hat kein Stripe-Connect Konto hinterlegt." }, { status: 409 });
  }
  if (sellerProf.connect_ready === false) {
    return NextResponse.json({ error: "Verkäufer ist für Connect noch nicht bereit." }, { status: 409 });
  }

  const { data: buyerProf } = await admin
    .from("profiles")
    .select("id, username, account_type, company_name, vat_number, address, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  // 6) Order anlegen (USER client => RLS Insert sauber)
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

      // buyer snapshots
      buyer_username: buyerProf?.username ?? null,
      buyer_account_type: buyerProf?.account_type ?? null,
      buyer_company_name: buyerProf?.company_name ?? null,
      buyer_vat_number: buyerProf?.vat_number ?? null,
      buyer_address: buyerProf?.address ?? null,

      // seller snapshots
      seller_username: sellerProf.username ?? null,
      seller_account_type: sellerProf.account_type ?? null,
      seller_company_name: sellerProf.company_name ?? null,
      seller_vat_number: sellerProf.vat_number ?? null,
      seller_address: sellerProf.address ?? null,
    })
    .select("id")
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "Order konnte nicht erstellt werden." }, { status: 500 });
  }

  // 7) Stripe Checkout Session (Destination Charge)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const feeCents = Math.max(0, Math.round(totalCents * PLATFORM_FEE_RATE));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    customer: buyerProf?.stripe_customer_id ?? undefined,
    customer_email: buyerProf?.stripe_customer_id ? undefined : user.email ?? undefined,

    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: article.title ?? "Artikel" },
          unit_amount: unitPriceCents,
        },
        quantity: saleType === "gesamt" ? 1 : qty,
      },
      ...(shippingCents > 0
        ? [
            {
              price_data: {
                currency: "eur",
                product_data: { name: "Versand" },
                unit_amount: shippingCents,
              },
              quantity: 1,
            },
          ]
        : []),
    ],

    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: sellerStripeAccount },
      metadata: {
        shop_order_id: order.id,
        article_id: article.id,
        seller_id: article.seller_id,
        buyer_id: user.id,
      },
    },

    metadata: {
      shop_order_id: order.id,
      article_id: article.id,
    },

    success_url: `${baseUrl}/konto/bestellungen?success=1&order=${order.id}`,
    cancel_url: `${baseUrl}/kaufen/artikel/${article.id}?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
