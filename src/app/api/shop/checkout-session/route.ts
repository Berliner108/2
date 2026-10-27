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
  tax_status: string | null;
  address: any | null;
};

type PriceMode = "legacy_gross" | "net" | "no_vat";

function normalizePriceMode(v: unknown): PriceMode {
  const s = String(v ?? "").trim();
  if (s === "net" || s === "no_vat" || s === "legacy_gross") return s;
  return "legacy_gross";
}

function normalizeCountryCode(v: unknown): "DE" | "AT" | "CH" | "LI" | null {
  const s = String(v ?? "").trim().toLowerCase();

  if (s === "de" || s === "deutschland" || s === "germany") return "DE";
  if (s === "at" || s === "österreich" || s === "oesterreich" || s === "austria") return "AT";
  if (s === "ch" || s === "schweiz" || s === "switzerland") return "CH";
  if (s === "li" || s === "liechtenstein") return "LI";

  return null;
}

function standardVatRate(country: "DE" | "AT"): number {
  return country === "DE" ? 0.19 : 0.20;
}

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
    .select(`
  id,
  title,
  description,
  manufacturer,
  category,
  condition,
  sale_type,
  owner_id,
  published,
  sold_out,
  archived,
  qty_kg,
  qty_piece,
  image_urls,
  file_urls,
  color_palette,
  gloss_level,
  surface,
  application,
  color_tone,
  color_code,
  quality,
  effect,
  special_effects,
  certifications,
  charge,
  pieces_per_unit,
  size
`)
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

  const storedUnitPriceCents = eurToCents((tier as any).price);
  const storedShippingCents = eurToCents((tier as any).shipping);

  // 5) profile snapshots
  const [{ data: buyerProf }, { data: sellerProf }] = await Promise.all([
  admin
    .from("profiles")
    .select("username, account_type, company_name, vat_number, tax_status, address")
    .eq("id", user.id)
    .maybeSingle(),

  admin
    .from("profiles")
    .select(`
      username,
      account_type,
      company_name,
      vat_number,
      tax_status,
      address,
      imprint_email,
      imprint_phone,
      imprint_represented_by,
      imprint_legal_form,
      imprint_register_number,
      imprint_register_court,
      imprint_chamber,
      imprint_supervisory_authority
    `)
    .eq("id", sellerId)
    .maybeSingle(),
]);

  const buyerSnap: ProfileSnap = {
    username: (buyerProf as any)?.username ?? null,
    account_type: (buyerProf as any)?.account_type ?? null,
    company_name: (buyerProf as any)?.company_name ?? null,
    vat_number: (buyerProf as any)?.vat_number ?? null,
    tax_status: (buyerProf as any)?.tax_status ?? null,
    address: (buyerProf as any)?.address ?? null,
  };

  const sellerSnap: ProfileSnap = {
    username: (sellerProf as any)?.username ?? null,
    account_type: (sellerProf as any)?.account_type ?? null,
    company_name: (sellerProf as any)?.company_name ?? null,
    vat_number: (sellerProf as any)?.vat_number ?? null,
    tax_status: (sellerProf as any)?.tax_status ?? null,
    address: (sellerProf as any)?.address ?? null,
  };
  const sellerImprintSnapshot = {
  company_name: (sellerProf as any)?.company_name ?? null,
  vat_number: (sellerProf as any)?.vat_number ?? null,
  tax_status: (sellerProf as any)?.tax_status ?? null,
  address: (sellerProf as any)?.address ?? null,
  imprint_email: (sellerProf as any)?.imprint_email ?? null,
  imprint_phone: (sellerProf as any)?.imprint_phone ?? null,
  imprint_represented_by: (sellerProf as any)?.imprint_represented_by ?? null,
  imprint_legal_form: (sellerProf as any)?.imprint_legal_form ?? null,
  imprint_register_number: (sellerProf as any)?.imprint_register_number ?? null,
  imprint_register_court: (sellerProf as any)?.imprint_register_court ?? null,
  imprint_chamber: (sellerProf as any)?.imprint_chamber ?? null,
  imprint_supervisory_authority: (sellerProf as any)?.imprint_supervisory_authority ?? null,
};

  const priceMode = normalizePriceMode((article as any).price_mode);
  const sellerCountry = normalizeCountryCode(sellerSnap.address?.country);
  const buyerCountry = normalizeCountryCode(buyerSnap.address?.country);

  let taxRate: number | null = null;
  let taxCountryCode: "DE" | "AT" | null = null;
  let taxTreatment = "legacy_gross";

  let priceNetCents: number | null = null;
  let shippingNetCents: number | null = null;
  let totalNetCents: number | null = null;
  let vatCents: number | null = null;

  let unitPriceGrossCents = storedUnitPriceCents;
  let shippingGrossCents = storedShippingCents;
  let totalGrossCents =
    saleType === "gesamt"
      ? unitPriceGrossCents + shippingGrossCents
      : qty * unitPriceGrossCents + shippingGrossCents;

  if (priceMode === "no_vat") {
    taxRate = 0;
    taxTreatment = "no_vat";
    priceNetCents = storedUnitPriceCents;
    shippingNetCents = storedShippingCents;
    totalNetCents =
      saleType === "gesamt"
        ? priceNetCents + shippingNetCents
        : qty * priceNetCents + shippingNetCents;
    vatCents = 0;

    unitPriceGrossCents = priceNetCents;
    shippingGrossCents = shippingNetCents;
    totalGrossCents = totalNetCents;
  }

  if (priceMode === "net") {
    if (sellerSnap.tax_status !== "vat_registered") {
      return NextResponse.json(
        { error: "Der Steuerstatus des Verkäufers passt nicht mehr zu diesem Netto-Artikel." },
        { status: 409 }
      );
    }

    if (!sellerCountry || !buyerCountry) {
      return NextResponse.json(
        { error: "Für die Steuerberechnung müssen Verkäufer- und Käuferland vollständig hinterlegt sein." },
        { status: 400 }
      );
    }

    // CH/LI werden bewusst separat behandelt.
    if (sellerCountry === "CH" || sellerCountry === "LI" || buyerCountry === "CH" || buyerCountry === "LI") {
      return NextResponse.json(
        { error: "Käufe mit Schweiz oder Liechtenstein werden steuerlich separat behandelt und sind im automatischen Checkout noch nicht freigeschaltet." },
        { status: 400 }
      );
    }

    // Grenzüberschreitendes B2B DE↔AT mit USt-ID benötigt eine eigene
    // innergemeinschaftliche/VIES-Logik. Bis diese vorhanden ist, nicht automatisch besteuern.
    const crossBorderEuB2B =
      sellerCountry !== buyerCountry &&
      sellerSnap.account_type === "business" &&
      buyerSnap.account_type === "business" &&
      !!sellerSnap.vat_number &&
      !!buyerSnap.vat_number;

    if (crossBorderEuB2B) {
      return NextResponse.json(
        { error: "Grenzüberschreitende B2B-Käufe zwischen Deutschland und Österreich werden steuerlich separat geprüft und sind im automatischen Checkout noch nicht freigeschaltet." },
        { status: 400 }
      );
    }

    if (buyerCountry !== "DE" && buyerCountry !== "AT") {
      return NextResponse.json(
        { error: "Für dieses Käuferland ist noch keine automatische Umsatzsteuerberechnung eingerichtet." },
        { status: 400 }
      );
    }

    taxRate = standardVatRate(buyerCountry);
    taxCountryCode = buyerCountry;
    taxTreatment =
      sellerCountry === buyerCountry
        ? "domestic_standard_rate"
        : "destination_standard_rate";

    priceNetCents = storedUnitPriceCents;
    shippingNetCents = storedShippingCents;

    unitPriceGrossCents = Math.round(priceNetCents * (1 + taxRate));
    shippingGrossCents = Math.round(shippingNetCents * (1 + taxRate));

    totalNetCents =
      saleType === "gesamt"
        ? priceNetCents + shippingNetCents
        : qty * priceNetCents + shippingNetCents;

    totalGrossCents =
      saleType === "gesamt"
        ? unitPriceGrossCents + shippingGrossCents
        : qty * unitPriceGrossCents + shippingGrossCents;

    vatCents = totalGrossCents - totalNetCents;
  }

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
  const articleSnapshot = {
  id: (article as any).id,
  title: (article as any).title ?? null,
  description: (article as any).description ?? null,
  manufacturer: (article as any).manufacturer ?? null,
  category: (article as any).category ?? null,
  condition: (article as any).condition ?? null,
  sale_type: (article as any).sale_type ?? null,
  price_mode: priceMode,

  qty_kg: (article as any).qty_kg ?? null,
  qty_piece: (article as any).qty_piece ?? null,

  image_urls: (article as any).image_urls ?? [],
  file_urls: (article as any).file_urls ?? [],
  color_palette: (article as any).color_palette ?? null,
  gloss_level: (article as any).gloss_level ?? null,
  surface: (article as any).surface ?? null,
  application: (article as any).application ?? null,
  color_tone: (article as any).color_tone ?? null,
  color_code: (article as any).color_code ?? null,
  quality: (article as any).quality ?? null,

  effect: (article as any).effect ?? null,
  special_effects: (article as any).special_effects ?? null,
  certifications: (article as any).certifications ?? null,
  charge: (article as any).charge ?? null,

  pieces_per_unit: (article as any).pieces_per_unit ?? null,
  size: (article as any).size ?? null,

  unit: body.unit,
  qty,
  tier_id: (tier as any).id,
  price_net_cents: priceNetCents,
  shipping_net_cents: shippingNetCents,
  total_net_cents: totalNetCents,
  vat_cents: vatCents,
  tax_rate: taxRate,
  tax_country_code: taxCountryCode,
  tax_treatment: taxTreatment,

  price_gross_cents: unitPriceGrossCents,
  shipping_gross_cents: shippingGrossCents,
  total_gross_cents: totalGrossCents,

  created_at: new Date().toISOString(),
};

  // 6) Order anlegen (RLS)
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .insert({
      status: "payment_pending",
      buyer_id: user.id,
      seller_id: sellerId,
      article_id: (article as any).id,
      article_title: (article as any).title ?? null,
      article_snapshot: articleSnapshot,

      unit: body.unit,
      qty,
      tier_id: (tier as any).id,
      price_mode: priceMode,
      tax_rate: taxRate,
      tax_country_code: taxCountryCode,
      tax_treatment: taxTreatment,
      seller_tax_status: sellerSnap.tax_status,
      buyer_tax_status: buyerSnap.tax_status,

      price_net_cents: priceNetCents,
      shipping_net_cents: shippingNetCents,
      total_net_cents: totalNetCents,
      vat_cents: vatCents,

      price_gross_cents: unitPriceGrossCents,
      shipping_gross_cents: shippingGrossCents,
      total_gross_cents: totalGrossCents,

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
      seller_imprint_snapshot: sellerImprintSnapshot,
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
          unit_amount: totalGrossCents,
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
    cancel_url: `${baseUrl}/kaufen/cancel?canceled=1&order=${order.id}&article=${(article as any).id}`,


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
