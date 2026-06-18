"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../../components/navbar/Navbar";
import BoerseLoading from "../../../components/loading/BoerseLoading";
import styles from "../../../kaufen/artikel/[id]/ArtikelDetail.module.css";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { FaFilePdf } from "react-icons/fa";

type ApiResponse = {
  order?: any;
  role?: "buyer" | "seller" | "none";
  error?: string;
};

function formatEUR(cents?: number | null) {
  const v = (typeof cents === "number" ? cents : 0) / 100;
  return v.toLocaleString("de-AT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "–";
  return d.toLocaleString("de-AT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(a: any) {
  if (!a) return "—";
  const street = [a.street, a.houseNumber].filter(Boolean).join(" ");
  const city = [a.zip, a.city].filter(Boolean).join(" ");
  const country = a.country ? String(a.country) : "";
  return [street, city, country].filter(Boolean).join(", ");
}

function statusLabel(status?: string | null) {
  if (status === "payment_pending") return "Zahlung offen";
  if (status === "paid") return "Bezahlt";
  if (status === "shipped") return "Versandt";
  if (status === "released") return "Abgeschlossen";
  if (status === "complaint_open") return "Reklamation offen";
  if (status === "refunded") return "Erstattet";
  return "Unbekannt";
}

function unitLabel(unit?: string | null) {
  return unit === "stueck" ? "Stück" : "kg";
}

function normalizeStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}

    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }

  return [];
}

function normalizeUrlArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);

  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];

    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}

    return [s];
  }

  return [];
}

const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,30}[A-Za-z0-9])?$/;

function profileReviewsHref(username?: string | null) {
  const s = typeof username === "string" ? username.trim() : "";
  if (!HANDLE_RE.test(s)) return undefined;
  return `/u/${s}/reviews`;
}

export default function ShopOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const orderId = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [role, setRole] = useState<"buyer" | "seller" | "none">("none");

  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/konto/shop-orders/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });

        const json: ApiResponse = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.error ?? "Bestellung konnte nicht geladen werden.");
        }

        if (!cancelled) {
          setOrder(json.order ?? null);
          setRole(json.role ?? "none");
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Unbekannter Fehler");
          setOrder(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (orderId) load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const snapshot = order?.article_snapshot ?? {};

  const joinedTitle = Array.isArray(order?.articles)
    ? order?.articles?.[0]?.title
    : order?.articles?.title;

  const title =
    snapshot?.title ??
    order?.article_title ??
    joinedTitle ??
    `Artikel ${String(order?.article_id ?? "").slice(0, 8)}`;

  const bilder = useMemo(() => normalizeUrlArray(snapshot?.image_urls), [snapshot?.image_urls]);
  const dateien = useMemo(() => normalizeUrlArray(snapshot?.file_urls), [snapshot?.file_urls]);

  const slides = bilder.map((src) => ({ src }));

  const effectList = useMemo(() => normalizeStringArray(snapshot?.effect), [snapshot?.effect]);
  const specialEffectsList = useMemo(
    () => normalizeStringArray(snapshot?.special_effects),
    [snapshot?.special_effects]
  );
  const certificationsList = useMemo(
    () => normalizeStringArray(snapshot?.certifications),
    [snapshot?.certifications]
  );
  const chargeList = useMemo(() => normalizeStringArray(snapshot?.charge), [snapshot?.charge]);

  const sellerReviewsHref = useMemo(
    () => profileReviewsHref(order?.seller_username ?? null),
    [order?.seller_username]
  );

  const buyerReviewsHref = useMemo(
    () => profileReviewsHref(order?.buyer_username ?? null),
    [order?.buyer_username]
  );

  if (loading) {
    return <BoerseLoading />;
  }

  return (
    <>
      <Navbar />

      <div className={styles.container}>
        <button
          type="button"
          className={`${styles.submitOfferButton} ${styles.orderBackButton}`}
          onClick={() => router.back()}
          style={{ marginBottom: 14 }}
        >
          Zurück
        </button>

        {error && (
          <div className={styles.beschreibung}>
            <strong>Fehler:</strong> {error}
          </div>
        )}

        {!error && order && (
          <div className={styles.detailGrid}>
            {/* Linke Spalte: Bilder */}
            <div className={styles.leftColumn}>
              <img
                src={bilder?.[photoIndex] || "/images/platzhalter.jpg"}
                alt={title}
                className={styles.image}
                onClick={() => bilder.length > 0 && setLightboxOpen(true)}
                style={{ cursor: bilder.length > 0 ? "pointer" : "default" }}
              />

              {bilder.length > 1 && (
                <div className={styles.thumbnails}>
                  {bilder.map((bild, i) => (
                    <img
                      key={`${bild}-${i}`}
                      src={bild}
                      alt={`Bild ${i + 1}`}
                      className={`${styles.thumbnail} ${i === photoIndex ? styles.activeThumbnail : ""}`}
                      onClick={() => setPhotoIndex(i)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Rechte Spalte */}
            <div className={styles.rightColumn}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{title}</h1>

                <div className={styles.badges}>
                  <span className={`${styles.badge} ${styles.gesponsert}`}>
                    {role === "seller" ? "Verkauf" : "Bestellung"}
                  </span>

                  <span className={`${styles.badge} ${styles.privat}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
              </div>

              <div className={styles.meta}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Menge:</span>
                  <span className={styles.value}>
                    {order.qty ?? "—"} {unitLabel(order.unit)}
                  </span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Hersteller:</span>
                  <span className={styles.value}>{snapshot?.manufacturer ?? "—"}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Kategorie:</span>
                  <span className={styles.value}>{snapshot?.category ?? "—"}</span>
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Zustand:</span>
                  <span className={styles.value}>{snapshot?.condition ?? "—"}</span>
                </div>

                {snapshot?.color_palette && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Farbpalette:</span>
                    <span className={styles.value}>{snapshot.color_palette}</span>
                  </div>
                )}

                {snapshot?.gloss_level && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Glanzgrad:</span>
                    <span className={styles.value}>{snapshot.gloss_level}</span>
                  </div>
                )}

                {snapshot?.surface && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Oberfläche:</span>
                    <span className={styles.value}>{snapshot.surface}</span>
                  </div>
                )}

                {snapshot?.application && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Anwendung:</span>
                    <span className={styles.value}>{snapshot.application}</span>
                  </div>
                )}

                {snapshot?.color_tone && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Farbton:</span>
                    <span className={styles.value}>{snapshot.color_tone}</span>
                  </div>
                )}

                {snapshot?.color_code && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Farbcode:</span>
                    <span className={styles.value}>{snapshot.color_code}</span>
                  </div>
                )}

                {snapshot?.quality && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Qualität:</span>
                    <span className={styles.value}>{snapshot.quality}</span>
                  </div>
                )}

                {effectList.length > 0 && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Effekt:</span>
                    <span className={styles.value}>{effectList.join(", ")}</span>
                  </div>
                )}

                {specialEffectsList.length > 0 && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Sondereffekte:</span>
                    <span className={styles.value}>{specialEffectsList.join(", ")}</span>
                  </div>
                )}

                {certificationsList.length > 0 && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Zertifizierungen:</span>
                    <span className={styles.value}>{certificationsList.join(", ")}</span>
                  </div>
                )}

                {chargeList.length > 0 && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Aufladung:</span>
                    <span className={styles.value}>{chargeList.join(", ")}</span>
                  </div>
                )}

                {snapshot?.pieces_per_unit != null && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Enthaltene Stück:</span>
                    <span className={styles.value}>{snapshot.pieces_per_unit}</span>
                  </div>
                )}

                {snapshot?.size && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Größe:</span>
                    <span className={styles.value}>{snapshot.size}</span>
                  </div>
                )}

                {dateien.length > 0 && (
                  <div className={styles.metaItem}>
                    <span className={styles.label}>Dateien:</span>

                    <ul className={styles.downloadList} style={{ marginTop: 6 }}>
                      {dateien.map((url, i) => {
                        const name = decodeURIComponent(url.split("/").pop() ?? `Datei-${i + 1}`);

                        return (
                          <li key={`${url}-${i}`} className={styles.downloadItem}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.downloadLink}
                            >
                              <FaFilePdf className={styles.pdfIcon} aria-hidden />
                              {name}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {snapshot?.description && (
                <div className={styles.beschreibung}>
                  <h2>Beschreibung</h2>
                  <p className={styles.preserveNewlines}>{snapshot.description}</p>
                </div>
              )}

              {/* Kaufdetails statt Kaufen-Box */}
              <div className={styles.orderDetailBox}>
                <div className={styles.inputGroup}>
                  <h2 className={styles.orderDetailTitle}>
                    {role === "seller" ? "Details zum Verkauf" : "Details zum Kauf"}
                  </h2>

                  <div className={styles.orderDetailGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.label}>Artikelpreis:</span>
                      <span className={styles.value}>{formatEUR(order.price_gross_cents)}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.label}>Versand:</span>
                      <span className={styles.value}>
                        {(order.shipping_gross_cents ?? 0) === 0
                          ? "kostenlos"
                          : formatEUR(order.shipping_gross_cents)}
                      </span>
                    </div>

                    <div className={styles.metaItem1}>
                      <span className={styles.label}>Gesamt:</span>
                      <span className={styles.value}>{formatEUR(order.total_gross_cents)}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.label}>Bestell-Nr.:</span>
                      <span className={styles.value}>{order.id}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.label}>Bestelldatum:</span>
                      <span className={styles.value}>{formatDateTime(order.created_at)}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.label}>Bezahlt am:</span>
                      <span className={styles.value}>{formatDateTime(order.paid_at)}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.label}>Versandt am:</span>
                      <span className={styles.value}>{formatDateTime(order.shipped_at)}</span>
                    </div>

                    <div className={styles.metaItem}>
                      <span className={styles.label}>Freigegeben am:</span>
                      <span className={styles.value}>{formatDateTime(order.released_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beteiligte */}
              <div className={styles.meta}>
                <div className={styles.metaItem}>
                  <span className={styles.label}>Verkäufer:</span>
                  <span className={styles.value}>
                    {sellerReviewsHref ? (
                      <Link href={sellerReviewsHref} className={styles.kontaktLink}>
                        {order.seller_username ?? "Verkäufer"}
                      </Link>
                    ) : (
                      order.seller_username ?? "Verkäufer"
                    )}
                  </span>

                  {order.seller_company_name && (
                    <div style={{ marginTop: 6 }}>Firma: {order.seller_company_name}</div>
                  )}

                  {order.seller_display_name && <div>Name: {order.seller_display_name}</div>}
                  {order.seller_vat_number && <div>UID: {order.seller_vat_number}</div>}
                  {order.seller_address && <div>Adresse: {formatAddress(order.seller_address)}</div>}
                </div>

                <div className={styles.metaItem}>
                  <span className={styles.label}>Käufer:</span>
                  <span className={styles.value}>
                    {buyerReviewsHref ? (
                      <Link href={buyerReviewsHref} className={styles.kontaktLink}>
                        {order.buyer_username ?? "Käufer"}
                      </Link>
                    ) : (
                      order.buyer_username ?? "Käufer"
                    )}
                  </span>

                  {order.buyer_company_name && (
                    <div style={{ marginTop: 6 }}>Firma: {order.buyer_company_name}</div>
                  )}

                  {order.buyer_display_name && <div>Name: {order.buyer_display_name}</div>}
                  {order.buyer_vat_number && <div>UID: {order.buyer_vat_number}</div>}
                  {order.buyer_address && <div>Adresse: {formatAddress(order.buyer_address)}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
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