import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampStars(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await supabaseServer();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const shopOrderId = String(params?.id ?? "").trim();
  if (!shopOrderId) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const stars = clampStars(body?.stars ?? body?.rating);
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 800) : "";

  if (!stars) return NextResponse.json({ error: "INVALID_STARS" }, { status: 400 });

  // Wenn du Kommentar OPTIONAL willst, dann diese Zeile raus:
  if (!comment) return NextResponse.json({ error: "COMMENT_REQUIRED" }, { status: 400 });

  // Shop-Order laden
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .select("id,status,buyer_id,seller_id")
    .eq("id", shopOrderId)
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "ORDER_NOT_FOUND" }, { status: 404 });
  }

  // Nur Buyer oder Seller darf bewerten
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Optional: erst nach Versand (wie du wolltest)
  if (order.status === "paid" || order.status === "payment_pending") {
    return NextResponse.json({ error: "Bewertung erst nach Versand möglich." }, { status: 409 });
  }

  const ratee_id = isBuyer ? order.seller_id : order.buyer_id;

  // 1x pro (shop_order_id + rater_id)
  const { data: existing, error: eErr } = await supabase
    .from("reviews")
    .select("id")
    .eq("shop_order_id", shopOrderId)
    .eq("rater_id", user.id)
    .limit(1);

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Du hast diese Bestellung bereits bewertet." }, { status: 409 });
  }

  // ✅ rating ist ENUM -> als String eintragen (typisch: '1'...'5')
  const ratingEnum = String(stars) as any;

  const { data: created, error: cErr } = await supabase
    .from("reviews")
    .insert({
      shop_order_id: shopOrderId,  // ✅ wichtig
      order_id: null,              // ✅ wichtig (genau-eins-check)
      rater_id: user.id,
      ratee_id,
      comment,
      stars,
      rating: ratingEnum,
    })
    .select("id, shop_order_id, rater_id, ratee_id, stars, comment, created_at")
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  return NextResponse.json({ review: created });
}
