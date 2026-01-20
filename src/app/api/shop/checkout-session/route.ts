// src/app/api/shop/checkout-session/route.ts
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

function pickDisplayName(u: any): string | null {
  if (!u) return null;

  const md = u.user_metadata ?? u.raw_user_meta_data ?? {};
  const id0 = Array.isArray(u.identities) ? u.identities[0]?.identity_data : null;

  const v =
    md.display_name ??
    md.full_name ??
    md.name ??
    md.displayName ??
    md.fullName ??
    id0?.display_name ??
    id0?.full_name ??
    id0?.name ??
    null;

  const direct = v ? String(v).trim() : "";
  if (direct) return direct;

  const first = String(md.firstName ?? md.first_name ?? id0?.firstName ?? id0?.first_name ?? "").trim();
  const last = String(md.lastName ?? md.last_name ?? id0?.lastName ?? id0?.last_name ?? "").trim();

  const composed = `${first} ${last}`.trim();
  return composed ? composed : null;
}

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

  // Buyer Display Name (Admin Auth)
  const { data: buyerAuth, error: buyerAuthErr } = await admin.auth.admin.getUserById(user.id);
  if (buyerAuthErr) console.error("getUserById(buyer) failed:", buyerAuthErr);
  const buyerDisplayName = pickDisplayName(buyerAuth?.user) ?? pickDisplayName(user);

  // 2) body
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.articleId || !body?.tierId || !body?.unit || !body?.qty) {
    return NextResponse.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // 3) article laden (inkl. Bestand)
  const { data: article, error: aErr } = await admin
    .from("articles")
    .select("id, title, owner_id, sale_type, published, sold_out, archived, qty_kg, qty_piece")
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

  const { data: sellerAuth, error: sellerAuthErr } = await admin.auth.admin.getUserById(sellerId);
  if (sellerAuthErr) console.error("getUserById(seller) failed:", sellerAuthErr);
  const sellerDisplayName = pickDisplayName(sellerAuth?.user);

  // 4) tier laden
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

  // (1) qty bestimmen: bei "gesamt" = ganzer Bestand
  let qty: number;
  if (saleType === "gesamt") {
    const available =
      body.unit === "kg" ? Number((article as any).qty_kg ?? 0) : Number((article as any).qty_piece ?? 0);

    if (!Number.isFinite(available) || available <= 0) {
      return NextResponse.json({ error: "Artikel nicht verfügbar (Bestand = 0)." }, { status: 409 });
    }
    qty = available;
  } else {
    qty = Math.max(1, Number(body.qty || 1));
  }

  if (qty < Number(tier.min_qty)) {
    return NextResponse.json({ error: "Menge zu klein." }, { status: 400 });
  }
  if (tier.max_qty != null && qty > Number(tier.max_qty)) {
    return NextResponse.json({ error: "Menge zu groß." }, { status: 400 });
  }

  const unitPriceCents = eurToCents((tier as any).price);
  const shippingCents = eurToCents((tier as any).shipping);

  const totalCents = saleType === "gesamt" ? unitPriceCents + shippingCents : qty * unitPriceCents + shippingCents;

  // 5) profile snapshots
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

  // ✅ (2) "gesamt" sofort reservieren (OHNE stock_status wegen DB-Constraint)
  if (saleType === "gesamt") {
    const now = new Date().toISOString();
    const { error: rErr } = await admin
      .from("articles")
      .update({
        published: false,
        sold_out: true,
        updated_at: now,
      })
      .eq("id", body.articleId)
      .eq("published", true)
      .eq("sold_out", false);

    if (rErr) {
      return NextResponse.json({ error: "Reservierung fehlgeschlagen: " + rErr.message }, { status: 500 });
    }
  }

  // 6) Order anlegen (RLS)
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .insert({
      status: "payment_pending",
      buyer_id: user.id,
      seller_id: sellerId,
      article_id: (article as any).id,

      unit: body.unit,
      qty,
      tier_id: (tier as any).id,
      price_gross_cents: unitPriceCents,
      shipping_gross_cents: shippingCents,
      total_gross_cents: totalCents,

      platform_fee_percent: 0.07,

      buyer_username: buyerSnap.username,
      buyer_account_type: buyerSnap.account_type,
      buyer_company_name: buyerSnap.company_name,
      buyer_vat_number: buyerSnap.vat_number,
      buyer_address: buyerSnap.address,
      buyer_display_name: buyerDisplayName,

      seller_username: sellerSnap.username,
      seller_account_type: sellerSnap.account_type,
      seller_company_name: sellerSnap.company_name,
      seller_vat_number: sellerSnap.vat_number,
      seller_address: sellerSnap.address,
      seller_display_name: sellerDisplayName,
    })
    .select("id")
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "Order konnte nicht erstellt werden." }, { status: 500 });
  }

  // 7) Stripe Checkout Session
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const payload: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: user.email ?? undefined,

    // (3) fallback + leichter zu suchen
    client_reference_id: order.id,

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
      transfer_group: order.id,
      metadata: {
        shop_order_id: order.id,
        article_id: (article as any).id,
        seller_id: sellerId,
        buyer_id: user.id,
      },
    },

    success_url: `${baseUrl}/konto/bestellungen?success=1&order=${order.id}`,

    // ✅ wichtig: orderId an cancel_url anhängen, damit du cancel-reservation aufrufen kannst
    cancel_url: `${baseUrl}/kaufen/artikel/${(article as any).id}?canceled=1&order=${order.id}`,

    metadata: {
      shop_order_id: order.id,
      article_id: (article as any).id,
      seller_id: sellerId,
    },
  };

  const session = await stripe.checkout.sessions.create(payload, {
    idempotencyKey: `shop_order_${order.id}_checkout_session_v1`,
  });

  return NextResponse.json({ url: session.url, orderId: order.id });
}
