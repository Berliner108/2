import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plattform-Fee: 7%
const PLATFORM_FEE_RATE = 0.07;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
  const admin = supabaseAdmin();

  // 1) auth
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  // 2) body
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.articleId || !body?.tierId || !body?.unit) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // 3) article laden (ADMIN -> RLS-sicher)
  const { data: article, error: aErr } = await admin
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

  // 4) tier laden (ADMIN -> RLS-sicher)
  const { data: tier, error: tErr } = await admin
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

  const itemsTotalCents = article.sale_type === "gesamt" ? unitPriceCents : qty * unitPriceCents;
  const totalCents = itemsTotalCents + shippingCents;

  // 5) profiles laden (Snapshots + Connect Destination)
  const { data: sellerProf, error: spErr } = await admin
    .from("profiles")
    .select(
      "id, username, account_type, company_name, vat_number, address, stripe_account_id, stripe_connect_id, payouts_enabled, connect_ready"
    )
    .eq("id", article.seller_id)
    .maybeSingle();

  if (spErr || !sellerProf) {
    return NextResponse.json({ error: "Verkäuferprofil nicht gefunden." }, { status: 409 });
  }

  const sellerStripeAccount =
    (sellerProf as any).stripe_account_id || (sellerProf as any).stripe_connect_id;

  if (!sellerStripeAccount) {
    return NextResponse.json(
      { error: "Verkäufer hat kein Stripe-Connect Konto hinterlegt." },
      { status: 409 }
    );
  }

  // optional streng: nur wenn connect_ready true
  if (sellerProf.connect_ready === false) {
    return NextResponse.json(
      { error: "Verkäufer ist für Auszahlungen noch nicht bereit (connect_ready=false)." },
      { status: 409 }
    );
  }

  const { data: buyerProf } = await admin
    .from("profiles")
    .select("id, username, account_type, company_name, vat_number, address, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  // 6) Order anlegen (USER-client -> RLS Insert-Policy bleibt sauber)
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

  // 7) Stripe Checkout Session (Connect Destination Charge)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const feeCents = Math.max(0, Math.round(totalCents * PLATFORM_FEE_RATE));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",

    // wenn du customers nutzt: besser customer setzen
    customer: buyerProf?.stripe_customer_id ?? undefined,
    customer_email: buyerProf?.stripe_customer_id ? undefined : user.email ?? undefined,

    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: article.title ?? "Artikel" },
          unit_amount: article.sale_type === "gesamt" ? unitPriceCents : unitPriceCents,
        },
        quantity: article.sale_type === "gesamt" ? 1 : qty,
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
      transfer_data: {
        destination: sellerStripeAccount,
      },
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
