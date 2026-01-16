import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type Body = {
  articleId: string;
  tierId: string;
  unit: "kg" | "stueck";
  qty: number;
};

const eurToCents = (v: any) => Math.round(Number(v ?? 0) * 100);

type ProfileSnap = {
  username: string | null;
  account_type: string | null;
  company_name: string | null;
  vat_number: string | null;
  address: any | null;
  
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
  const buyerDisplayName =
  (user.user_metadata as any)?.display_name ??
  (user.user_metadata as any)?.full_name ??
  (user.user_metadata as any)?.name ??
  null;


  // 2) body
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.articleId || !body?.tierId || !body?.unit || !body?.qty) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // 3) article laden (bei dir Verkäufer = owner_id)
  const { data: article, error: aErr } = await admin
    .from("articles")
    .select("id, title, owner_id, sale_type, published, sold_out, archived")
    .eq("id", body.articleId)
    .maybeSingle();

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!article) return NextResponse.json({ error: "Artikel nicht gefunden." }, { status: 404 });

  if (article.published === false || article.sold_out === true || article.archived === true) {
    return NextResponse.json({ error: "Artikel nicht kaufbar." }, { status: 409 });
  }

  const sellerId = String((article as any).owner_id ?? "");
  if (!sellerId) {
    return NextResponse.json({ error: "Artikel hat keinen Verkäufer (owner_id fehlt)." }, { status: 500 });
  }
  if (sellerId === user.id) {
    return NextResponse.json({ error: "Du kannst nicht deinen eigenen Artikel kaufen." }, { status: 400 });
  }
  const { data: sellerAuth } = await admin.auth.admin.getUserById(sellerId);

const sellerDisplayName =
  (sellerAuth?.user?.user_metadata as any)?.display_name ??
  (sellerAuth?.user?.user_metadata as any)?.full_name ??
  (sellerAuth?.user?.user_metadata as any)?.name ??
  null;


  // 4) tier laden (ADMIN: RLS-sicher)
  const { data: tier, error: tErr } = await admin
    .from("article_price_tiers")
    .select("id, unit, min_qty, max_qty, price, shipping")
    .eq("id", body.tierId)
    .eq("article_id", body.articleId)
    .maybeSingle();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tier) return NextResponse.json({ error: "Preisstaffel nicht gefunden." }, { status: 400 });

  if (tier.unit !== body.unit) {
    return NextResponse.json({ error: "Falsche Einheit." }, { status: 400 });
  }

  const saleType = String((article as any).sale_type ?? "");
  const qty = saleType === "gesamt" ? 1 : Math.max(1, Number(body.qty || 1));

  if (qty < Number(tier.min_qty)) {
    return NextResponse.json({ error: "Menge zu klein." }, { status: 400 });
  }
  if (tier.max_qty != null && qty > Number(tier.max_qty)) {
    return NextResponse.json({ error: "Menge zu groß." }, { status: 400 });
  }

  const unitPriceCents = eurToCents((tier as any).price);
  const shippingCents = eurToCents((tier as any).shipping);

  const totalCents =
    saleType === "gesamt"
      ? unitPriceCents + shippingCents
      : qty * unitPriceCents + shippingCents;

  // 5) Snapshots aus profiles holen (ADMIN: stabil)
  const [{ data: buyerProf }, { data: sellerProf }] = await Promise.all([
    admin.from("profiles").select("username, account_type, company_name, vat_number, address").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("username, account_type, company_name, vat_number, address").eq("id", sellerId).maybeSingle(),
  ]);

  const buyerSnap: ProfileSnap = {
    username: (buyerProf as any)?.username ?? null,
    account_type: (buyerProf as any)?.account_type ?? null,
    company_name: (buyerProf as any)?.company_name ?? null,
    vat_number: (buyerProf as any)?.vat_number ?? null,
    address: (buyerProf as any)?.address ?? null,
  };

  const sellerSnap: ProfileSnap = {
    username: (sellerProf as any)?.username ?? null,
    account_type: (sellerProf as any)?.account_type ?? null,
    company_name: (sellerProf as any)?.company_name ?? null,
    vat_number: (sellerProf as any)?.vat_number ?? null,
    address: (sellerProf as any)?.address ?? null,
  };

  // 6) Order anlegen (supabaseServer -> RLS greift)
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .insert({
      status: "payment_pending",
      buyer_id: user.id,
      seller_id: sellerId,
      article_id: (article as any).id,

      unit: body.unit,
      qty,
      tier_id: (tier as any).id,           // ✅ WICHTIG
      price_gross_cents: unitPriceCents,
      shipping_gross_cents: shippingCents,
      total_gross_cents: totalCents,

      platform_fee_percent: 0.07,          // ✅ WICHTIG (7% erst bei Release relevant)

      // buyer snapshots
      buyer_username: buyerSnap.username,
      buyer_account_type: buyerSnap.account_type,
      buyer_company_name: buyerSnap.company_name,
      buyer_vat_number: buyerSnap.vat_number,
      buyer_address: buyerSnap.address,
      buyer_display_name: buyerDisplayName,
      seller_display_name: sellerDisplayName,


      // seller snapshots
      seller_username: sellerSnap.username,
      seller_account_type: sellerSnap.account_type,
      seller_company_name: sellerSnap.company_name,
      seller_vat_number: sellerSnap.vat_number,
      seller_address: sellerSnap.address,
    })
    .select("id")
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "Order konnte nicht erstellt werden." }, { status: 500 });
  }

  // 7) Stripe Checkout Session (keine Transfers hier! escrow)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: (article as any).title ?? "Artikel" },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],

    payment_intent_data: {
      transfer_group: order.id, // ✅ für spätere Transfers
      metadata: {
        shop_order_id: order.id,
        article_id: (article as any).id,
        seller_id: sellerId,    // ✅ FIX (nicht article.seller_id)
        buyer_id: user.id,
      },
    },

    success_url: `${baseUrl}/konto/bestellungen?success=1&order=${order.id}`,
    cancel_url: `${baseUrl}/kaufen/artikel/${(article as any).id}?canceled=1`,

    metadata: {
      shop_order_id: order.id,
      article_id: (article as any).id,
      seller_id: sellerId,
    },
  });

  return NextResponse.json({ url: session.url });
}
