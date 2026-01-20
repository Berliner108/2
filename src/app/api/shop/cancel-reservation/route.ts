// src/app/api/shop/cancel-reservation/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authErr || !user) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ error: "MISSING_ORDER_ID" }, { status: 400 });

  // Order laden (RLS)
  const { data: order, error: oErr } = await supabase
    .from("shop_orders")
    .select("id,status,buyer_id,article_id,paid_at")
    .eq("id", orderId)
    .maybeSingle();

  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });
  if (!order) return NextResponse.json({ error: "ORDER_NOT_FOUND" }, { status: 404 });

  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Nur Käufer darf stornieren." }, { status: 403 });
  }

  // Wenn schon bezahlt -> NICHT freigeben
  if (order.paid_at || order.status === "paid") {
    return NextResponse.json({ ok: true, skipped: "already_paid" });
  }

  if (!order.article_id) return NextResponse.json({ ok: true, skipped: "missing_article_id" });

  // Artikel laden (Admin) um sale_type zu prüfen
  const { data: art, error: aErr } = await admin
    .from("articles")
    .select("id,sale_type")
    .eq("id", order.article_id)
    .maybeSingle();

  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!art) return NextResponse.json({ ok: true, skipped: "article_not_found" });

  // Nur bei "gesamt" reservieren wir über published/sold_out
  if (String((art as any).sale_type ?? "") !== "gesamt") {
    return NextResponse.json({ ok: true, skipped: "not_gesamt" });
  }

  const now = new Date().toISOString();

  // Reservierung aufheben
  const { error: uErr } = await admin
    .from("articles")
    .update({
      published: true,
      sold_out: false,
      updated_at: now,
    })
    .eq("id", art.id);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, unreserved: true });
}
