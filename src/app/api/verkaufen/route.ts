export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase-route";
import { hasPremiumAccess } from "@/lib/premium";

type SupabaseClientType = Awaited<ReturnType<typeof createSupabaseRouteClient>>;

type StaffelRow = {
  minMenge?: string;
  maxMenge?: string;
  preis?: string;
  versand?: string;
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
function jsonStringArray(fd: FormData, key: string): string[] {
  const raw = toStr(fd.get(key)).trim();
  if (!raw) return [];
  const parsed = safeJson<any>(raw, []);
  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
}


function isPieceCategory(category: string): boolean {
  return category === "arbeitsmittel" || category === "galvano_zubehoer";
}

function extFromName(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "bin";
}

// OPTIONAL: Fallback-Upload (wenn du doch mal Dateien über die Route sendest)
// -> Achtung: bei großen PDFs kann die Route trotzdem an Limits stoßen.
async function uploadPublicFiles(opts: {
  supabase: SupabaseClientType;
  bucket: string;
  basePath: string; // e.g. `articles/${articleId}/images`
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

  const fullTry = await supabase.from("article_price_tiers").insert(tiers);
  if (!fullTry.error) return;

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

function parseUrlList(fd: FormData, keys: string[]) {
  for (const k of keys) {
    const raw = toStr(fd.get(k)).trim();
    if (!raw) continue;
    const arr = safeJson<string[]>(raw, []);
    if (Array.isArray(arr)) return arr.filter(Boolean);
  }
  return null;
}
async function assertSellerImprintComplete(
  supabase: SupabaseClientType,
  userId: string
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      account_type,
      company_name,
      vat_number,
      tax_status,
      address,
      imprint_email,
      imprint_phone,
      imprint_represented_by
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      status: 500,
      error: "Profil konnte nicht geprüft werden.",
    };
  }

  if (!profile) {
    return {
      ok: false as const,
      status: 400,
      error: "Bitte vervollständige zuerst dein Profil.",
    };
  }

  if (profile.account_type !== "business") {
    return {
      ok: true as const,
      priceMode: "no_vat" as const,
    };
  }

  const taxStatus = String(profile.tax_status ?? "").trim();

  if (taxStatus !== "vat_registered" && taxStatus !== "vat_exempt") {
    return {
      ok: false as const,
      status: 400,
      error:
        "Bitte wähle zuerst deinen Umsatzsteuerstatus in den Kontoeinstellungen aus.",
    };
  }

  if (taxStatus === "vat_registered" && !profile.vat_number) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Bitte hinterlege zuerst deine Umsatzsteuer-ID in den Kontoeinstellungen.",
    };
  }

  const address = (profile.address ?? {}) as any;

  const missingImprint =
    !profile.company_name ||
    !address.street ||
    !address.houseNumber ||
    !address.zip ||
    !address.city ||
    !address.country ||
    !profile.imprint_email ||
    !profile.imprint_phone ||
    !profile.imprint_represented_by;

  if (missingImprint) {
    return {
      ok: false as const,
      status: 400,
      error:
        "Bitte vervollständige zuerst dein Verkäufer-Impressum in den Kontoeinstellungen.",
    };
  }

  return {
    ok: true as const,
    priceMode:
      taxStatus === "vat_registered"
        ? ("net" as const)
        : ("no_vat" as const),
  };
}

async function assertPremiumAccess(
  supabase: SupabaseClientType,
  userId: string
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      premium_exempt,
      premium_trial_ends_at,
      premium_until
    `)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: "premium_check_failed",
      message: "Premium-Status konnte nicht geprüft werden.",
    };
  }

  if (!profile || !hasPremiumAccess(profile)) {
    return {
      ok: false,
      status: 403,
      error: "premium_required",
      message:
        "Zum Einstellen und Verkaufen von Artikeln benötigst du eine aktive Premium Mitgliedschaft.",
    };
  }

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    // Auth nötig
    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) {
      return NextResponse.json({ error: sessionErr.message }, { status: 401 });
    }
    const user = sessionRes?.session?.user;
    if (!user) {
      return NextResponse.json(
        { error: "NOT_AUTHENTICATED", hint: "No session cookie received by route" },
        { status: 401 }
      );
    }

    const premiumCheck = await assertPremiumAccess(supabase, user.id);
    if (!premiumCheck.ok) {
      return NextResponse.json(
        {
          error: premiumCheck.error,
          message: premiumCheck.message,
        },
        { status: premiumCheck.status }
      );
    }
    const imprintCheck = await assertSellerImprintComplete(supabase, user.id);
    if (!imprintCheck.ok) {
      return NextResponse.json(
        { error: imprintCheck.error },
        { status: imprintCheck.status }
      );
    }

    const priceMode = imprintCheck.priceMode;

    const fd = await req.formData();
    // ✅ Lack-Felder (Formular-Keys) -> DB-Spalten
const color_palette = toStr(fd.get("farbpalette")).trim() || null;
const gloss_level   = toStr(fd.get("glanzgrad")).trim() || null;
const surface       = toStr(fd.get("oberflaeche")).trim() || null;
const application   = toStr(fd.get("anwendung")).trim() || null;
const color_tone    = toStr(fd.get("farbton")).trim() || null;
const color_code    = toStr(fd.get("farbcode")).trim() || null;
const quality       = toStr(fd.get("qualitaet")).trim() || null;

const effect          = jsonStringArray(fd, "effekt");
const special_effects = jsonStringArray(fd, "sondereffekte");
const certifications  = jsonStringArray(fd, "zertifizierungen");
const charge          = jsonStringArray(fd, "aufladung"); // Pulverlack


    const category = toStr(fd.get("kategorie")).trim();
    const sellTo = toStr(fd.get("verkaufAn")).trim();
    const title = toStr(fd.get("titel")).trim();
    const manufacturer = toStr(fd.get("hersteller")).trim();
    const description = toStr(fd.get("beschreibung")).trim();
    // Arbeitsmittel-spezifisch
const size =
  isPieceCategory(category) ? toStr(fd.get("groesse")).trim() : "";

const piecesPerUnit =
  isPieceCategory(category) ? toInt(toStr(fd.get("stueckProEinheit")), 0) : 0;

// optional, aber sinnvoll: nur bei Arbeitsmittel hart validieren
if (isPieceCategory(category)) {
  if (!size) {
    return NextResponse.json({ error: "MISSING_SIZE" }, { status: 400 });
  }
  if (!piecesPerUnit || piecesPerUnit < 1) {
    return NextResponse.json({ error: "MISSING_PIECES_PER_UNIT" }, { status: 400 });
  }
}


    const conditionRaw = toStr(fd.get("zustand")).trim();
    const condition =
      conditionRaw === "neu"
        ? "Neu und ungeöffnet"
        : conditionRaw === "geöffnet"
        ? "Geöffnet und einwandfrei"
        : conditionRaw || null;

    const deliveryDays = toInt(toStr(fd.get("lieferWerktage")), 0);
    const stockStatus = toStr(fd.get("mengeStatus")).trim(); // "auf_lager" | "begrenzt"
    const verkaufsArt = toStr(fd.get("verkaufsArt")).trim(); // "gesamt" | "pro_kg" | "pro_stueck"

    // ✅ NEU: Wir akzeptieren jetzt URLs (vom Client hochgeladen)
    const imageUrlsFromClient =
      parseUrlList(fd, ["imageUrls", "image_urls", "image_urls_json"]) ?? [];
    const fileUrlsFromClient =
      parseUrlList(fd, ["fileUrls", "file_urls", "file_urls_json"]) ?? [];

    // Fallback: falls doch noch Dateien über FormData kommen (kleine Dateien ok)
    const images = fd.getAll("bilder").filter((x) => x instanceof File) as File[];
    const files = fd.getAll("dateien").filter((x) => x instanceof File) as File[];

    if (!category || !sellTo || !title || !manufacturer) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }
    if (!conditionRaw) {
      return NextResponse.json({ error: "MISSING_CONDITION" }, { status: 400 });
    }
    if (!deliveryDays || deliveryDays < 1) {
      return NextResponse.json({ error: "INVALID_DELIVERY_DAYS" }, { status: 400 });
    }
    if (!verkaufsArt) {
      return NextResponse.json({ error: "MISSING_VERKAUFSART" }, { status: 400 });
    }

    // ✅ Bildpflicht: entweder URLs ODER Dateien
    const hasImages = imageUrlsFromClient.length > 0 || images.length > 0;
    if (!hasImages) {
      return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
    }

    // Mengen
    const qtyKg =
      stockStatus === "begrenzt" && !isPieceCategory(category)
        ? toNum(toStr(fd.get("mengeKg")), 0)
        : null;

    const qtyPiece =
      stockStatus === "begrenzt" && isPieceCategory(category)
        ? toInt(toStr(fd.get("mengeStueck")), 0)
        : null;

    const promoScore = 0;

    // 1) Artikel anlegen
    const insertPayload: any = {
      title,
      description,
      category,
      sell_to: sellTo,
      manufacturer,
      condition,
      sale_type: verkaufsArt,
      price_mode: priceMode,
      // ✅ nur für Lacke (arbeitsmittel bekommt automatisch null/[])
color_palette: isPieceCategory(category) ? null : color_palette,
gloss_level:   isPieceCategory(category) ? null : gloss_level,
surface:       isPieceCategory(category) ? null : surface,
application:   isPieceCategory(category) ? null : application,
color_tone:    isPieceCategory(category) ? null : color_tone,
color_code:    isPieceCategory(category) ? null : color_code,
quality:       isPieceCategory(category) ? null : quality,

effect:          isPieceCategory(category) ? [] : effect,
special_effects: isPieceCategory(category) ? [] : special_effects,
certifications:  isPieceCategory(category) ? [] : certifications,
charge:          category === "pulverlack" ? charge : [],

      promo_score: promoScore,
      delivery_days: deliveryDays,
      stock_status: stockStatus || (qtyKg || qtyPiece ? "begrenzt" : "auf_lager"),
      qty_kg: qtyKg,
      qty_piece: qtyPiece,

      // kommen nachher rein:
      image_urls: [],
      file_urls: [],

      published: true,
      sold_out: false,
      archived: false,
      size: isPieceCategory(category) ? (size || null) : null,
      pieces_per_unit: isPieceCategory(category) ? (piecesPerUnit || null) : null,

      owner_id: user.id,
    };

    let createdId: string | null = null;

    const firstInsert = await supabase.from("articles").insert(insertPayload).select("id").single();
    if (firstInsert.error) {
      if (/owner_id/i.test(firstInsert.error.message)) {
        delete insertPayload.owner_id;
        const retry = await supabase.from("articles").insert(insertPayload).select("id").single();
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 });
        createdId = (retry.data as any)?.id ?? null;
      } else {
        return NextResponse.json({ error: firstInsert.error.message }, { status: 500 });
      }
    } else {
      createdId = (firstInsert.data as any)?.id ?? null;
    }

    const articleId = createdId;
    if (!articleId) {
      return NextResponse.json({ error: "ARTICLE_CREATE_FAILED" }, { status: 500 });
    }

    // 2) URLs bestimmen:
    //    - bevorzugt: vom Client hochgeladene URLs
    //    - fallback: Upload über Route (nur wenn Dateien vorhanden)
    let imageUrls: string[] = imageUrlsFromClient;
    let fileUrls: string[] = fileUrlsFromClient;

    if (!imageUrls.length && images.length) {
      try {
        imageUrls = await uploadPublicFiles({
          supabase,
          bucket: "articles",
          basePath: `articles/${articleId}/images`,
          files: images,
        });
      } catch (e: any) {
        await supabase.from("articles").update({ published: false, archived: true }).eq("id", articleId);
        return NextResponse.json({ error: e?.message ?? "UPLOAD_FAILED" }, { status: 500 });
      }
    }

    if (!fileUrls.length && files.length) {
      try {
        fileUrls = await uploadPublicFiles({
          supabase,
          bucket: "articles",
          basePath: `articles/${articleId}/files`,
          files,
        });
      } catch {
        // Dateien optional -> nicht abbrechen
        fileUrls = [];
      }
    }

    // 3) Artikel updaten
    const upd = await supabase
      .from("articles")
      .update({ image_urls: imageUrls, file_urls: fileUrls })
      .eq("id", articleId);

    if (upd.error) {
      return NextResponse.json({ error: upd.error.message }, { status: 500 });
    }

    // 4) Preise / Staffeln
    const unit: "kg" | "stueck" =
      verkaufsArt === "pro_stueck" || isPieceCategory(category) ? "stueck" : "kg";

    if (verkaufsArt === "pro_kg" || verkaufsArt === "pro_stueck") {
      const staffelnRaw = toStr(fd.get("preisStaffeln"));
      const staffeln = safeJson<StaffelRow[]>(staffelnRaw, []);

      const tiers = staffeln
        .map((s) => {
          const minQty = s.minMenge?.trim() ? Math.max(1, toInt(s.minMenge.trim(), 1)) : 1;

          let maxQty = s.maxMenge?.trim() ? Math.max(1, toInt(s.maxMenge.trim(), 1)) : null;
          if (maxQty !== null && maxQty <= minQty) maxQty = minQty + 1;

          const price = toNum(s.preis?.trim() ?? "", 0);
          const shipping = toNum(s.versand?.trim() ?? "", 0);
          if (!price || price <= 0) return null;

          return {
            article_id: articleId,
            unit,
            min_qty: minQty,
            max_qty: maxQty,
            price,
            shipping,
          };
        })
        .filter(Boolean);

      if (!tiers.length) {
        return NextResponse.json({ error: "NO_VALID_TIERS" }, { status: 400 });
      }

      await insertPriceTiersWithFallback({ supabase, tiers });
    } else {
      const price = toNum(toStr(fd.get("preis")), 0);
      const shipping = toNum(toStr(fd.get("versandKosten")), 0);

      if (!price || price <= 0) {
        return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
      }

      const tiers = [
        {
          article_id: articleId,
          unit,
          min_qty: 1,
          max_qty: null,
          price,
          shipping,
        },
      ];

      await insertPriceTiersWithFallback({ supabase, tiers });
    }

    return NextResponse.json({ ok: true, id: articleId }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
export async function PUT(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();

    // Auth nötig
    const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });

    const user = sessionRes?.session?.user;
    if (!user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const premiumCheck = await assertPremiumAccess(supabase, user.id);
    if (!premiumCheck.ok) {
      return NextResponse.json(
        {
          error: premiumCheck.error,
          message: premiumCheck.message,
        },
        { status: premiumCheck.status }
      );
    }
    const imprintCheck = await assertSellerImprintComplete(supabase, user.id);
    if (!imprintCheck.ok) {
      return NextResponse.json(
        { error: imprintCheck.error },
        { status: imprintCheck.status }
      );
    }

    const fd = await req.formData();
    const id = toStr(fd.get("id")).trim();
    if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    // Ownership check
    const ownerCheck = await supabase
      .from("articles")
      .select("owner_id, price_mode")
      .eq("id", id)
      .single();
    if (ownerCheck.error) return NextResponse.json({ error: ownerCheck.error.message }, { status: 404 });
    if ((ownerCheck.data as any)?.owner_id && (ownerCheck.data as any).owner_id !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Lack-Felder
    const category = toStr(fd.get("kategorie")).trim();
    const sellTo = toStr(fd.get("verkaufAn")).trim();
    const title = toStr(fd.get("titel")).trim();
    const manufacturer = toStr(fd.get("hersteller")).trim();
    const description = toStr(fd.get("beschreibung")).trim();

    const color_palette = toStr(fd.get("farbpalette")).trim() || null;
    const gloss_level   = toStr(fd.get("glanzgrad")).trim() || null;
    const surface       = toStr(fd.get("oberflaeche")).trim() || null;
    const application   = toStr(fd.get("anwendung")).trim() || null;
    const color_tone    = toStr(fd.get("farbton")).trim() || null;
    const color_code    = toStr(fd.get("farbcode")).trim() || null;
    const quality       = toStr(fd.get("qualitaet")).trim() || null;

    const effect          = jsonStringArray(fd, "effekt");
    const special_effects = jsonStringArray(fd, "sondereffekte");
    const certifications  = jsonStringArray(fd, "zertifizierungen");
    const charge          = jsonStringArray(fd, "aufladung");

    // Arbeitsmittel-Felder
    const size = isPieceCategory(category) ? toStr(fd.get("groesse")).trim() : "";
    const piecesPerUnit =
      isPieceCategory(category) ? toInt(toStr(fd.get("stueckProEinheit")), 0) : 0;

    const conditionRaw = toStr(fd.get("zustand")).trim();
    const condition =
      conditionRaw === "neu"
        ? "Neu und ungeöffnet"
        : conditionRaw === "geöffnet"
        ? "Geöffnet und einwandfrei"
        : conditionRaw || null;

    const deliveryDays = toInt(toStr(fd.get("lieferWerktage")), 0);
    const stockStatus = toStr(fd.get("mengeStatus")).trim();
    const verkaufsArt = toStr(fd.get("verkaufsArt")).trim();

    // URLs vom Client
    const imageUrlsFromClient =
      parseUrlList(fd, ["imageUrls", "image_urls", "image_urls_json"]) ?? [];
    const fileUrlsFromClient =
      parseUrlList(fd, ["fileUrls", "file_urls", "file_urls_json"]) ?? [];

    // Fallback: falls doch Dateien kommen
    const images = fd.getAll("bilder").filter((x) => x instanceof File) as File[];
    const files = fd.getAll("dateien").filter((x) => x instanceof File) as File[];

    if (!category || !sellTo || !title || !manufacturer) {
      return NextResponse.json({ error: "MISSING_REQUIRED_FIELDS" }, { status: 400 });
    }
    if (!deliveryDays || deliveryDays < 1) {
      return NextResponse.json({ error: "INVALID_DELIVERY_DAYS" }, { status: 400 });
    }
    if (!verkaufsArt) {
      return NextResponse.json({ error: "MISSING_VERKAUFSART" }, { status: 400 });
    }

    // Mengen
    const qtyKg =
      stockStatus === "begrenzt" && !isPieceCategory(category)
        ? toNum(toStr(fd.get("mengeKg")), 0)
        : null;

    const qtyPiece =
      stockStatus === "begrenzt" && isPieceCategory(category)
        ? toInt(toStr(fd.get("mengeStueck")), 0)
        : null;

    // URLs bestimmen (Client bevorzugt, sonst fallback upload)
    let imageUrls: string[] = imageUrlsFromClient;
    let fileUrls: string[] = fileUrlsFromClient;

    if (!imageUrls.length && images.length) {
      imageUrls = await uploadPublicFiles({
        supabase,
        bucket: "articles",
        basePath: `articles/${id}/images`,
        files: images,
      });
    }
    if (!fileUrls.length && files.length) {
      try {
        fileUrls = await uploadPublicFiles({
          supabase,
          bucket: "articles",
          basePath: `articles/${id}/files`,
          files,
        });
      } catch {
        fileUrls = [];
      }
    }

    // Bildpflicht beim Update: entweder vorhandene URLs oder neue
    if (!imageUrls.length) {
      return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
    }

    // price_mode beim Bearbeiten bewusst nicht ändern:
    // legacy_gross bleibt legacy_gross; neue Artikel behalten ihren ursprünglichen Modus.
    const updatePayload: any = {
      title,
      description,
      category,
      sell_to: sellTo,
      manufacturer,
      condition,
      sale_type: verkaufsArt,

      color_palette: isPieceCategory(category) ? null : color_palette,
      gloss_level:   isPieceCategory(category) ? null : gloss_level,
      surface:       isPieceCategory(category) ? null : surface,
      application:   isPieceCategory(category) ? null : application,
      color_tone:    isPieceCategory(category) ? null : color_tone,
      color_code:    isPieceCategory(category) ? null : color_code,
      quality:       isPieceCategory(category) ? null : quality,

      effect:          isPieceCategory(category) ? [] : effect,
      special_effects: isPieceCategory(category) ? [] : special_effects,
      certifications:  isPieceCategory(category) ? [] : certifications,
      charge:          category === "pulverlack" ? charge : [],

      delivery_days: deliveryDays,
      stock_status: stockStatus || (qtyKg || qtyPiece ? "begrenzt" : "auf_lager"),
      qty_kg: qtyKg,
      qty_piece: qtyPiece,

      image_urls: imageUrls,
      file_urls: fileUrls,

      size: isPieceCategory(category) ? (size || null) : null,
      pieces_per_unit: isPieceCategory(category) ? (piecesPerUnit || null) : null,

      updated_at: new Date().toISOString(),
    };

    const upd = await supabase.from("articles").update(updatePayload).eq("id", id);
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 500 });

    // Preisstaffeln ersetzen
    await supabase.from("article_price_tiers").delete().eq("article_id", id);

    const unit: "kg" | "stueck" =
      verkaufsArt === "pro_stueck" || isPieceCategory(category) ? "stueck" : "kg";

    if (verkaufsArt === "pro_kg" || verkaufsArt === "pro_stueck") {
      const staffelnRaw = toStr(fd.get("preisStaffeln"));
      const staffeln = safeJson<StaffelRow[]>(staffelnRaw, []);

      const tiers = staffeln
        .map((s) => {
          const minQty = s.minMenge?.trim() ? Math.max(1, toInt(s.minMenge.trim(), 1)) : 1;
          let maxQty = s.maxMenge?.trim() ? Math.max(1, toInt(s.maxMenge.trim(), 1)) : null;
          if (maxQty !== null && maxQty < minQty) maxQty = minQty;

          const price = toNum(s.preis?.trim() ?? "", 0);
          const shipping = toNum(s.versand?.trim() ?? "", 0);
          if (!price || price <= 0) return null;

          return { article_id: id, unit, min_qty: minQty, max_qty: maxQty, price, shipping };
        })
        .filter(Boolean);

      if (!tiers.length) return NextResponse.json({ error: "NO_VALID_TIERS" }, { status: 400 });
      await insertPriceTiersWithFallback({ supabase, tiers });
    } else {
      const price = toNum(toStr(fd.get("preis")), 0);
      const shipping = toNum(toStr(fd.get("versandKosten")), 0);
      if (!price || price <= 0) return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });

      const tiers = [{ article_id: id, unit, min_qty: 1, max_qty: null, price, shipping }];
      await insertPriceTiersWithFallback({ supabase, tiers });
    }

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
