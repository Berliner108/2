"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./ArtikelDetail.module.css";
import Navbar from "../../../components/navbar/Navbar";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

type Tier = {
  id: string;
  unit: "kg" | "stueck";
  min_qty: number;
  max_qty: number | null;
  price: number;
  shipping?: number | null;
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
  sale_type: "gesamt" | "pro_kg" | "pro_stueck";
  price_from?: number | null;
  price_unit?: "kg" | "stueck" | null;
};

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

  // falls qty über der letzten Staffel liegt
  if (list.length) return list[list.length - 1];
  return null;
}

export default function ArtikelDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [article, setArticle] = useState<Article | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Kaufen UI
  const [unit, setUnit] = useState<"kg" | "stueck">("kg");
  const [qty, setQty] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/articles/${params.id}`, { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setArticle(null);
            setTiers([]);
            return;
          }
          throw new Error(json?.error ?? "Fehler beim Laden");
        }

        const a = json.article as Article;
        const t = (json.tiers ?? []) as Tier[];

        if (!cancelled) {
          setArticle(a);
          setTiers(t);

          // Default unit: API liefert günstigste unit (price_unit)
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
  const slides = bilder.map((src) => ({ src }));

  const deliveryDateText = useMemo(() => {
    if (!article?.delivery_date_iso) return "—";
    return new Date(`${article.delivery_date_iso}T00:00:00`).toLocaleDateString("de-DE");
  }, [article?.delivery_date_iso]);

  const availableUnits = useMemo(() => {
    const set = new Set<"kg" | "stueck">();
    for (const t of tiers) set.add(t.unit);
    return Array.from(set);
  }, [tiers]);

  const stockLimit = useMemo(() => {
    if (!article) return null;
    if (article.stock_status !== "begrenzt") return null;
    if (unit === "kg") return article.qty_kg ?? null;
    return article.qty_piece ?? null;
  }, [article, unit]);

  const chosenTier = useMemo(() => {
    if (!article) return null;

    if (article.sale_type === "gesamt") {
      // bei gesamt nehmen wir einfach die erste Staffel (i.d.R. 1 Zeile)
      return tiers[0] ?? null;
    }
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
                <span className={styles.label}>Verkauf an:</span>
                <span className={styles.value}>{article.sell_to === "gewerblich" ? "Gewerblich" : "Beide"}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Preis ab:</span>
                <span className={styles.value}>
                  {Number(article.price_from ?? 0).toFixed(2)} € {article.price_unit ? `/ ${unitLabel(article.price_unit)}` : ""}
                </span>
              </div>

              {article.stock_status === "begrenzt" && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Auf Lager:</span>
                  <span className={styles.value}>
                    {unit === "kg" ? (article.qty_kg ?? 0) : (article.qty_piece ?? 0)} {unitLabel(unit)}
                  </span>
                </div>
              )}

              {article.description && (
                <div className={styles.beschreibung}>
                  <h2>Beschreibung</h2>
                  <p>{article.description}</p>
                </div>
              )}
            </div>

            {/* Staffelpreise / Gesamtpreis */}
            <div className={styles.beschreibung}>
              <h2>{article.sale_type === "gesamt" ? "Preis" : "Staffelpreise"}</h2>

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

            {/* Kaufen UI */}
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

                {chosenTier && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ opacity: 0.9 }}>
                      Staffel aktiv: {chosenTier.min_qty}
                      {chosenTier.max_qty != null ? `–${chosenTier.max_qty}` : "+"} {unitLabel(chosenTier.unit)}
                    </div>
                    {priceCalc && (
                      <div style={{ marginTop: 6 }}>
                        <div>Einzelpreis: <strong>{priceCalc.unitPrice.toFixed(2)} €</strong>{article.sale_type === "gesamt" ? "" : ` / ${unitLabel(unit)}`}</div>
                        <div>Versand: <strong>{priceCalc.shipping.toFixed(2)} €</strong></div>
                        <div style={{ marginTop: 4, fontSize: "1.05rem" }}>
                          Gesamt: <strong>{priceCalc.total.toFixed(2)} €</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button
                    className={styles.submitOfferButton}
                    disabled={disableBuy}
                    onClick={() => alert("✅ UI steht. Checkout/Orders bauen wir als nächstes.")}
                  >
                    Jetzt kaufen
                  </button>

                  <button
                    className={styles.submitOfferButton}
                    style={{ opacity: 0.9 }}
                    disabled={disableBuy}
                    onClick={() => alert("🛒 Warenkorb kommt als nächster Schritt.")}
                  >
                    In den Warenkorb
                  </button>
                </div>

                {disableBuy && (
                  <p className={styles.offerNote} style={{ color: "#b00020" }}>
                    Bitte Menge/Einheit prüfen (oder Bestand überschritten).
                  </p>
                )}

                <p className={styles.offerNote}>
                  Preise sind <strong>Brutto</strong>. Checkout/Bestellungen/Provision bauen wir als nächsten Block.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && (
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
