export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-route";


type SupabaseClientType = ReturnType<typeof createSupabaseRouteClient>;

type StaffelRow = {
  minMenge?: string;
  maxMenge?: string;
  preis?: string;
  versand?: string;
};

const PROMO_SCORE_BY_ID: Record<string, number> = {
  homepage: 30,
  search_boost: 15,
  premium: 12,
};

function toStr(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

function toNum(v: string, fallback = 0) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function toInt(v: string, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function extFromName(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "bin";
}

async function uploadPublicFiles(opts: {
  supabase: SupabaseClientType;
  bucket: string;
  basePath: string; // e.g. `${articleId}/images`
  files: File[];
}) {
  const { supabase, bucket, basePath, files } = opts;

  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = extFromName(f.name);
    const path = `${basePath}/${String(i + 1).padStart(2, "0")}-${Date.now()}.${ext}`;

    const ab = await f.arrayBuffer();
    const body = Buffer.from(ab);

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, body, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });

    if (upErr) {
      throw new Error(`UPLOAD_FAILED: ${upErr.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function insertPriceTiersWithFallback(opts: {
  supabase: SupabaseClientType;
  tiers: any[];
}) {
  const { supabase, tiers } = opts;

  // 1) Erst “voll” versuchen (falls min_qty/max_qty/shipping existieren)
  const fullTry = await supabase.from("article_price_tiers").insert(tiers);
  if (!fullTry.error) return;

  // 2) Fallback: nur die Felder, die wir sicher kennen (article_id, unit, price)
  const minimal = tiers.map((t) => ({
    article_id: t.article_id,
    unit: t.unit,
    price: t.price,
  }));

  const minTry = await supabase.from("article_price_tiers").insert(minimal);
  if (minTry.error) {
    throw new Error(`PRICE_TIER_INSERT_FAILED: ${minTry.error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseRouteClient();

    // Auth nötig (Owner/RLS & später Konto-Seiten)
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) {
      return NextResponse.json({ error: userErr.message }, { status: 401 });
    }
    const user = userRes?.user;
    if (!user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const fd = await req.formData();

    // Pflichtfelder (aus deinem VerkaufenClient)
    const category = toStr(fd.get("kategorie")).trim();
    const sellTo = toStr(fd.get("verkaufAn")).trim();
    const title = toStr(fd.get("titel")).trim();
    const manufacturer = toStr(fd.get("hersteller")).trim();
    const description = toStr(fd.get("beschreibung")).trim();

    const deliveryDays = toInt(toStr(fd.get("lieferWerktage")), 0);
    const stockStatus = toStr(fd.get("mengeStatus")).trim(); // "auf_lager" | "begrenzt"

    const verkaufsArt = toStr(fd.get("verkaufsArt")).trim(); // "gesamt" | "pro_kg" | "pro_stueck"

    const images = fd.getAll("bilder").filter((x) => x instanceof File) as File[];
    const files = fd.getAll("dateien").filter((x) => x instanceof File) as File[];

    if (!category || !sellTo || !title || !manufacturer) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }
    if (!images.length) {
      return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
    }
    if (!deliveryDays || deliveryDays < 1) {
      return NextResponse.json({ error: "INVALID_DELIVERY_DAYS" }, { status: 400 });
    }
    if (!verkaufsArt) {
      return NextResponse.json({ error: "MISSING_VERKAUFSART" }, { status: 400 });
    }

    // Mengen (je nach Kategorie + stockStatus)
    const qtyKg =
      stockStatus === "begrenzt" && category !== "arbeitsmittel"
        ? toNum(toStr(fd.get("mengeKg")), 0)
        : null;

    const qtyPiece =
      stockStatus === "begrenzt" && category === "arbeitsmittel"
        ? toInt(toStr(fd.get("mengeStueck")), 0)
        : null;

    // Promo score aus "bewerbung" (IDs)
    const bewerbungRaw = toStr(fd.get("bewerbung"));
    const bewerbungIds = safeJson<string[]>(bewerbungRaw, []);
    const promoScore = (bewerbungIds ?? []).reduce((sum, id) => sum + (PROMO_SCORE_BY_ID[id] ?? 0), 0);

    // 1) Artikel anlegen (ohne image_urls – die kommen nach Upload)
    const insertPayload: any = {
      title,
      description,
      category,
      sell_to: sellTo,
      manufacturer,
      promo_score: promoScore,
      delivery_days: deliveryDays,
      stock_status: stockStatus || (qtyKg || qtyPiece ? "begrenzt" : "auf_lager"),
      qty_kg: qtyKg,
      qty_piece: qtyPiece,
      image_urls: [],

      published: true,
      sold_out: false,
      archived: false,

      // falls deine Tabelle owner_id hat (üblich)
      owner_id: user.id,
    };

    const { data: created, error: createErr } = await supabase
      .from("articles")
      .insert(insertPayload)
      .select("id")
      .single();

    // Wenn owner_id-Spalte nicht existiert, retry ohne owner_id
    if (createErr && /owner_id/i.test(createErr.message)) {
      delete insertPayload.owner_id;
      const retry = await supabase.from("articles").insert(insertPayload).select("id").single();
      if (retry.error) {
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      // @ts-ignore
      created = retry.data;
    } else if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    const articleId = (created as any)?.id as string;
    if (!articleId) {
      return NextResponse.json({ error: "ARTICLE_CREATE_FAILED" }, { status: 500 });
    }

    // 2) Upload: Bilder (public bucket: articles)
    let imageUrls: string[] = [];
    try {
      imageUrls = await uploadPublicFiles({
        supabase,
        bucket: "articles",
        basePath: `articles/${articleId}/images`,
        files: images,
      });
    } catch (e: any) {
      // best effort: Artikel verstecken, falls Upload fehlschlägt
      await supabase.from("articles").update({ published: false, archived: true }).eq("id", articleId);
      return NextResponse.json({ error: e?.message ?? "UPLOAD_FAILED" }, { status: 500 });
    }

    // optional: Dateien auch hochladen (noch nicht im Artikel gespeichert – je nach deiner DB später)
    if (files.length) {
      try {
        await uploadPublicFiles({
          supabase,
          bucket: "articles",
          basePath: `articles/${articleId}/files`,
          files,
        });
      } catch {
        // Dateien sind optional -> wir brechen nicht ab
      }
    }

    // 3) Artikel updaten: image_urls
    const { error: updErr } = await supabase.from("articles").update({ image_urls: imageUrls }).eq("id", articleId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // 4) Preise / Staffeln
    const unit: "kg" | "stueck" =
      verkaufsArt === "pro_stueck" || category === "arbeitsmittel" ? "stueck" : "kg";

    if (verkaufsArt === "pro_kg" || verkaufsArt === "pro_stueck") {
      const staffelnRaw = toStr(fd.get("preisStaffeln"));
      const staffeln = safeJson<StaffelRow[]>(staffelnRaw, []);

      const tiers = staffeln
        .map((s) => {
          const minQty = s.minMenge?.trim() ? toInt(s.minMenge.trim(), 0) : null;
          const maxQty = s.maxMenge?.trim() ? toInt(s.maxMenge.trim(), 0) : null;
          const price = toNum(s.preis?.trim() ?? "", 0);
          const shipping = toNum(s.versand?.trim() ?? "", 0);

          if (!price || price <= 0) return null;

          return {
            article_id: articleId,
            unit,
            min_qty: minQty,
            max_qty: maxQty,
            price,      // Brutto
            shipping,   // Brutto Versand (falls Spalte existiert -> wird gespeichert; sonst fallback ignoriert)
          };
        })
        .filter(Boolean);

      if (!tiers.length) {
        return NextResponse.json({ error: "NO_VALID_TIERS" }, { status: 400 });
      }

      await insertPriceTiersWithFallback({ supabase, tiers });
    } else {
      // "gesamt": Einzelpreis + Versand
      const price = toNum(toStr(fd.get("preis")), 0);
      const shipping = toNum(toStr(fd.get("versandKosten")), 0);

      if (!price || price <= 0) {
        return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
      }

      const tiers = [
        {
          article_id: articleId,
          unit,
          min_qty: null,
          max_qty: null,
          price,    // Brutto
          shipping, // Brutto Versand (falls Spalte existiert)
        },
      ];

      await insertPriceTiersWithFallback({ supabase, tiers });
    }

    return NextResponse.json({ ok: true, id: articleId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
