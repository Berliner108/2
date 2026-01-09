export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-route";

// ✅ Kategorie-Mapper (wie bei deiner Detail-API)
function normalizeCategory(cat: unknown): string {
  if (cat == null) return "";
  const key = String(cat).trim().toLowerCase();

  const map: Record<string, string> = {
    nasslack: "Nasslack",
    pulverlack: "Pulverlack",
    arbeitsmittel: "Arbeitsmittel",
  };

  return map[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
}

type SaleType = "gesamt" | "pro_kg" | "pro_stueck";
type TierUnit = "kg" | "stueck";

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();

    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });

    const user = sessionRes?.session?.user;
    if (!user) return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });

    // 1) meine Artikel (✅ sale_type dazu, damit Einheit/Staffeln korrekt ermittelt werden können)
    const { data: articles, error: aErr } = await supabase
      .from("articles")
      .select("id, title, category, sale_type, created_at, published, sold_out, archived")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const ids = (articles ?? []).map((a: any) => a.id).filter(Boolean);
    const minPriceById: Record<string, number> = {};
    const tierCountByIdUnit: Record<string, number> = {}; // key: `${id}|${unit}`

    // 2) tiers laden (für min Preis + Staffel-Flag)
    if (ids.length) {
      const { data: tiers, error: tErr } = await supabase
        .from("article_price_tiers")
        .select("article_id, unit, price")
        .in("article_id", ids);

      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

      // Hilfsmap: welche Einheit gilt pro Artikel (abhängig von sale_type / arbeitsmittel)
      const desiredUnitById: Record<string, TierUnit> = {};
      for (const a of articles ?? []) {
        const id = String((a as any).id);
        const catKey = String((a as any).category ?? "").trim().toLowerCase();
        const saleType = String((a as any).sale_type ?? "gesamt") as SaleType;

        // Arbeitsmittel => stueck, sonst abhängig von sale_type
        const unit: TierUnit =
          catKey === "arbeitsmittel" || saleType === "pro_stueck" ? "stueck" : "kg";

        desiredUnitById[id] = unit;
      }

      for (const row of tiers ?? []) {
        const id = String((row as any).article_id);
        const unit = String((row as any).unit ?? "") as TierUnit;
        const p = Number((row as any).price);

        if (!id || (unit !== "kg" && unit !== "stueck")) continue;

        // tier count pro Einheit
        const k = `${id}|${unit}`;
        tierCountByIdUnit[k] = (tierCountByIdUnit[k] ?? 0) + 1;

        // min price NUR für die gewünschte Einheit (pro Artikel)
        const desiredUnit = desiredUnitById[id];
        if (desiredUnit && unit !== desiredUnit) continue;

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

      const id = String(a.id);
      const catKey = String(a.category ?? "").trim().toLowerCase();
      const saleType = String(a.sale_type ?? "gesamt") as SaleType;

      const desiredUnit: TierUnit =
        catKey === "arbeitsmittel" || saleType === "pro_stueck" ? "stueck" : "kg";

      const tierCount = tierCountByIdUnit[`${id}|${desiredUnit}`] ?? 0;

      // ✅ Staffelpreise nur, wenn NICHT "gesamt" und mehr als 1 Tier in der passenden Einheit
      const hasStaffelpreise = saleType !== "gesamt" && tierCount > 1;

      const minPriceEUR = minPriceById[id] ?? 0;

      return {
        id: a.id,
        title: a.title ?? "",
        category: normalizeCategory(a.category), // ✅ sauber formatiert
        createdAtIso: a.created_at ?? null,
        status,
        views: 0, // später: echtes Tracking
        priceCents: Math.round(minPriceEUR * 100),
        hasStaffelpreise, // ✅ für "Preis" vs "Preis ab" im UI
      };
    });

    return NextResponse.json({ articles: mapped }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
