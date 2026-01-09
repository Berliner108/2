export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getBerlinTodayISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function parseISODateToUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function formatUTCToISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addBusinessDaysISO(startISO: string, businessDays: number, holidays: Set<string>): string {
  if (!businessDays || businessDays <= 0) return startISO;

  let remaining = businessDays;
  let cur = parseISODateToUTC(startISO);

  while (remaining > 0) {
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    const iso = formatUTCToISODate(cur);
    const dow = cur.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidays.has(iso);
    if (!isWeekend && !isHoliday) remaining--;
  }

  return formatUTCToISODate(cur);
}

function normalizeCategory(cat: unknown): string | null {
  if (cat == null) return null;
  const key = String(cat).trim().toLowerCase();
  const map: Record<string, string> = {
    nasslack: "Nasslack",
    pulverlack: "Pulverlack",
    arbeitsmittel: "Arbeitsmittel",
  };
  return map[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : null);
}

// macht "matt" -> "Matt", "glatt matt" -> "Glatt matt"
function cap1(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 12), 1), 50);
    const gesponsert = String(url.searchParams.get("gesponsert") ?? "").toLowerCase() === "true";

    const admin = supabaseAdmin();

    // 1) Artikel holen
    let q = admin
      .from("articles")
      .select(
        "id, title, category, manufacturer, condition, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, sale_type, created_at, surface, application"
      )
      .eq("published", true)
      .eq("sold_out", false)
      .eq("archived", false);

    if (gesponsert) q = q.gt("promo_score", 0);

    const { data: articles, error: aErr } = await q
      .order("promo_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const list = articles ?? [];
    const ids = list.map((a: any) => a.id).filter(Boolean);

    // 2) Preisstaffeln für alle IDs holen -> price_from + price_unit + price_is_from
    const tiersByArticle: Record<string, { unit: "kg" | "stueck"; price: number }[]> = {};

    if (ids.length) {
      const { data: tiers, error: tErr } = await admin
        .from("article_price_tiers")
        .select("article_id, unit, price")
        .in("article_id", ids);

      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

      for (const row of tiers ?? []) {
        const aid = String((row as any).article_id);
        const unit = (row as any).unit as "kg" | "stueck";
        const price = Number((row as any).price);
        if (!aid || (unit !== "kg" && unit !== "stueck") || !Number.isFinite(price)) continue;
        (tiersByArticle[aid] ||= []).push({ unit, price });
      }
    }

    // 3) delivery_date_iso wie im Shop (einmal Holidays holen)
    const todayISO = getBerlinTodayISO();
    const maxDeliveryDays = list.reduce((m: number, a: any) => {
      const d = Number(a.delivery_days ?? 0) || 0;
      return Math.max(m, d);
    }, 0);

    const endDate = new Date(
      parseISODateToUTC(todayISO).getTime() + (maxDeliveryDays + 40) * 24 * 60 * 60 * 1000
    );
    const endISO = formatUTCToISODate(endDate);

    const { data: holidayRows, error: hErr } = await admin
      .from("delivery_holidays")
      .select("holiday_date")
      .gte("holiday_date", todayISO)
      .lte("holiday_date", endISO);

    if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

    const holidaySet = new Set<string>((holidayRows ?? []).map((h: any) => h.holiday_date));

    const items = list.map((a: any) => {
      const dDays = Number(a.delivery_days ?? 0) || 0;
      const delivery_date_iso = addBusinessDaysISO(todayISO, dDays, holidaySet);

      // min price
      const tiers = tiersByArticle[String(a.id)] ?? [];
      let price_from: number | null = null;
      let price_unit: "kg" | "stueck" | null = null;

      for (const t of tiers) {
        if (price_from === null || t.price < price_from) {
          price_from = t.price;
          price_unit = t.unit;
        }
      }

      // "Preis ab" nur wenn NICHT gesamt und mehr als 1 Tier in dieser Einheit existiert
      const unitCount = price_unit ? tiers.filter((x) => x.unit === price_unit).length : 0;
      const price_is_from = (a.sale_type ?? "gesamt") !== "gesamt" && unitCount > 1;

      return {
        id: a.id,
        title: a.title ?? "",
        manufacturer: a.manufacturer ?? null,
        condition: a.condition ?? null,

        category: normalizeCategory(a.category),

        // ✅ Großschreibung fix:
        surface: cap1(a.surface),
        application: cap1(a.application),

        promo_score: a.promo_score ?? 0,

        stock_status: a.stock_status ?? null,
        qty_kg: a.qty_kg ?? null,
        qty_piece: a.qty_piece ?? null,

        image_urls: Array.isArray(a.image_urls) ? a.image_urls : [],
        sale_type: a.sale_type ?? "gesamt",

        delivery_date_iso,

        price_from,
        price_unit,
        price_is_from,
      };
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
