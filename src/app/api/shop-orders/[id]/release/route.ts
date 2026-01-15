import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000;

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion optional – wenn du willst, setzen wir sie explizit
});

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

  // 2) order laden (wir brauchen Stripe Charge + total + fee)
  const { data: order, error: oErr } = await supabase
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
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "ORDER_NOT_FOUND" }, { status: 404 });
  }

  // final?
  if (order.refunded_at) return NextResponse.json({ error: "Bereits erstattet." }, { status: 409 });

  // idempotent: wenn schon released -> zurückgeben
  if (order.released_at) {
    return NextResponse.json({ order });
  }

  // Release nur wenn shipped
  if (order.status !== "shipped") {
    return NextResponse.json({ error: "Freigabe nur möglich, wenn Status = shipped." }, { status: 409 });
  }

  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  // ✅ Verkäufer erst nach 28 Tagen ab shipped_at
  if (isSeller) {
    const shippedAtMs = order.shipped_at ? new Date(order.shipped_at).getTime() : 0;
    if (!shippedAtMs) {
      return NextResponse.json({ error: "Kein shipped_at gesetzt." }, { status: 409 });
    }
    if (Date.now() - shippedAtMs < DAYS_28_MS) {
      return NextResponse.json({ error: "Verkäufer darf erst nach 28 Tagen freigeben." }, { status: 403 });
    }
  }
  // ✅ Käufer darf sofort nach shipped

  // 3) Payment muss existieren (separate charges -> Charge wurde beim Checkout erzeugt)
  if (!order.stripe_charge_id) {
    return NextResponse.json(
      { error: "Payment noch nicht bestätigt (stripe_charge_id fehlt). Webhook muss zuerst paid setzen." },
      { status: 409 }
    );
  }

  // 4) Seller Connect Account laden (profiles)
  const { data: sellerProf, error: pErr } = await supabase
    .from("profiles")
    .select("stripe_account_id, stripe_connect_id, payouts_enabled, connect_ready")
    .eq("id", order.seller_id)
    .maybeSingle();

  if (pErr || !sellerProf) {
    return NextResponse.json({ error: "Seller-Profil nicht gefunden." }, { status: 500 });
  }

  const destinationAcct =
    (sellerProf as any).stripe_account_id || (sellerProf as any).stripe_connect_id || null;

  if (!destinationAcct) {
    return NextResponse.json({ error: "Verkäufer hat kein Stripe Connect Konto." }, { status: 409 });
  }

  // optional harte Checks:
  if ((sellerProf as any).payouts_enabled !== true) {
    return NextResponse.json({ error: "Payouts beim Verkäufer sind nicht aktiviert." }, { status: 409 });
  }
  if ((sellerProf as any).connect_ready !== true) {
    return NextResponse.json({ error: "Connect beim Verkäufer ist nicht ready." }, { status: 409 });
  }

  // 5) Beträge berechnen
  const totalGrossCents = Number(order.total_gross_cents ?? 0);
  if (!Number.isFinite(totalGrossCents) || totalGrossCents <= 0) {
    return NextResponse.json({ error: "Ungültiger Gesamtbetrag." }, { status: 409 });
  }

  const feeCents = calcPlatformFeeCents(totalGrossCents, order.platform_fee_percent);
  const sellerAmountCents = Math.max(0, totalGrossCents - feeCents);

  if (sellerAmountCents <= 0) {
    return NextResponse.json({ error: "Auszahlungsbetrag ist 0." }, { status: 409 });
  }

  // 6) Transfer idempotent erstellen (falls parallel geklickt)
  // Wenn DB schon transfer_id hat -> ok, wir releasen nur DB.
  let transferId: string | null = order.stripe_transfer_id ?? null;

  if (!transferId) {
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: sellerAmountCents,
          currency: "eur",
          destination: destinationAcct,
          // ✅ separate charges + transfers: nutze source_transaction = Charge
          source_transaction: order.stripe_charge_id,
          metadata: {
            shop_order_id: order.id,
          },
        },
        {
          idempotencyKey: `shop_order_${order.id}_transfer_v1`,
        }
      );
      transferId = transfer.id;
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Stripe Transfer fehlgeschlagen." },
        { status: 502 }
      );
    }
  }

  // 7) DB updaten (released + transfer gespeichert) – mit Schutzbedingungen (idempotent/race-safe)
  const now = new Date().toISOString();

  const { data: updated, error: uErr } = await supabase
    .from("shop_orders")
    .update({
      status: "released",
      released_at: now,
      platform_fee_cents: feeCents,
      stripe_transfer_id: transferId,
      transferred_at: now,
    })
    .eq("id", orderId)
    .eq("status", "shipped")
    .is("released_at", null)
    .is("refunded_at", null)
    .select(
      "id,status,shipped_at,released_at,refunded_at,buyer_id,seller_id,stripe_charge_id,stripe_transfer_id,transferred_at,total_gross_cents,platform_fee_percent,platform_fee_cents"
    )
    .single();

  if (uErr || !updated) {
    // wenn jemand schneller war: aktuellen Stand zurückgeben
    const { data: latest } = await supabase
      .from("shop_orders")
      .select(
        "id,status,shipped_at,released_at,refunded_at,buyer_id,seller_id,stripe_charge_id,stripe_transfer_id,transferred_at,total_gross_cents,platform_fee_percent,platform_fee_cents"
      )
      .eq("id", orderId)
      .single();

    if (latest?.released_at) return NextResponse.json({ order: latest });
    return NextResponse.json({ error: uErr?.message ?? "UPDATE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ order: updated });
}
