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
    const dow = cur.getUTCDay(); // 0=Sun ... 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidays.has(iso);

    if (!isWeekend && !isHoliday) remaining--;
  }

  return formatUTCToISODate(cur);
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params.id;
    const admin = supabaseAdmin();

    const { data: article, error } = await admin
      .from("articles")
      .select(
        "id, title, description, category, sell_to, manufacturer, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, sale_type, created_at"
      )
      .eq("id", id)
      .eq("published", true)
      .eq("sold_out", false)
      .eq("archived", false)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
    }
    if (!article) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const { data: tiers, error: tierErr } = await admin
      .from("article_price_tiers")
      .select("id, unit, min_qty, max_qty, price, shipping")
      .eq("article_id", id)
      .order("unit", { ascending: true })
      .order("min_qty", { ascending: true });

    if (tierErr) return NextResponse.json({ error: tierErr.message }, { status: 500 });

    // delivery date (Berlin + delivery_holidays)
    const todayISO = getBerlinTodayISO();
    const dDays = typeof article.delivery_days === "number" ? article.delivery_days : Number(article.delivery_days ?? 0);

    const endDate = new Date(parseISODateToUTC(todayISO).getTime() + (dDays + 40) * 24 * 60 * 60 * 1000);
    const endISO = formatUTCToISODate(endDate);

    const { data: holidayRows, error: holidayErr } = await admin
      .from("delivery_holidays")
      .select("holiday_date")
      .gte("holiday_date", todayISO)
      .lte("holiday_date", endISO);

    if (holidayErr) return NextResponse.json({ error: holidayErr.message }, { status: 500 });

    const holidaySet = new Set<string>((holidayRows ?? []).map((h: any) => h.holiday_date));
    const delivery_date_iso = addBusinessDaysISO(todayISO, dDays, holidaySet);

    // price_from + price_unit (günstigste Staffel über alle Units)
    let price_from: number | null = null;
    let price_unit: "kg" | "stueck" | null = null;

    for (const t of tiers ?? []) {
      const p = typeof t.price === "number" ? t.price : Number(t.price);
      if (!Number.isFinite(p)) continue;
      if (price_from === null || p < price_from) {
        price_from = p;
        price_unit = t.unit as "kg" | "stueck";
      }
    }

    return NextResponse.json({
      article: {
        ...article,
        delivery_date_iso,
        price_from,
        price_unit,
      },
      tiers: tiers ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
