import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseServer();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("shop_orders")
    .select(
      [
        "id",
        "created_at",
        "updated_at", // ✅ NEU (wichtig für Event-Zähler)
        "status",
        "unit",
        "qty",
        "price_gross_cents",
        "shipping_gross_cents",
        "total_gross_cents",
        "paid_at",
        "shipped_at",
        "released_at",
        "refunded_at",
        "tracking_number",
        "shipping_carrier",

        "seller_id",
        "seller_username",
        "seller_account_type",
        "seller_company_name",
        "seller_vat_number",
        "seller_address",
        "seller_display_name",
        "article_id",
        "articles ( title )",
      ].join(",")
    )
    .eq("buyer_id", user.id)
    .in("status", ["paid", "shipped", "released", "complaint_open", "refunded"]) // ✅ nur echte Käufe
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}
