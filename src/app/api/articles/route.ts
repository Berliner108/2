export const runtime = "nodejs";
export const revalidate = 300;

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

function safeSearchValue(value: string): string {
  return value
    .trim()
    .replace(/,/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export async function GET(req: Request) {
  try {
    const admin = supabaseAdmin();
    const url = new URL(req.url);

    const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(Number.isNaN(limitRaw) ? 50 : limitRaw, 200);

    const pageRaw = parseInt(url.searchParams.get("page") ?? "1", 10);
    const page = Math.max(Number.isNaN(pageRaw) ? 1 : pageRaw, 1);

    const offsetParam =
      url.searchParams.get("offset") ??
      url.searchParams.get("skip") ??
      url.searchParams.get("start");

    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : null;

    const search = url.searchParams.get("q") ?? url.searchParams.get("search") ?? "";
    const kategorieRaw = url.searchParams.get("kategorie") ?? "";
    const kategorieDb = kategorieRaw ? normalizeCategoryForDb(kategorieRaw) : "";
    const zustandList = csv(url.searchParams.get("zustand") ?? "");
    const herstellerList = csv(url.searchParams.get("hersteller") ?? "");
    const g = url.searchParams.get("g") ?? "";
    const p = url.searchParams.get("p") ?? "";
    const viewerBusiness = (url.searchParams.get("viewerBusiness") ?? "") === "1";

    const maxRaw = url.searchParams.get("max");
    const maxPreis = maxRaw !== null && maxRaw !== "" ? Number(maxRaw) : null;
    const sortParam = (url.searchParams.get("sort") ?? "").toLowerCase();
    const isPriceSort = sortParam === "preis-auf" || sortParam === "preis-ab";

    // Preis liegt in article_price_tiers. Passende Artikel-IDs zuerst auflösen,
    // danach verwenden Count und Datenabfrage dieselbe applyFilters-Funktion.
    let priceArticleIds: string[] | null = null;

    if (maxPreis !== null && Number.isFinite(maxPreis)) {
      const { data: priceRows, error: priceError } = await admin
        .from("article_price_tiers")
        .select("article_id")
        .lte("price", maxPreis);

      if (priceError) {
        return NextResponse.json({ error: priceError.message }, { status: 500 });
      }

      priceArticleIds = Array.from(
        new Set(
          (priceRows ?? [])
            .map((row: any) => String(row.article_id ?? ""))
            .filter(Boolean)
        )
      );
    }

    // Slider-Obergrenze.
    const { data: maxPriceRows, error: maxPriceError } = await admin
      .from("article_price_tiers")
      .select("price")
      .not("price", "is", null)
      .order("price", { ascending: false })
      .limit(1);

    if (maxPriceError) {
      return NextResponse.json({ error: maxPriceError.message }, { status: 500 });
    }

    const maxPriceAvailable = Number(maxPriceRows?.[0]?.price ?? 0);

    const columns =
      "id, owner_id, title, description, category, sell_to, manufacturer, promo_score, delivery_days, stock_status, qty_kg, qty_piece, image_urls, sale_type, price_mode, condition, created_at, updated_at";

    const applyFilters = (query: any) => {
      let next = query;

      next = next.eq("published", true);
      next = next.eq("sold_out", false);
      next = next.eq("archived", false);

      if (!viewerBusiness) {
        next = next.eq("sell_to", "beide");
      }

      if (kategorieDb) {
        next = next.eq("category", kategorieDb);
      }

      if (zustandList.length) {
        next = next.in("condition", zustandList);
      }

      if (herstellerList.length) {
        next = next.in("manufacturer", herstellerList);
      }

      if (g === "1" && p !== "1") {
        next = next.in("sell_to", ["gewerblich", "beide"]);
      }

      if (p === "1" && g !== "1") {
        next = next.eq("sell_to", "beide");
      }

      if (priceArticleIds !== null) {
        if (priceArticleIds.length === 0) {
          next = next.eq("id", "__no_matching_article__");
        } else {
          next = next.in("id", priceArticleIds);
        }
      }

      if (search.trim()) {
        const s = safeSearchValue(search);

        if (s) {
          next = next.or(
            [
              `title.ilike.%${s}%`,
              `manufacturer.ilike.%${s}%`,
              `condition.ilike.%${s}%`,
              `category.ilike.%${s}%`,
            ].join(",")
          );
        }
      }

      return next;
    };

    // Count-Abfrage: exakt wie bei Lackanfragen.
    const countQuery = applyFilters(
      admin.from("articles").select("id", { count: "exact", head: true })
    );

    const { count: total, error: countError } = await countQuery;

    if (countError) {
      console.error("[articles] count failed:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Daten-Abfrage: dieselben Filter, anschließend Sortierung + range.
    let dataQuery = applyFilters(admin.from("articles").select(columns));

    switch (sortParam) {
      case "lieferdatum-auf":
        dataQuery = dataQuery
          .order("delivery_days", { ascending: true })
          .order("promo_score", { ascending: false })
          .order("created_at", { ascending: false });
        break;

      case "lieferdatum-ab":
        dataQuery = dataQuery
          .order("delivery_days", { ascending: false })
          .order("promo_score", { ascending: false })
          .order("created_at", { ascending: false });
        break;

      case "titel-az":
        dataQuery = dataQuery
          .order("title", { ascending: true })
          .order("promo_score", { ascending: false })
          .order("created_at", { ascending: false });
        break;

      case "titel-za":
        dataQuery = dataQuery
          .order("title", { ascending: false })
          .order("promo_score", { ascending: false })
          .order("created_at", { ascending: false });
        break;

      case "menge-auf": {
        const pieceCategory =
          kategorieDb === "arbeitsmittel" || kategorieDb === "galvano_zubehoer";

        dataQuery = pieceCategory
          ? dataQuery
              .order("qty_piece", { ascending: true })
              .order("created_at", { ascending: false })
          : dataQuery
              .order("qty_kg", { ascending: true })
              .order("qty_piece", { ascending: true })
              .order("created_at", { ascending: false });
        break;
      }

      case "menge-ab": {
        const pieceCategory =
          kategorieDb === "arbeitsmittel" || kategorieDb === "galvano_zubehoer";

        dataQuery = pieceCategory
          ? dataQuery
              .order("qty_piece", { ascending: false })
              .order("created_at", { ascending: false })
          : dataQuery
              .order("qty_kg", { ascending: false })
              .order("qty_piece", { ascending: false })
              .order("created_at", { ascending: false });
        break;
      }

      case "preis-auf":
      case "preis-ab":
        // Die echte Preissortierung erfolgt weiter unten anhand
        // article_price_tiers: angezeigter Preis + zugehöriger Versand.
        // Hier nur eine stabile Grundreihenfolge setzen.
        dataQuery = dataQuery.order("created_at", { ascending: false });
        break;

      default:
        dataQuery = dataQuery
          .order("promo_score", { ascending: false })
          .order("delivery_days", { ascending: false })
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false });
        break;
    }

    let from = 0;
    let to = limit - 1;

    if (offset !== null) {
      from = offset;
      to = from + limit - 1;
    } else {
      from = (page - 1) * limit;
      to = from + limit - 1;
    }

    // Bei Preis-Sortierung müssen wir vor der Pagination nach
    // Artikelpreis + Versandkosten sortieren. Sonst wäre nur die
    // aktuell geladene Seite korrekt sortiert.
    if (!isPriceSort) {
      dataQuery = dataQuery.range(from, to);
    }

    const { data: articles, error } = await dataQuery;

    if (error) {
      console.error("[articles] query failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let rows = articles ?? [];

    if (isPriceSort && rows.length) {
      const ids = rows.map((a: any) => a.id);
      const { data: sortTiers, error: sortTierError } = await admin
        .from("article_price_tiers")
        .select("article_id, price, shipping")
        .in("article_id", ids);

      if (sortTierError) {
        return NextResponse.json({ error: sortTierError.message }, { status: 500 });
      }

      // Gleiche Logik wie bei price_from/shipping_from:
      // zuerst die günstigste Preisstufe bestimmen und deren Versand addieren.
      const totalPriceByArticle = new Map<string, { price: number; total: number }>();

      for (const tier of sortTiers ?? []) {
        const id = String(tier.article_id ?? "");
        const price = typeof tier.price === "number" ? tier.price : Number(tier.price);
        const shipping =
          tier.shipping == null
            ? 0
            : typeof tier.shipping === "number"
              ? tier.shipping
              : Number(tier.shipping);

        if (!id || !Number.isFinite(price)) continue;

        const shippingValue = Number.isFinite(shipping) ? shipping : 0;
        const current = totalPriceByArticle.get(id);

        if (
          !current ||
          price < current.price ||
          (price === current.price && price + shippingValue < current.total)
        ) {
          totalPriceByArticle.set(id, {
            price,
            total: price + shippingValue,
          });
        }
      }

      const direction = sortParam === "preis-auf" ? 1 : -1;

      rows = [...rows].sort((a: any, b: any) => {
        const aInfo = totalPriceByArticle.get(String(a.id));
        const bInfo = totalPriceByArticle.get(String(b.id));

        // Artikel ohne Preis immer ans Ende.
        if (!aInfo && !bInfo) return 0;
        if (!aInfo) return 1;
        if (!bInfo) return -1;

        const diff = (aInfo.total - bInfo.total) * direction;
        if (diff !== 0) return diff;

        // Bei identischem Gesamtpreis: neuere Artikel zuerst.
        return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
      });

      rows = rows.slice(from, to + 1);
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
    const minPriceByArticle: Record<
      string,
      {
        price_from: number | null;
        shipping_from: number | null;
        unit: "kg" | "stueck" | null;
        tier_count: number;
      }
    > = {};

    if (articleIds.length) {
      const { data: tiers, error: tierError } = await admin
        .from("article_price_tiers")
        .select("article_id, unit, price, shipping")
        .in("article_id", articleIds);

      if (tierError) {
        return NextResponse.json({ error: tierError.message }, { status: 500 });
      }

      for (const tier of tiers ?? []) {
        const key = String(tier.article_id);
        const price = typeof tier.price === "number" ? tier.price : Number(tier.price);
        const shipping =
          tier.shipping == null
            ? 0
            : typeof tier.shipping === "number"
              ? tier.shipping
              : Number(tier.shipping);
        const unit = tier.unit as "kg" | "stueck";

        if (!key) continue;
        if (!Number.isFinite(price)) continue;
        if (unit !== "kg" && unit !== "stueck") continue;

        const current = minPriceByArticle[key];

        if (!current) {
          minPriceByArticle[key] = {
            price_from: price,
            shipping_from: Number.isFinite(shipping) ? shipping : 0,
            unit,
            tier_count: 1,
          };
          continue;
        }

        current.tier_count += 1;

        if (current.price_from === null || price < current.price_from) {
          current.price_from = price;
          current.shipping_from = Number.isFinite(shipping) ? shipping : 0;
          current.unit = unit;
        }
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
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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
