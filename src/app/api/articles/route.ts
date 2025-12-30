export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

    const admin = supabaseAdmin();

    // 1) Artikel holen: promo_score DESC, Rest random
    const { data: articles, error } = await admin
      .from("articles")
      .select(
        "id, title, description, category, sell_to, manufacturer, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, created_at"
      )
      .eq("published", true)
      .eq("sold_out", false)
      .eq("archived", false)
      .order("promo_score", { ascending: false })
      // MVP random für den Rest: wir randomisieren in JS nach dem Fetch für promo_score==0
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2) price_from (Brutto) für diese Artikel ermitteln
    const ids = (articles ?? []).map((a) => a.id);
    let minPriceByArticle: Record<string, { price_from: number | null; unit: "kg" | "stueck" | null }> = {};

    if (ids.length) {
      const { data: tiers, error: tierError } = await admin
        .from("article_price_tiers")
        .select("article_id, unit, price")
        .in("article_id", ids);

      if (tierError) {
        return NextResponse.json({ error: tierError.message }, { status: 500 });
      }

      for (const t of tiers ?? []) {
        const key = t.article_id;
        const price = typeof t.price === "number" ? t.price : Number(t.price);
        const unit = t.unit as "kg" | "stueck";

        const current = minPriceByArticle[key];
        if (!current || current.price_from === null || price < current.price_from) {
          minPriceByArticle[key] = { price_from: price, unit };
        }
      }
    }

    // 3) MVP: promo oben lassen, Rest randomisieren (nur promo_score==0)
    const list = (articles ?? []).map((a: any) => ({
      ...a,
      price_from: minPriceByArticle[a.id]?.price_from ?? null,
      price_unit: minPriceByArticle[a.id]?.unit ?? null,
    }));

    const sponsored = list.filter((a) => (a.promo_score ?? 0) > 0);
    const rest = list.filter((a) => !((a.promo_score ?? 0) > 0));

    // Fisher–Yates shuffle
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    return NextResponse.json({ articles: [...sponsored, ...rest], limit, offset });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
