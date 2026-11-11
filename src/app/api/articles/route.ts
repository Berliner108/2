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

function normalizeCategoryForDb(value: string): string {
  const v = value.trim().toLowerCase();
  const map: Record<string, string> = {
    nasslack: "nasslack",
    nasslacke: "nasslack",
    pulverlack: "pulverlack",
    pulverlacke: "pulverlack",
    arbeitsmittel: "arbeitsmittel",
    "arbeitsmittel & zubehör": "arbeitsmittel",
    "galvano-zubehör": "galvano_zubehoer",
    "galvano-zubehoer": "galvano_zubehoer",
    galvano_zubehoer: "galvano_zubehoer",
    galvanozubehör: "galvano_zubehoer",
    galvanozubehoer: "galvano_zubehoer",
  };

  return map[v] ?? v;
}

function csv(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

const HERSTELLER_ALIASES: Record<string, string[]> = {
  'ADLER Lacke': ['Adler Lacke'],
  'AkzoNobel': ['Akzo Nobel', 'Akzonobel'],
  'Brillux Industrial Coatings': ['Brillux'],
  'FreiLacke': ['Frei Lacke', 'Freilacke'],
  'Grimm Pulverlacke': ['Grimm'],
  'IGP Powder Coatings': ['IGP', 'IGP Pulvertechnik AG'],
  'KABE Farben': ['Kabe', 'KABE', 'KABE Farben - Karl Bubenhofer AG'],
  'KANSAI HELIOS': ['Kansai', 'Helios', 'Kansai Helios'],
  'MOTEC Pulverlack': ['Motec-Pulverlack', 'Motec Pulverlack'],
  'PPG': ['PPG Industries'],
  'RIPOL': ['Ripol', 'RIPOL Sagl'],
  'Sherwin-Williams': ['Sherwin Williams', 'Sherwin‑Williams'],
  'ST Powder Coatings': ['ST Powder Coatings S.p.A.'],
  'TIGER Coatings': ['Tiger'],
  'Valspar': ['VAL'],
};

function expandHerstellerFilter(values: string[]): string[] {
  const expanded = new Set<string>();

  for (const value of values) {
    expanded.add(value);

    for (const alias of HERSTELLER_ALIASES[value] ?? []) {
      expanded.add(alias);
    }

    for (const [canonical, aliases] of Object.entries(HERSTELLER_ALIASES)) {
      if (aliases.includes(value)) {
        expanded.add(canonical);
        for (const alias of aliases) expanded.add(alias);
      }
    }
  }

  return Array.from(expanded);
}

export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Math.max(Number.isNaN(limitRaw) ? 50 : limitRaw, 1), 200);

    const pageRaw = parseInt(url.searchParams.get("page") ?? "1", 10);
    const page = Math.max(Number.isNaN(pageRaw) ? 1 : pageRaw, 1);

    const offsetParam =
      url.searchParams.get("offset") ??
      url.searchParams.get("skip") ??
      url.searchParams.get("start");

    const parsedOffset = offsetParam !== null ? Number.parseInt(offsetParam, 10) : NaN;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : null;

    const search = url.searchParams.get("q") ?? url.searchParams.get("search") ?? "";
    const kategorieRaw = url.searchParams.get("kategorie") ?? "";
    const kategorieDb = kategorieRaw ? normalizeCategoryForDb(kategorieRaw) : "";
    const zustandList = csv(url.searchParams.get("zustand") ?? "");
    const herstellerListRaw = csv(url.searchParams.get("hersteller") ?? "");
    const herstellerList = expandHerstellerFilter(herstellerListRaw);
    const g = url.searchParams.get("g") ?? "";
    const p = url.searchParams.get("p") ?? "";
    const viewerBusiness = (url.searchParams.get("viewerBusiness") ?? "") === "1";

    const maxRaw = url.searchParams.get("max");
    const maxPreis = maxRaw !== null && maxRaw !== "" ? Number(maxRaw) : null;
    const sortParam = (url.searchParams.get("sort") ?? "").toLowerCase();
    const columns =
      "id, owner_id, title, description, category, sell_to, manufacturer, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, sale_type, price_mode, condition, created_at, updated_at";

    // Alle Filter, die Relevanzsortierung, Preisfilter und Pagination laufen
    // in PostgreSQL. Es werden nur die IDs der angeforderten Seite übertragen.
    const { data: result, error: rpcError } = await admin.rpc("get_shop_article_ids", {
      p_query: search.trim(),
      p_category: kategorieDb || null,
      p_conditions: zustandList.length ? zustandList : null,
      p_manufacturers: herstellerList.length ? herstellerList : null,
      p_viewer_business: viewerBusiness,
      p_gewerblich: g === "1",
      p_privat: p === "1",
      p_max_price: maxPreis !== null && Number.isFinite(maxPreis) ? maxPreis : null,
      p_sort: sortParam,
      p_page: page,
      p_limit: Math.max(1, limit),
      p_offset: offset,
    });

    if (rpcError) {
      console.error("[articles] RPC failed:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const payload = result as {
      article_ids?: string[];
      total?: number;
      max_price?: number;
    } | null;
    const ids = Array.isArray(payload?.article_ids) ? payload.article_ids : [];
    const total = Number(payload?.total ?? 0);
    const maxPriceAvailable = Number(payload?.max_price ?? 0);
    let rows: any[] = [];

    if (ids.length) {
      const { data: articles, error: articleError } = await admin
        .from("articles")
        .select(columns)
        .in("id", ids);

      if (articleError) {
        return NextResponse.json({ error: articleError.message }, { status: 500 });
      }
      const byId = new Map((articles ?? []).map((a: any) => [String(a.id), a]));
      rows = ids.map(id => byId.get(String(id))).filter(Boolean);
    }

    const todayISO = getBerlinTodayISO();

    const maxDeliveryDays =
      rows.reduce((max: number, a: any) => {
        const d = typeof a.delivery_days === "number" ? a.delivery_days : Number(a.delivery_days ?? 0);
        return d > max ? d : max;
      }, 0) || 0;

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

    const ownerIds = Array.from(
      new Set(rows.map((a: any) => a.owner_id).filter(Boolean))
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

      for (const profile of profs ?? []) {
        sellerById[profile.id] = { account_type: profile.account_type ?? null };
      }
    }

    const articleIds = rows.map((a: any) => a.id);
    const minPriceByArticle: Record<string, {
      price_from: number | null;
      shipping_from: number | null;
      unit: "kg" | "stueck" | null;
      tier_count: number;
    }> = {};

    if (articleIds.length) {
      const { data: prices, error: priceError } = await admin
        .from("shop_article_prices")
        .select("article_id, price_from, shipping_from, price_unit, tier_count")
        .in("article_id", articleIds);
      if (priceError) {
        return NextResponse.json({ error: priceError.message }, { status: 500 });
      }
      for (const price of prices ?? []) {
        minPriceByArticle[String(price.article_id)] = {
          price_from: price.price_from == null ? null : Number(price.price_from),
          shipping_from: price.shipping_from == null ? null : Number(price.shipping_from),
          unit: (price.price_unit === "kg" || price.price_unit === "stueck")
            ? price.price_unit : null,
          tier_count: Number(price.tier_count ?? 0),
        };
      }
    }

    const list = rows.map((article: any) => {
      const dDays =
        typeof article.delivery_days === "number"
          ? article.delivery_days
          : Number(article.delivery_days ?? 0);

      const priceInfo = minPriceByArticle[article.id] ?? null;

      return {
        ...article,
        image_urls: sortImageUrls(article.image_urls),
        price_from: priceInfo?.price_from ?? null,
        shipping_from: priceInfo?.shipping_from ?? null,
        price_unit: priceInfo?.unit ?? null,
        price_is_from:
          (article.sale_type ?? "gesamt") !== "gesamt" &&
          (priceInfo?.tier_count ?? 0) > 1,
        seller_account_type: article.owner_id
          ? sellerById[article.owner_id]?.account_type ?? null
          : null,
        delivery_date_iso: addBusinessDaysISO(todayISO, dDays, holidaySet),
      };
    });

    return NextResponse.json(
      {
        articles: list,
        total: total ?? 0,
        page,
        limit,
        max_price: Number.isFinite(maxPriceAvailable) ? maxPriceAvailable : 0,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    console.error("[articles] GET crashed:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
