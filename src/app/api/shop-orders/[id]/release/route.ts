import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type ShopOrderStatus =
  | "payment_pending"
  | "paid"
  | "shipped"
  | "released"
  | "complaint_open"
  | "refunded";

type ShopOrderRow = {
  id: string;
  status: ShopOrderStatus;

  buyer_id: string;
  seller_id: string;

  shipped_at: string | null;
  released_at: string | null;
  refunded_at: string | null;

  total_gross_cents: number;
  platform_fee_percent: number | null;
  platform_fee_cents: number | null;

  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  transferred_at: string | null;
};

type SellerProfileRow = {
  stripe_account_id: string | null;
  stripe_connect_id: string | null;
  payouts_enabled: boolean | null;
  connect_ready: boolean | null;
};

function calcPlatformFeeCents(totalGrossCents: number, platformFeePercent: number | null) {
  const pct = typeof platformFeePercent === "number" ? platformFeePercent : Number(platformFeePercent ?? 0);
  // pct ist bei dir z.B. 0.07
  const fee = Math.round(totalGrossCents * pct);
  return Math.max(0, fee);
}

export async function POST(_req: Request, ctx: any) {
  const supabase = await supabaseServer();

  // 1) auth
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const orderId = String(ctx?.params?.id ?? "");
  if (!orderId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  // 2) Order laden
  const { data: orderData, error: oErr } = await supabase
    .from("shop_orders")
    .select(
      [
        "id",
        "status",
        "buyer_id",
        "seller_id",
        "shipped_at",
        "released_at",
        "refunded_at",
        "total_gross_cents",
        "platform_fee_percent",
        "platform_fee_cents",
        "stripe_charge_id",
        "stripe_transfer_id",
        "transferred_at",
      ].join(",")
    )
    .eq("id", orderId)
    .maybeSingle();

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  if (!orderData) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  const order = orderData as unknown as ShopOrderRow;

  // 3) Berechtigung
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  // 4) Final/Idempotenz
  if (order.refunded_at || order.status === "refunded") {
    return NextResponse.json({ error: "Bereits erstattet." }, { status: 409 });
  }
  if (order.released_at || order.status === "released") {
    return NextResponse.json({ order }); // idempotent ok
  }

  // Escrow: wenn Transfer schon da ist -> nicht nochmal
  if (order.stripe_transfer_id || order.transferred_at) {
    return NextResponse.json({ error: "Transfer wurde bereits durchgeführt." }, { status: 409 });
  }

  // 5) Release nur wenn shipped
  if (order.status !== "shipped") {
    return NextResponse.json({ error: "Freigabe nur möglich, wenn Status = shipped." }, { status: 409 });
  }

  // Verkäufer erst nach 28 Tagen ab shipped_at
  if (isSeller) {
    const shippedAtMs = order.shipped_at ? new Date(order.shipped_at).getTime() : 0;
    if (!shippedAtMs) return NextResponse.json({ error: "Kein shipped_at gesetzt." }, { status: 409 });
    if (Date.now() - shippedAtMs < DAYS_28_MS) {
      return NextResponse.json({ error: "Verkäufer darf erst nach 28 Tagen freigeben." }, { status: 403 });
    }
  }

  // 6) Payment muss bestätigt sein (Webhook muss stripe_charge_id setzen)
  if (!order.stripe_charge_id) {
    return NextResponse.json(
      { error: "Payment noch nicht bestätigt (stripe_charge_id fehlt). Webhook muss zuerst paid setzen." },
      { status: 409 }
    );
  }

  // 7) Seller Connect Account laden
  const { data: sellerProfData, error: pErr } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_connect_id, payouts_enabled, connect_ready")
    .eq("id", order.seller_id)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!sellerProfData) return NextResponse.json({ error: "Seller-Profil nicht gefunden." }, { status: 500 });

  const sellerProf = sellerProfData as unknown as SellerProfileRow;

  const destinationAcct = sellerProf.stripe_account_id || sellerProf.stripe_connect_id || null;
  if (!destinationAcct) {
    return NextResponse.json({ error: "Verkäufer hat kein Stripe Connect Konto." }, { status: 409 });
  }

  if (sellerProf.payouts_enabled !== true) {
    return NextResponse.json({ error: "Payouts beim Verkäufer sind nicht aktiviert." }, { status: 409 });
  }
  if (sellerProf.connect_ready !== true) {
    return NextResponse.json({ error: "Connect beim Verkäufer ist nicht ready." }, { status: 409 });
  }

  // 8) Beträge
  const totalGrossCents = Number(order.total_gross_cents ?? 0);
  if (!Number.isFinite(totalGrossCents) || totalGrossCents <= 0) {
    return NextResponse.json({ error: "Ungültiger Gesamtbetrag." }, { status: 409 });
  }

  const feeCents = calcPlatformFeeCents(totalGrossCents, order.platform_fee_percent);
  const sellerAmountCents = Math.max(0, totalGrossCents - feeCents);
  if (sellerAmountCents <= 0) {
    return NextResponse.json({ error: "Auszahlungsbetrag ist 0." }, { status: 409 });
  }

  // 9) Stripe Transfer (separate charges + delayed transfer)
  let transferId: string;
  try {
    const transfer = await stripe.transfers.create(
      {
        amount: sellerAmountCents,
        currency: "eur",
        destination: destinationAcct,
        source_transaction: order.stripe_charge_id, // ✅ escrow -> nimmt Charge als Quelle
        metadata: { shop_order_id: order.id },
      },
      { idempotencyKey: `shop_order_${order.id}_transfer_v1` }
    );
    transferId = transfer.id;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Stripe Transfer fehlgeschlagen." }, { status: 502 });
  }

  // 10) DB Update (race-safe)
  const now = new Date().toISOString();

  const { data: updatedData, error: uErr } = await supabase
    .from("shop_orders")
    .update({
      status: "released",
      released_at: now,
      platform_fee_cents: feeCents,
      stripe_transfer_id: transferId,
      transferred_at: now,
      updated_at: now,
    })
    .eq("id", orderId)
    .eq("status", "shipped")
    .is("released_at", null)
    .is("refunded_at", null)
    .is("stripe_transfer_id", null)
    .select(
      "id,status,shipped_at,released_at,refunded_at,buyer_id,seller_id,stripe_charge_id,stripe_transfer_id,transferred_at,total_gross_cents,platform_fee_percent,platform_fee_cents"
    )
    .maybeSingle();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  // Falls jemand schneller war: aktuellen Stand zurückgeben
  if (!updatedData) {
    const { data: latest } = await supabase
      .from("shop_orders")
      .select(
        "id,status,shipped_at,released_at,refunded_at,buyer_id,seller_id,stripe_charge_id,stripe_transfer_id,transferred_at,total_gross_cents,platform_fee_percent,platform_fee_cents"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (latest && (latest as any).released_at) return NextResponse.json({ order: latest });
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ order: updatedData });
}
