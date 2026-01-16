import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

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

        "buyer_id",
        "buyer_username",
        "buyer_account_type",
        "buyer_company_name",
        "buyer_vat_number",
        "buyer_address",
        "buyer_display_name",

        "article_id",
        "articles ( title )",
      ].join(",")
    )
    .eq("seller_id", user.id)
    .in("status", ["paid", "shipped", "released", "complaint_open", "refunded"]) // ✅ nur echte Käufe/Verkäufe (kein payment_pending)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const orders = (data ?? []).map((o: any) => {
    const shippedAtMs = o.shipped_at ? new Date(o.shipped_at).getTime() : null;

    const sellerCanRelease =
      o.status === "shipped" &&
      !o.released_at &&
      !o.refunded_at &&
      shippedAtMs !== null &&
      now >= shippedAtMs + 28 * DAY_MS;

    return { ...o, sellerCanRelease };
  });

  return NextResponse.json({ orders });
}
