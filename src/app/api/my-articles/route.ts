export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-route";

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });

    const user = sessionRes?.session?.user;
    if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

    // 1) Eigene Artikel laden
    const { data: articles, error } = await supabase
      .from("articles")
      .select(
        "id, title, category, condition, manufacturer, promo_score, published, sold_out, archived, created_at, sale_type, stock_status, qty_kg, qty_piece, image_urls"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (articles ?? []).map((a: any) => a.id);

    // 2) Min-Preis pro Artikel (aus article_price_tiers) holen
    const minPriceByArticle: Record<string, { price_from: number | null; unit: "kg" | "stueck" | null }> = {};

    if (ids.length) {
      const { data: tiers, error: tierErr } = await supabase
        .from("article_price_tiers")
        .select("article_id, unit, price")
        .in("article_id", ids);

      if (tierErr) return NextResponse.json({ error: tierErr.message }, { status: 500 });

      for (const t of tiers ?? []) {
        const key = String((t as any).article_id);
        const price = safeNumber((t as any).price, NaN);
        if (!Number.isFinite(price)) continue;

        const unit = (t as any).unit as "kg" | "stueck";
        const curr = minPriceByArticle[key];
        if (!curr || curr.price_from === null || price < curr.price_from) {
          minPriceByArticle[key] = { price_from: price, unit };
        }
      }
    }

    const list = (articles ?? []).map((a: any) => ({
      ...a,
      price_from: minPriceByArticle[String(a.id)]?.price_from ?? null,
      price_unit: minPriceByArticle[String(a.id)]?.unit ?? null,
    }));

    return NextResponse.json({ articles: list, limit, offset }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
