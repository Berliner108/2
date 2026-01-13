import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  // ✅ Article laden (nur eigener Artikel)
  const { data: article, error: aErr } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (aErr || !article) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // ✅ Staffeln laden (optional)
  const { data: tiers } = await supabase
    .from("article_price_tiers")
    .select("min_qty,max_qty,price,shipping")
    .eq("article_id", id)
    .order("min_qty", { ascending: true });

  const staffeln =
    Array.isArray(tiers) && tiers.length > 0
      ? tiers.map((t) => ({
          minMenge: String(t.min_qty ?? 1),
          maxMenge: t.max_qty == null ? "" : String(t.max_qty),
          preis: t.price == null ? "" : String(t.price).replace(".", ","),     // Anzeige
          versand: t.shipping == null ? "" : String(t.shipping).replace(".", ","),
        }))
      : [{ minMenge: "1", maxMenge: "", preis: "", versand: "" }];

  // ✅ Prefill-Shape wie in deinem useEffect erwartet
  const prefill = {
    id: String(article.id),
    kategorie: article.kategorie ?? article.category ?? null,

    titel: article.titel ?? article.title ?? "",
    beschreibung: article.beschreibung ?? article.description ?? "",
    verkaufAn: article.verkauf_an ?? article.sell_to ?? "",
    hersteller: article.hersteller ?? article.manufacturer ?? "",
    zustand: article.zustand ?? article.condition ?? "",

    aufLager: (article.menge_status ?? article.stock_status ?? "") === "auf_lager",
    mengeKg: Number(article.menge_kg ?? article.qty_kg ?? 0),
    mengeStueck: Number(article.menge_stueck ?? article.qty_piece ?? 0),

    lieferWerktage: String(article.liefer_werktage ?? article.delivery_days ?? ""),

    farbpalette: article.farbpalette ?? article.color_palette ?? "",
    farbton: article.farbton ?? article.color_tone ?? "",
    farbcode: article.farbcode ?? article.color_code ?? "",
    glanzgrad: article.glanzgrad ?? article.gloss_level ?? "",
    oberflaeche: article.oberflaeche ?? article.surface ?? "",
    anwendung: article.anwendung ?? article.application ?? "",
    qualitaet: article.qualitaet ?? article.quality ?? "",

    effekt: Array.isArray(article.effekt ?? article.effect) ? (article.effekt ?? article.effect) : [],
    sondereffekte: Array.isArray(article.sondereffekte ?? article.special_effects)
      ? (article.sondereffekte ?? article.special_effects)
      : [],
    zertifizierungen: Array.isArray(article.zertifizierungen ?? article.certifications)
      ? (article.zertifizierungen ?? article.certifications)
      : [],
    aufladung: Array.isArray(article.aufladung ?? article.charge) ? (article.aufladung ?? article.charge) : [],

    verkaufsArt: article.verkaufs_art ?? article.sale_type ?? "",
    preis: article.preis ?? article.price ?? null,
    versandKosten: article.versand_kosten ?? article.shipping ?? null,

    imageUrls: Array.isArray(article.image_urls) ? article.image_urls : [],
    fileUrls: Array.isArray(article.file_urls) ? article.file_urls : [],

    staffeln,
  };

  return NextResponse.json({ article: prefill });
}
