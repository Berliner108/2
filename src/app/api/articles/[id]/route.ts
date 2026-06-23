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
    if (!isWeekend && !isHoliday) remaining--;
  }

  return formatUTCToISODate(cur);
}

// ✅ Kategorie-Mapper: exakt 3 Kategorien sauber ausgeben
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

// ✅ Oberfläche/Anwendung sauber ausgeben (statt "glatt", "innen", ...)
function normalizeSurface(v: unknown): string | null {
  if (v == null) return null;
  const key = String(v).trim().toLowerCase();

  const map: Record<string, string> = {
    glatt: "Glatt",
    feinstruktur: "Feinstruktur",
    grobstruktur: "Grobstruktur",
  };

  return map[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : null);
}

function normalizeApplication(v: unknown): string | null {
  if (v == null) return null;
  const key = String(v).trim().toLowerCase();

  const map: Record<string, string> = {
    universal: "Universal",
    innen: "Innen",
    "außen": "Außen",
    industrie: "Industrie",
  };

  return map[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : null);
}
function sortImageUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];

  return urls
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .sort((a, b) => {
      const getName = (url: string) => {
        try {
          return decodeURIComponent(url.split("/").pop() ?? url);
        } catch {
          return url;
        }
      };

      return getName(a).localeCompare(getName(b), "de", {
        numeric: true,
        sensitivity: "base",
      });
    });
}
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1]; // .../api/articles/{id}

    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const admin = supabaseAdmin();

    const { data: article, error } = await admin
      .from("articles")
      .select(
        "id, title, description, category, sell_to, manufacturer, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, file_urls, sale_type, created_at, owner_id, condition, pieces_per_unit, size, color_palette, gloss_level, surface, application, color_tone, color_code, quality, effect, special_effects, certifications, charge"
      )
      .eq("id", id)
      .eq("published", true)
      .eq("sold_out", false)
      .eq("archived", false)
      .single();

    if (error) {
      const status = (error as any).code === "PGRST116" ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
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
    const dDays =
      typeof (article as any).delivery_days === "number"
        ? (article as any).delivery_days
        : Number((article as any).delivery_days ?? 0);

    const endDate = new Date(
      parseISODateToUTC(todayISO).getTime() + (dDays + 40) * 24 * 60 * 60 * 1000
    );
    const endISO = formatUTCToISODate(endDate);

    const { data: holidayRows, error: holidayErr } = await admin
      .from("delivery_holidays")
      .select("holiday_date")
      .gte("holiday_date", todayISO)
      .lte("holiday_date", endISO);

    if (holidayErr) return NextResponse.json({ error: holidayErr.message }, { status: 500 });

    const holidaySet = new Set<string>((holidayRows ?? []).map((h: any) => h.holiday_date));
    const delivery_date_iso = addBusinessDaysISO(todayISO, dDays, holidaySet);

    // price_from + price_unit
    let price_from: number | null = null;
    let price_unit: "kg" | "stueck" | null = null;

    for (const t of tiers ?? []) {
      const p = typeof (t as any).price === "number" ? (t as any).price : Number((t as any).price);
      if (!Number.isFinite(p)) continue;
      if (price_from === null || p < price_from) {
        price_from = p;
        price_unit = (t as any).unit as "kg" | "stueck";
      }
    }

    // Seller-Profil aus profiles (username + rating)
    let seller: null | {
  id: string;
  username: string | null;
  account_type: "business" | "private" | string | null;
  rating_avg: number | null;
  rating_count: number | null;

  company_name: string | null;
  vat_number: string | null;
  address: any | null;
  imprint_email: string | null;
  imprint_phone: string | null;
  imprint_represented_by: string | null;
  imprint_legal_form: string | null;
  imprint_register_number: string | null;
  imprint_register_court: string | null;
  imprint_chamber: string | null;
  imprint_supervisory_authority: string | null;
} = null;

    const ownerId = (article as any).owner_id as string | null | undefined;
    if (ownerId) {
      const { data: prof, error: profErr } = await admin
        .from("profiles")
        .select(`
  id,
  username,
  account_type,
  rating_avg,
  rating_count,
  company_name,
  vat_number,
  address,
  imprint_email,
  imprint_phone,
  imprint_represented_by,
  imprint_legal_form,
  imprint_register_number,
  imprint_register_court,
  imprint_chamber,
  imprint_supervisory_authority
`)
        .eq("id", ownerId)
        .maybeSingle();

      if (!profErr && prof) {
        seller = {
  id: (prof as any).id,
  username: (prof as any).username ?? null,
  account_type: (prof as any).account_type ?? null,
  rating_avg: (prof as any).rating_avg != null ? Number((prof as any).rating_avg) : null,
  rating_count:
    (prof as any).rating_count != null ? Number((prof as any).rating_count) : null,

  company_name: (prof as any).company_name ?? null,
  vat_number: (prof as any).vat_number ?? null,
  address: (prof as any).address ?? null,
  imprint_email: (prof as any).imprint_email ?? null,
  imprint_phone: (prof as any).imprint_phone ?? null,
  imprint_represented_by: (prof as any).imprint_represented_by ?? null,
  imprint_legal_form: (prof as any).imprint_legal_form ?? null,
  imprint_register_number: (prof as any).imprint_register_number ?? null,
  imprint_register_court: (prof as any).imprint_register_court ?? null,
  imprint_chamber: (prof as any).imprint_chamber ?? null,
  imprint_supervisory_authority: (prof as any).imprint_supervisory_authority ?? null,
};
      }
    }

    return NextResponse.json({
      article: {
  ...article,
  image_urls: sortImageUrls((article as any).image_urls),
  category: normalizeCategory((article as any).category),

  // ✅ HIER: Oberfläche/Anwendung normalisieren
  surface: normalizeSurface((article as any).surface),
  application: normalizeApplication((article as any).application),

  delivery_date_iso,
  price_from,
  price_unit,
},
      tiers: tiers ?? [],
      seller,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
