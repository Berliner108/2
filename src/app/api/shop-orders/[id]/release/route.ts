import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000;

export async function POST(_req: Request, ctx: { params?: Record<string, string> }) {

  const supabase = await supabaseServer();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const orderId = String(ctx?.params?.id ?? "");
if (!orderId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });


  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .select("id,status,buyer_id,seller_id,shipped_at,released_at,refunded_at")
    .eq("id", orderId)
    .single();

  if (oErr || !order) return NextResponse.json({ error: oErr?.message ?? "ORDER_NOT_FOUND" }, { status: 404 });

  if (order.status !== "shipped") {
    return NextResponse.json({ error: "Freigabe nur möglich, wenn Status = shipped." }, { status: 409 });
  }
  if (order.released_at) return NextResponse.json({ error: "Bereits freigegeben." }, { status: 409 });
  if (order.refunded_at) return NextResponse.json({ error: "Bereits erstattet." }, { status: 409 });

  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  if (!isBuyer && !isSeller) return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });

  if (isSeller) {
    const shippedAtMs = order.shipped_at ? new Date(order.shipped_at).getTime() : 0;
    if (!shippedAtMs) return NextResponse.json({ error: "Kein shipped_at gesetzt." }, { status: 409 });

    if (Date.now() - shippedAtMs < DAYS_28_MS) {
      return NextResponse.json({ error: "Verkäufer-Freigabe erst nach 28 Tagen möglich." }, { status: 403 });
    }
  }

  const now = new Date().toISOString();

  const { data: updated, error: uErr } = await supabase
    .from("shop_orders")
    .update({
      status: "released",
      released_at: now,
    })
    .eq("id", orderId)
    .select("id,status,released_at")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ order: updated });
}
