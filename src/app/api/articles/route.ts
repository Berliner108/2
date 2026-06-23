export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getBerlinTodayISO(): string {
  // YYYY-MM-DD in Europe/Berlin
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function parseISODateToUTC(iso: string): Date {
  // iso = YYYY-MM-DD
  return new Date(`${iso}T00:00:00Z`);
}

function formatUTCToISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addBusinessDaysISO(
  startISO: string,
  businessDays: number,
  holidays: Set<string>
): string {
  if (!businessDays || businessDays <= 0) return startISO;

  let remaining = businessDays;
  let cur = parseISODateToUTC(startISO);

  while (remaining > 0) {
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    const iso = formatUTCToISODate(cur);
    const dow = cur.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = holidays.has(iso);

    if (!isWeekend && !isHoliday) {
      remaining--;
    }
  }

  return formatUTCToISODate(cur);
}

function getTimeValue(value: unknown): number {
  if (!value) return 0;
  const time = new Date(String(value)).getTime();
  return Number.isFinite(time) ? time : 0;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

    const admin = supabaseAdmin();

    // 1) Artikel holen: beworbene Artikel nach promo_score, bei Gleichstand nach updated_at/created_at/id
    const { data: articles, error } = await admin
      .from("articles")
      .select(
        "id, owner_id, title, description, category, sell_to, manufacturer, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, sale_type, condition, created_at, updated_at"
      )
      .eq("published", true)
      .eq("sold_out", false)
      .eq("archived", false)
      .order("promo_score", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 1b) Feiertage laden für Lieferdatum-Berechnung
    const todayISO = getBerlinTodayISO();

    const maxDeliveryDays =
      (articles ?? []).reduce((max: number, a: any) => {
        const d =
          typeof a.delivery_days === "number"
            ? a.delivery_days
            : Number(a.delivery_days ?? 0);

        return d > max ? d : max;
      }, 0) || 0;

    // Buffer, weil wir beim Iterieren Wochenenden/Feiertage überspringen
    const endDate = new Date(
      parseISODateToUTC(todayISO).getTime() +
        (maxDeliveryDays + 40) * 24 * 60 * 60 * 1000
    );
    const endISO = formatUTCToISODate(endDate);

    const { data: holidayRows, error: holidayError } = await admin
      .from("delivery_holidays")
      .select("holiday_date")
      .gte("holiday_date", todayISO)
      .lte("holiday_date", endISO);

    if (holidayError) {
      return NextResponse.json({ error: holidayError.message }, { status: 500 });
    }

    const holidaySet = new Set<string>(
      (holidayRows ?? []).map((h: any) => h.holiday_date)
    );

    // 2) Seller-Profile für Badges holen
    const ownerIds = Array.from(
      new Set((articles ?? []).map((a: any) => a.owner_id).filter(Boolean))
    ) as string[];

    const sellerById: Record<
      string,
      { account_type: "business" | "private" | string | null }
    > = {};

    if (ownerIds.length) {
      const { data: profs, error: profErr } = await admin
        .from("profiles")
        .select("id, account_type")
        .in("id", ownerIds);

      if (profErr) {
        return NextResponse.json({ error: profErr.message }, { status: 500 });
      }

      for (const p of profs ?? []) {
        sellerById[p.id] = { account_type: p.account_type ?? null };
      }
    }

    // 3) price_from Brutto für diese Artikel ermitteln
    const articleIds = (articles ?? []).map((a: any) => a.id);

    const minPriceByArticle: Record<
      string,
      { price_from: number | null; unit: "kg" | "stueck" | null }
    > = {};

    if (articleIds.length) {
      const { data: tiers, error: tierError } = await admin
        .from("article_price_tiers")
        .select("article_id, unit, price")
        .in("article_id", articleIds);

      if (tierError) {
        return NextResponse.json({ error: tierError.message }, { status: 500 });
      }

      for (const t of tiers ?? []) {
        const key = t.article_id;
        const price = typeof t.price === "number" ? t.price : Number(t.price);
        const unit = t.unit as "kg" | "stueck";

        if (!Number.isFinite(price)) continue;
        if (unit !== "kg" && unit !== "stueck") continue;

        const current = minPriceByArticle[key];

        if (!current || current.price_from === null || price < current.price_from) {
          minPriceByArticle[key] = { price_from: price, unit };
        }
      }
    }

    // 4) Artikel anreichern
    const list = (articles ?? []).map((a: any) => {
      const dDays =
        typeof a.delivery_days === "number"
          ? a.delivery_days
          : Number(a.delivery_days ?? 0);

      return {
        ...a,
        price_from: minPriceByArticle[a.id]?.price_from ?? null,
        price_unit: minPriceByArticle[a.id]?.unit ?? null,
        seller_account_type: a.owner_id
          ? sellerById[a.owner_id]?.account_type ?? null
          : null,
        delivery_date_iso: addBusinessDaysISO(todayISO, dDays, holidaySet),
      };
    });

    // 5) Promo-Artikel exakt nach Score sortieren
    const sponsored = list
      .filter((a) => Number(a.promo_score ?? 0) > 0)
      .sort((a, b) => {
        const promoDiff = Number(b.promo_score ?? 0) - Number(a.promo_score ?? 0);
        if (promoDiff !== 0) return promoDiff;

        const updatedDiff = getTimeValue(b.updated_at) - getTimeValue(a.updated_at);
        if (updatedDiff !== 0) return updatedDiff;

        const createdDiff = getTimeValue(b.created_at) - getTimeValue(a.created_at);
        if (createdDiff !== 0) return createdDiff;

        return String(b.id).localeCompare(String(a.id));
      });

    // 6) Normale Artikel bleiben random
    const rest = list.filter((a) => Number(a.promo_score ?? 0) <= 0);

    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    return NextResponse.json(
      { articles: [...sponsored, ...rest], limit, offset },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}