export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-route";

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });

    const user = sessionRes?.session?.user;
    if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

    // 1) meine Artikel
    const { data: articles, error: aErr } = await supabase
      .from("articles")
      .select("id, title, category, created_at, published, sold_out, archived")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const ids = (articles ?? []).map((a) => a.id);
    let minPriceById: Record<string, number> = {};

    // 2) min price_from (aus tiers) -> für Liste (brutto)
    if (ids.length) {
      const { data: tiers, error: tErr } = await supabase
        .from("article_price_tiers")
        .select("article_id, price")
        .in("article_id", ids);

      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

      for (const row of tiers ?? []) {
        const id = String((row as any).article_id);
        const p = Number((row as any).price);
        if (!Number.isFinite(p)) continue;
        if (minPriceById[id] == null || p < minPriceById[id]) minPriceById[id] = p;
      }
    }

    // 3) Response in „List-Format“
    const mapped = (articles ?? []).map((a: any) => {
      const soldOut = !!a.sold_out;
      const archived = !!a.archived;
      const published = !!a.published;

      const status: "aktiv" | "pausiert" | "verkauft" =
        soldOut ? "verkauft" : archived || !published ? "pausiert" : "aktiv";

      const minPriceEUR = minPriceById[String(a.id)] ?? 0;

      return {
        id: a.id,
        title: a.title ?? "",
        category: a.category ?? "",
        createdAtIso: a.created_at ?? null,
        status,
        views: 0, // später: echtes Tracking
        priceCents: Math.round(minPriceEUR * 100),
      };
    });

    return NextResponse.json({ articles: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
