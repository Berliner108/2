import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  article_id: string;

  unit: "kg" | "stueck";
  qty: number;

  stock_adjusted: boolean;
  stock_reverted: boolean;

  released_at: string | null;
  refunded_at: string | null;

  total_gross_cents: number;

  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  transferred_at: string | null;
};

type ArticleRow = {
  id: string;
  qty_kg: number | null;
  qty_piece: number | null;
  published: boolean | null;
  sold_out: boolean | null;
};

export async function POST(_req: Request, ctx: any) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const orderId = String(ctx?.params?.id ?? "");
  if (!orderId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  // 1) Order laden (supabaseServer => RLS)
  const { data: orderData, error: oErr } = await supabase
    .from("shop_orders")
    .select(
      [
        "id",
        "status",
        "buyer_id",
        "seller_id",
        "article_id",
        "unit",
        "qty",
        "stock_adjusted",
        "stock_reverted",
        "released_at",
        "refunded_at",
        "total_gross_cents",
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

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Nur Käufer darf reklamieren." }, { status: 403 });
  }

  // 2) Business-Regeln
  if (order.released_at || order.status === "released") {
    return NextResponse.json(
      { error: "Nicht möglich: Bestellung wurde bereits freigegeben (released)." },
      { status: 409 }
    );
  }
  if (order.refunded_at || order.status === "refunded") {
    return NextResponse.json(
      { error: "Nicht möglich: Bestellung wurde bereits erstattet (refunded)." },
      { status: 409 }
    );
  }

  // Escrow: Refund nur solange noch KEIN Transfer passiert ist
  if (order.stripe_transfer_id || order.transferred_at) {
    return NextResponse.json(
      { error: "Nicht möglich: Auszahlung/Transfer wurde bereits durchgeführt." },
      { status: 409 }
    );
  }

  // Stripe Charge muss da sein (Webhook setzt paid + stripe_charge_id)
  if (!order.stripe_charge_id) {
    return NextResponse.json(
      { error: "Zahlung noch nicht bestätigt (stripe_charge_id fehlt). Bitte kurz warten und erneut versuchen." },
      { status: 409 }
    );
  }

  const totalCents = Number(order.total_gross_cents ?? 0);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return NextResponse.json({ error: "Ungültiger Betrag." }, { status: 409 });
  }

  // 3) Stripe: Full refund (idempotent)
  let refundId: string | null = null;
  try {
    const refund = await stripe.refunds.create(
      {
        charge: order.stripe_charge_id,
        amount: totalCents,
        metadata: { shop_order_id: order.id },
      },
      { idempotencyKey: `shop_order_${order.id}_refund_v1` }
    );
    refundId = refund.id;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Stripe Refund fehlgeschlagen." }, { status: 502 });
  }

  // 4) Order DB updaten (refund + optional restock-flag)
  const now = new Date().toISOString();
  const shouldRestock = !!order.stock_adjusted && !order.stock_reverted;

  const { data: updatedData, error: uErr } = await supabase
    .from("shop_orders")
    .update({
      status: "refunded",
      refunded_at: now,
      stock_reverted: shouldRestock ? true : order.stock_reverted,
      updated_at: now,
      // falls du später eine Spalte willst:
      // stripe_refund_id: refundId,
    })
    .eq("id", orderId)
    .is("refunded_at", null)
    .is("released_at", null)
    .select("id,status,refunded_at,article_id,unit,qty,stock_reverted,stock_adjusted")
    .maybeSingle();

  if (uErr) {
    return NextResponse.json(
      { error: uErr.message, warning: "Refund wurde bei Stripe ausgelöst, DB-Update scheiterte." },
      { status: 500 }
    );
  }
  if (!updatedData) {
    return NextResponse.json(
      { error: "UPDATE_FAILED", warning: "Refund wurde bei Stripe ausgelöst, DB-Update lieferte kein Ergebnis." },
      { status: 500 }
    );
  }

  const updated = updatedData as unknown as Pick<
    ShopOrderRow,
    "id" | "status" | "refunded_at" | "article_id" | "unit" | "qty" | "stock_reverted" | "stock_adjusted"
  >;

  // 5) Restock nur wenn stock zuvor abgezogen wurde
  if (!shouldRestock) {
    return NextResponse.json({ order: updated, restocked: false, refundId });
  }

  const { data: artData, error: aErr } = await admin
    .from("articles")
    .select("id, qty_kg, qty_piece, published, sold_out")
    .eq("id", updated.article_id)
    .maybeSingle();

  if (aErr || !artData) {
    return NextResponse.json(
      { order: updated, restocked: false, refundId, warning: aErr?.message ?? "ARTICLE_NOT_FOUND" },
      { status: 200 }
    );
  }

  const art = artData as unknown as ArticleRow;

  const qty = Number(updated.qty ?? 0);
  const unit = updated.unit;

  const patch: any = { published: true, sold_out: false };
  if (unit === "kg") patch.qty_kg = Number(art.qty_kg ?? 0) + qty;
  else patch.qty_piece = Number(art.qty_piece ?? 0) + qty;

  const { error: stockErr } = await admin.from("articles").update(patch).eq("id", art.id);
  if (stockErr) {
    return NextResponse.json(
      {
        order: updated,
        restocked: false,
        refundId,
        warning: "Order refunded, aber Stock-Update fehlgeschlagen: " + stockErr.message,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ order: updated, restocked: true, refundId });
}
