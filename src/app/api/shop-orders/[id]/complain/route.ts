import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: any) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const orderId = String(ctx?.params?.id ?? "");
  if (!orderId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .select("id,status,buyer_id,article_id,unit,qty,stock_adjusted,stock_reverted,released_at,refunded_at")
    .eq("id", orderId)
    .single();

  if (oErr || !order) return NextResponse.json({ error: oErr?.message ?? "ORDER_NOT_FOUND" }, { status: 404 });
  if (order.buyer_id !== user.id) return NextResponse.json({ error: "Nur Käufer darf reklamieren." }, { status: 403 });

  // ❌ Käufer darf NICHT reklamieren, wenn released oder refunded
  if (order.released_at || order.status === "released") {
    return NextResponse.json({ error: "Nicht möglich: Bestellung wurde bereits freigegeben (released)." }, { status: 409 });
  }
  if (order.refunded_at || order.status === "refunded") {
    return NextResponse.json({ error: "Nicht möglich: Bestellung wurde bereits erstattet (refunded)." }, { status: 409 });
  }

  const now = new Date().toISOString();

  // stock_reverted nur setzen, wenn zuvor stock_adjusted=true
  const shouldRestock = !!order.stock_adjusted && !order.stock_reverted;

  const { data: updated, error: uErr } = await supabase
    .from("shop_orders")
    .update({
      status: "refunded",
      refunded_at: now,
      stock_reverted: shouldRestock ? true : order.stock_reverted,
    })
    .eq("id", orderId)
    .select("id,status,refunded_at,article_id,unit,qty,stock_reverted,stock_adjusted")
    .single();

  if (uErr || !updated) return NextResponse.json({ error: uErr?.message ?? "UPDATE_FAILED" }, { status: 500 });

  // ✅ Wenn stock nie abgezogen wurde, nichts restocken – refund bleibt trotzdem gültig
  if (!shouldRestock) {
    return NextResponse.json({ order: updated, restocked: false });
  }

  const { data: art, error: aErr } = await admin
    .from("articles")
    .select("id, qty_kg, qty_piece, published, sold_out")
    .eq("id", updated.article_id)
    .single();

  if (aErr || !art) {
    return NextResponse.json(
      { error: aErr?.message ?? "ARTICLE_NOT_FOUND", warning: "Order refunded, aber Artikel nicht gefunden." },
      { status: 500 }
    );
  }

  const qty = Number(updated.qty ?? 0);
  const unit = updated.unit;

  const patch: any = { published: true, sold_out: false };

  if (unit === "kg") patch.qty_kg = Number(art.qty_kg ?? 0) + qty;
  else patch.qty_piece = Number(art.qty_piece ?? 0) + qty;

  const { error: stockErr } = await admin.from("articles").update(patch).eq("id", art.id);
  if (stockErr) {
    return NextResponse.json(
      { error: stockErr.message, warning: "Order refunded, aber Stock-Update fehlgeschlagen." },
      { status: 500 }
    );
  }

  return NextResponse.json({ order: updated, restocked: true });
}
