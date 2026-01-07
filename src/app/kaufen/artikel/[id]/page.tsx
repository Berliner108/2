"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./ArtikelDetail.module.css";
import Navbar from "../../../components/navbar/Navbar";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { supabaseBrowser } from "@/lib/supabase-browser";

/* ===================== Typen ===================== */
type Tier = {
  id: string;
  unit: "kg" | "stueck";
  min_qty: number;
  max_qty: number | null;
  price: number;
  shipping?: number | null;
};

type Seller = {
  id: string;
  username: string | null;
  account_type: "business" | "private" | string | null;
  rating_avg: number | null;
  rating_count: number | null;
};

type Article = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  sell_to?: "gewerblich" | "beide" | null;
  manufacturer?: string | null;
  promo_score?: number | null;
  delivery_days?: number | null;
  delivery_date_iso?: string | null;
  stock_status?: "auf_lager" | "begrenzt" | null;
  qty_kg?: number | null;
  qty_piece?: number | null;
  image_urls?: string[] | null;
  file_urls?: string[] | null;
  sale_type: "gesamt" | "pro_kg" | "pro_stueck";
  condition?: string | null;

  price_from?: number | null;
  price_unit?: "kg" | "stueck" | null;
};

/* ===================== UI Helper ===================== */
function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>
      <div className={styles.skelTwoCols}>
        <div className={styles.skelDrop} />
        <div className={styles.skelGrid}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>
      </div>
      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />
    </div>
  );
}

function unitLabel(u: "kg" | "stueck") {
  return u === "stueck" ? "Stück" : "kg";
}

function pickTier(tiers: Tier[], unit: "kg" | "stueck", qty: number): Tier | null {
  const list = tiers
    .filter((t) => t.unit === unit)
    .sort((a, b) => a.min_qty - b.min_qty);

  for (const t of list) {
    const maxOk = t.max_qty == null ? true : qty <= t.max_qty;
    if (qty >= t.min_qty && maxOk) return t;
  }
  if (list.length) return list[list.length - 1];
  return null;
}

/* ===== Handle/Reviews/Kontakt (wie Lackanfragen) ===== */
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,30}[A-Za-z0-9])?$/;
const looksLikeHandle = (s?: string | null) => !!(s && HANDLE_RE.test(s.trim()));

function profileReviewsHref(username: string | null | undefined): string | undefined {
  if (!username) return undefined;
  if (!looksLikeHandle(username)) return undefined;
  return `/u/${username}/reviews`;
}

/* ===================== Seite ===================== */
export default function ArtikelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);

  // Viewer (profiles.account_type)
  const [viewerChecked, setViewerChecked] = useState(false);
  const [viewerIsBusiness, setViewerIsBusiness] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Kaufen UI
  const [unit, setUnit] = useState<"kg" | "stueck">("kg");
  const [qty, setQty] = useState<number>(1);

  // 1) Viewer laden (profiles.account_type)
  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      try {
        const supa = supabaseBrowser();
        const { data } = await supa.auth.getUser();
        const user = data.user;

        if (!user) {
          if (!cancelled) setViewerIsBusiness(false);
          return;
        }

        const { data: prof, error } = await supa
          .from("profiles")
          .select("account_type")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          if (!cancelled) setViewerIsBusiness(false);
          return;
        }

        if (!cancelled) setViewerIsBusiness(prof?.account_type === "business");
      } finally {
        if (!cancelled) setViewerChecked(true);
      }
    }

    loadViewer();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Artikel laden
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/articles/${params.id}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 404) {
            setArticle(null);
            setTiers([]);
            setSeller(null);
            return;
          }
          throw new Error(json?.error ?? "Fehler beim Laden");
        }

        const a = json.article as Article;
        const t = (json.tiers ?? []) as Tier[];
        const s = (json.seller ?? null) as Seller | null;

        if (!cancelled) {
          setArticle(a);
          setTiers(t);
          setSeller(s);

          // Default unit
          if (a.sale_type === "pro_stueck") setUnit("stueck");
          else if (a.sale_type === "pro_kg") setUnit("kg");
          else if (a.price_unit) setUnit(a.price_unit);

          setQty(1);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message ?? "Unbekannter Fehler");
          setArticle(null);
          setTiers([]);
          setSeller(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const bilder = article?.image_urls ?? [];
  const dateien = article?.file_urls ?? [];
  const slides = bilder.map((src) => ({ src }));

  const deliveryDateText = useMemo(() => {
    if (!article?.delivery_date_iso) return "—";
    return new Date(`${article.delivery_date_iso}T00:00:00`).toLocaleDateString("de-DE");
  }, [article?.delivery_date_iso]);

  const sellerTypeLabel =
    seller?.account_type === "business"
      ? "Gewerblich"
      : seller?.account_type === "private"
      ? "Privat"
      : null;

  const sellerTypeClass =
    seller?.account_type === "business" ? styles.gewerblich : styles.privat;

  const reviewsHref = useMemo(() => profileReviewsHref(seller?.username ?? null), [seller?.username]);
  const messageTarget = useMemo(() => encodeURIComponent(seller?.username ?? ""), [seller?.username]);

  const availableUnits = useMemo(() => {
    const set = new Set<"kg" | "stueck">();
    for (const t of tiers) set.add(t.unit);
    return Array.from(set);
  }, [tiers]);

  // ✅ NEU: echte Staffelpreise? (mind. 2 Tiers für die aktuell gewählte Einheit)
  const hasStaffelpreise = useMemo(() => {
    if (!article) return false;
    if (article.sale_type === "gesamt") return false;
    return tiers.filter((t) => t.unit === unit).length > 1;
  }, [article, tiers, unit]);

  const stockLimit = useMemo(() => {
    if (!article) return null;
    if (article.stock_status !== "begrenzt") return null;
    if (unit === "kg") return article.qty_kg ?? null;
    return article.qty_piece ?? null;
  }, [article, unit]);

  const chosenTier = useMemo(() => {
    if (!article) return null;
    if (article.sale_type === "gesamt") return tiers[0] ?? null;
    return pickTier(tiers, unit, qty);
  }, [article, tiers, unit, qty]);

  const priceCalc = useMemo(() => {
    if (!article || !chosenTier) return null;

    const p = Number(chosenTier.price ?? 0);
    const ship = Number(chosenTier.shipping ?? 0);

    if (article.sale_type === "gesamt") {
      return { unitPrice: p, shipping: ship, total: p + ship };
    }

    const total = qty * p + ship;
    return { unitPrice: p, shipping: ship, total };
  }, [article, chosenTier, qty]);

  const disableBuy = useMemo(() => {
    if (!article) return true;
    if (!chosenTier) return true;
    if (qty < 1) return true;
    if (stockLimit != null && qty > stockLimit) return true;
    return false;
  }, [article, chosenTier, qty, stockLimit]);

  // ===== Loading
  if (loading) {
    return (
      <>
        <Navbar />
        <TopLoader />
        <div className={styles.container}>
          <DetailSkeleton />
        </div>
      </>
    );
  }

  // ===== Not found
  if (!article) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <h1 className={styles.title}>Artikel nicht gefunden</h1>
          <button className={styles.submitOfferButton} onClick={() => router.push("/kaufen")}>
            Zurück zum Shop
          </button>
        </div>
      </>
    );
  }

  // ===== Zugriffsschutz (sell_to = gewerblich)
  if (viewerChecked && (article.sell_to ?? "beide") === "gewerblich" && !viewerIsBusiness) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div
            role="status"
            aria-live="polite"
            style={{
              display: "block",
              marginTop: 16,
              padding: "16px 20px",
              border: "2px solid #d9d9d9",
              background: "#fafafa",
              color: "#444",
              fontWeight: 600,
              textAlign: "center",
              borderRadius: 12,
            }}
          >
            Dieser Artikel ist nur für <strong>gewerbliche</strong> Nutzer sichtbar.
          </div>
          <button
            className={styles.submitOfferButton}
            style={{ marginTop: 12 }}
            onClick={() => router.push("/kaufen")}
          >
            Zurück zum Shop
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className={styles.container}>
        {loadError && (
          <div style={{ padding: "10px 0" }}>
            <strong>Fehler:</strong> {loadError}
          </div>
        )}

        <div className={styles.grid}>
          {/* Linke Spalte: Bilder */}
          <div className={styles.leftColumn}>
            <img
              src={bilder?.[photoIndex] || "/images/platzhalter.jpg"}
              alt={article.title}
              className={styles.image}
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: "pointer" }}
            />
            <div className={styles.thumbnails}>
              {bilder?.map((bild, i) => (
                <img
                  key={i}
                  src={bild}
                  alt={`Bild ${i + 1}`}
                  className={`${styles.thumbnail} ${i === photoIndex ? styles.activeThumbnail : ""}`}
                  onClick={() => setPhotoIndex(i)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Infos */}
          <div className={styles.rightColumn}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{article.title}</h1>
              {(article.promo_score ?? 0) > 0 && (
                <span className={`${styles.badge} ${styles.gesponsert}`}>Gesponsert</span>
              )}
            </div>

            {/* ✅ Badge = Usertyp des VERKÄUFERS */}
            <div className={styles.badges}>
              {sellerTypeLabel && (
                <span className={`${styles.badge} ${sellerTypeClass}`}>{sellerTypeLabel}</span>
              )}
            </div>

            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.label}>Lieferdatum bis:</span>
                <span className={styles.value}>{deliveryDateText}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Hersteller:</span>
                <span className={styles.value}>{article.manufacturer ?? "—"}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Kategorie:</span>
                <span className={styles.value}>{article.category ?? "—"}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Zustand:</span>
                <span className={styles.value}>{article.condition ?? "—"}</span>
              </div>

              {/* ✅ FIX: Preis ab -> Preis, wenn keine Staffelpreise */}
              <div className={styles.metaItem}>
                <span className={styles.label}>{hasStaffelpreise ? "Preis ab:" : "Preis:"}</span>
                <span className={styles.value}>
                  {article.price_from != null ? Number(article.price_from).toFixed(2) : "—"} €
                  {article.price_unit ? ` / ${unitLabel(article.price_unit)}` : ""}
                </span>
              </div>

              {/* Verfügbarkeit: immer anzeigen (kg + Stück), wenn vorhanden */}
              <div className={styles.metaItem}>
                <span className={styles.label}>Verfügbarkeit:</span>
                <span className={styles.value}>
                  {article.stock_status === "begrenzt" ? "Begrenzt" : "Auf Lager"}
                  {article.qty_kg != null || article.qty_piece != null ? (
                    <>
                      {" "}
                      · {article.qty_kg != null ? `${Number(article.qty_kg)} kg` : null}
                      {article.qty_kg != null && article.qty_piece != null ? " · " : null}
                      {article.qty_piece != null ? `${Number(article.qty_piece)} Stück` : null}
                    </>
                  ) : null}
                </span>
              </div>

              {/* Seller Box: Username + Rating + Kontakt-Link */}
              {seller?.username && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>User:</span>
                  <span className={styles.value}>
                    {reviewsHref ? (
                      <Link href={reviewsHref} className={styles.kontaktLink} title="Zu den Bewertungen">
                        {seller.username}
                      </Link>
                    ) : (
                      seller.username
                    )}
                  </span>

                  <div className={styles.userRating} style={{ marginTop: 6 }}>
                    {seller.rating_count && Number(seller.rating_count) > 0 && seller.rating_avg != null ? (
                      <>
                        Bewertung: {Number(seller.rating_avg).toFixed(2)}/5 · {Number(seller.rating_count)} Bewertung
                        {Number(seller.rating_count) === 1 ? "" : "en"}
                      </>
                    ) : (
                      <>Bewertung: Noch keine Bewertungen</>
                    )}
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <Link href={`/messages?empfaenger=${messageTarget}`} className={styles.kontaktLink}>
                      User kontaktieren
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {article.description && (
              <div className={styles.beschreibung}>
                <h2>Beschreibung</h2>
                <p className={styles.preserveNewlines}>{article.description}</p>
              </div>
            )}

            {/* Staffelpreise / Gesamtpreis */}
            <div className={styles.beschreibung}>
              <h2>{article.sale_type === "gesamt" || !hasStaffelpreise ? "Preis" : "Staffelpreise"}</h2>

              {tiers.length === 0 ? (
                <p>Keine Preisinformationen gefunden.</p>
              ) : article.sale_type === "gesamt" ? (
                <p>
                  Gesamtpreis: <strong>{Number(tiers[0]?.price ?? 0).toFixed(2)} €</strong>
                  {tiers[0]?.shipping != null ? (
                    <>
                      {" "}
                      + Versand: <strong>{Number(tiers[0]?.shipping ?? 0).toFixed(2)} €</strong>
                    </>
                  ) : null}
                </p>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {tiers
                    .filter((t) => t.unit === unit)
                    .map((t) => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <span>
                          {t.min_qty}
                          {t.max_qty != null ? `–${t.max_qty}` : "+"} {unitLabel(t.unit)}
                        </span>
                        <span>
                          <strong>{Number(t.price).toFixed(2)} €</strong> / {unitLabel(t.unit)}
                          {t.shipping != null ? ` · Versand ${Number(t.shipping).toFixed(2)} €` : ""}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className={styles.beschreibung}>
            <h2>Dateien</h2>

            {dateien.length === 0 ? (
              <p>Keine Dateien vorhanden.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {dateien.map((url, i) => {
                  const name = decodeURIComponent(url.split("/").pop() ?? `Datei-${i + 1}`);
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.kontaktLink}
                    >
                      {name}
                    </a>
                  );
                })}
              </div>
            )}
          </div>


            {/* Kaufen UI (ohne Warenkorb) */}
            <div className={styles.offerBox}>
              <div className={styles.inputGroup}>
                <strong>Kaufen</strong>

                {article.sale_type !== "gesamt" && availableUnits.length > 0 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                    <label style={{ fontWeight: 600 }}>Einheit:</label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className={styles.priceField}>
                      {availableUnits.map((u) => (
                        <option key={u} value={u}>
                          {unitLabel(u)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
                  <label style={{ fontWeight: 600 }}>Menge:</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={article.sale_type === "gesamt" ? 1 : qty}
                    disabled={article.sale_type === "gesamt"}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                    className={styles.priceField}
                    placeholder="Menge"
                  />
                  <span style={{ opacity: 0.8 }}>{article.sale_type === "gesamt" ? "" : unitLabel(unit)}</span>
                </div>

                {stockLimit != null && (
                  <div style={{ marginTop: 8, opacity: 0.85 }}>
                    Max verfügbar: {stockLimit} {unitLabel(unit)}
                  </div>
                )}

                {chosenTier && priceCalc && (
                  <div style={{ marginTop: 12 }}>
                    {/* ✅ FIX: "Staffel aktiv" nur bei echten Staffelpreisen */}
                    {hasStaffelpreise && (
                      <div style={{ opacity: 0.9 }}>
                        Staffel aktiv: {chosenTier.min_qty}
                        {chosenTier.max_qty != null ? `–${chosenTier.max_qty}` : "+"} {unitLabel(chosenTier.unit)}
                      </div>
                    )}

                    <div style={{ marginTop: 6 }}>
                      <div>
                        Einzelpreis: <strong>{priceCalc.unitPrice.toFixed(2)} €</strong>
                        {article.sale_type === "gesamt" ? "" : ` / ${unitLabel(unit)}`}
                      </div>
                      <div>
                        Versand: <strong>{priceCalc.shipping.toFixed(2)} €</strong>
                      </div>
                      <div style={{ marginTop: 4, fontSize: "1.05rem" }}>
                        Gesamt: <strong>{priceCalc.total.toFixed(2)} €</strong>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    className={styles.submitOfferButton}
                    disabled={disableBuy}
                    onClick={() => alert("✅ UI steht. Checkout/Orders bauen wir als nächsten Block.")}
                  >
                    Jetzt kaufen
                  </button>
                </div>

                {disableBuy && (
                  <p className={styles.offerNote} style={{ color: "#b00020" }}>
                    Bitte Menge/Einheit prüfen (oder Bestand überschritten).
                  </p>
                )}

                <p className={styles.offerNote}>
                  Preise sind <strong>Brutto</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && slides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={slides}
          index={photoIndex}
          plugins={[Thumbnails]}
          thumbnails={{ vignette: true }}
          on={{ view: ({ index }) => setPhotoIndex(index) }}
        />
      )}
    </>
  );
}
