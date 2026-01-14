import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params?: Record<string, string> }) {

  const supabase = await supabaseServer();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const orderId = String(ctx?.params?.id ?? "");
if (!orderId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });


  const body = await req.json().catch(() => ({}));
  const tracking_number = typeof body?.tracking_number === "string" ? body.tracking_number.trim() : null;
  const shipping_carrier = typeof body?.shipping_carrier === "string" ? body.shipping_carrier.trim() : null;

  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .select("id,status,seller_id")
    .eq("id", orderId)
    .single();

  if (oErr || !order) {
    return NextResponse.json({ error: oErr?.message ?? "ORDER_NOT_FOUND" }, { status: 404 });
  }

  if (order.seller_id !== user.id) {
    return NextResponse.json({ error: "Nur Verkäufer darf Versand melden." }, { status: 403 });
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "Versand nur möglich, wenn Status = paid." }, { status: 409 });
  }

  const now = new Date().toISOString();

  const { data: updated, error: uErr } = await supabase
    .from("shop_orders")
    .update({
      status: "shipped",
      shipped_at: now,
      tracking_number,
      shipping_carrier,
    })
    .eq("id", orderId)
    .select("id,status,shipped_at,tracking_number,shipping_carrier")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
  return NextResponse.json({ order: updated });
}
