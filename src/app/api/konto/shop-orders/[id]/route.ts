import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type ShopOrderDetail = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  status: string | null;
  unit: "kg" | "stueck" | null;
  qty: number | null;
  price_gross_cents: number | null;
  shipping_gross_cents: number | null;
  total_gross_cents: number | null;
  paid_at: string | null;
  shipped_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;

  buyer_id: string;
  buyer_username: string | null;
  buyer_account_type: string | null;
  buyer_company_name: string | null;
  buyer_vat_number: string | null;
  buyer_address: any | null;
  buyer_display_name: string | null;

  seller_id: string;
  seller_username: string | null;
  seller_account_type: string | null;
  seller_company_name: string | null;
  seller_vat_number: string | null;
  seller_address: any | null;
  seller_display_name: string | null;

  article_id: string;
  article_title: string | null;
  article_snapshot: any | null;
  articles?: { title: string | null } | { title: string | null }[] | null;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await supabaseServer();
  const { id } = await context.params;

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const user = auth?.user;

  if (authErr || !user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: "Bestell-ID fehlt." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shop_orders")
    .select(
      [
        "id",
        "created_at",
        "updated_at",
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

        "seller_id",
        "seller_username",
        "seller_account_type",
        "seller_company_name",
        "seller_vat_number",
        "seller_address",
        "seller_display_name",
        "seller_imprint_snapshot",        

        "article_id",
        "article_title",
        "article_snapshot",
        "articles ( title )",
      ].join(",")
    )
    .eq("id", id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const order = data as ShopOrderDetail | null;

  if (!order) {
    return NextResponse.json(
      { error: "Bestellung nicht gefunden oder kein Zugriff." },
      { status: 404 }
    );
  }

  const role =
    order.buyer_id === user.id
      ? "buyer"
      : order.seller_id === user.id
        ? "seller"
        : "none";

  return NextResponse.json({ order, role });
}