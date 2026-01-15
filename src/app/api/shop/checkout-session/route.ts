import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: "2024-06-20", // optional, wenn du fix pinnen willst
});

type Body = {
  articleId: string;
  tierId?: string; // optional: wir können notfalls auch ohne tierId ein Tier suchen
  unit: "kg" | "stueck";
  qty: number;
};

const eurToCents = (v: any) => Math.round(Number(v ?? 0) * 100);

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // 1) auth (RLS-User nur für Auth)
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  // 2) body
  const body = (await req.json().catch(() => null)) as Body | null;
  if (
    !body ||
    typeof body.articleId !== "string" ||
    !body.articleId ||
    (body.tierId != null && typeof body.tierId !== "string") ||
    (body.unit !== "kg" && body.unit !== "stueck") ||
    typeof body.qty !== "number"
  ) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // 3) Artikel laden (ADMIN => kein RLS-„Artikel nicht gefunden“)
  const { data: article, error: aErr } = await admin
    .from("articles")
    .select("id, title, seller_id, sale_type")
    .eq("id", body.articleId)
    .maybeSingle();

  if (aErr || !article) {
    return NextResponse.json({ error: "Artikel nicht gefunden." }, { status: 404 });
  }

  if (article.seller_id === user.id) {
    return NextResponse.json(
      { error: "Du kannst nicht deinen eigenen Artikel kaufen." },
      { status: 400 }
    );
  }

  // 4) qty normalisieren
  const qty = article.sale_type === "gesamt" ? 1 : Math.max(1, Math.floor(body.qty || 1));

  // 5) Tier laden (ADMIN => kein RLS-„Preisstaffel nicht gefunden“)
  //    a) wenn tierId mitkommt: genau diesen Tier holen
  //    b) sonst: passend zum qty/unit suchen
  let tierRow: any | null = null;

  if (body.tierId) {
    const { data: tier, error: tErr } = await admin
      .from("article_price_tiers")
      .select("id, unit, min_qty, max_qty, price, shipping")
      .eq("id", body.tierId)
      .eq("article_id", body.articleId)
      .maybeSingle();

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }
    tierRow = tier ?? null;
  } else {
    const { data: tiers, error: tErr } = await admin
      .from("article_price_tiers")
      .select("id, unit, min_qty, max_qty, price, shipping")
      .eq("article_id", body.articleId)
      .eq("unit", body.unit)
      .order("min_qty", { ascending: true });

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    const list = Array.isArray(tiers) ? tiers : [];
    // finde Tier passend zu qty, sonst nimm den letzten als fallback
    tierRow =
      list.find((t) => {
        const min = Number(t.min_qty);
        const max = t.max_qty == null ? null : Number(t.max_qty);
        return qty >= min && (max == null || qty <= max);
      }) ?? (list.length ? list[list.length - 1] : null);
  }

  if (!tierRow) {
    return NextResponse.json(
      { error: "Preisstaffel nicht gefunden (Artikel hat evtl. keine Preisstaffeln)." },
      { status: 409 }
    );
  }

  // Einheit muss passen
  const unit = body.unit;
  if (tierRow.unit !== unit) {
    return NextResponse.json({ error: "Falsche Einheit." }, { status: 400 });
  }

  // Menge in Range?
  if (qty < Number(tierRow.min_qty)) {
    return NextResponse.json({ error: "Menge zu klein." }, { status: 400 });
  }
  if (tierRow.max_qty != null && qty > Number(tierRow.max_qty)) {
    return NextResponse.json({ error: "Menge zu groß." }, { status: 400 });
  }

  // 6) Preisberechnung (Brutto)
  const unitPriceCents = eurToCents(tierRow.price);
  const shippingCents = eurToCents(tierRow.shipping);

  const totalCents =
    article.sale_type === "gesamt"
      ? unitPriceCents + shippingCents
      : qty * unitPriceCents + shippingCents;

  // 7) Snapshots aus profiles (damit /konto/bestellungen alles “durchreichen” kann)
  const [{ data: buyerProf }, { data: sellerProf }] = await Promise.all([
    admin
      .from("profiles")
      .select("username, account_type, company_name, vat_number, address, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("profiles")
      .select("username, account_type, company_name, vat_number, address, stripe_account_id, stripe_connect_id, payouts_enabled")
      .eq("id", article.seller_id)
      .maybeSingle(),
  ]);

  // 8) Order anlegen
  const { data: order, error: oErr } = await admin
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

      // Snapshots Buyer
      buyer_username: buyerProf?.username ?? null,
      buyer_account_type: buyerProf?.account_type ?? null,
      buyer_company_name: buyerProf?.company_name ?? null,
      buyer_vat_number: buyerProf?.vat_number ?? null,
      buyer_address: buyerProf?.address ?? null,

      // Snapshots Seller
      seller_username: sellerProf?.username ?? null,
      seller_account_type: sellerProf?.account_type ?? null,
      seller_company_name: sellerProf?.company_name ?? null,
      seller_vat_number: sellerProf?.vat_number ?? null,
      seller_address: sellerProf?.address ?? null,
    })
    .select("id")
    .single();

  if (oErr || !order) {
    return NextResponse.json(
      { error: oErr?.message ?? "Order konnte nicht erstellt werden." },
      { status: 500 }
    );
  }

  // 9) Stripe Checkout Session (noch ohne Connect-Destination — das machen wir im Webhook/Connect-Step)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SITE_URL fehlt in .env" },
      { status: 500 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: article.title ?? "Artikel" },
          unit_amount: totalCents, // wir rechnen total inkl. Versand als 1 Position
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
