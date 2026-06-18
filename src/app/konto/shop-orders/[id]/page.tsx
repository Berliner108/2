"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/navbar/Navbar";
import styles from "../../bestellungen/bestellungen.module.css";
import BoerseLoading from "../../../components/loading/BoerseLoading";

function formatEUR(cents?: number | null) {
  const v = (typeof cents === "number" ? cents : 0) / 100;
  return v.toLocaleString("de-AT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(iso?: string | null) {
  if (!iso) return "–";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "–";
  return d.toLocaleDateString("de-AT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
  if (status === "paid") return "Bezahlt";
  if (status === "shipped") return "Versandt";
  if (status === "released") return "Abgeschlossen";
  if (status === "complaint_open") return "Reklamation offen";
  if (status === "refunded") return "Erstattet";
  if (status === "payment_pending") return "Zahlung offen";
  return "Unbekannt";
}

type ApiResponse = {
  order?: any;
  role?: "buyer" | "seller" | "none";
  error?: string;
};

export default function ShopOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const orderId = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [role, setRole] = useState<"buyer" | "seller" | "none">("none");

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

  const title = useMemo(() => {
    const joinedTitle = Array.isArray(order?.articles)
      ? order?.articles?.[0]?.title
      : order?.articles?.title;

    return (
      snapshot?.title ??
      order?.article_title ??
      joinedTitle ??
      `Artikel ${String(order?.article_id ?? "").slice(0, 8)}`
    );
  }, [order, snapshot]);

  const description = snapshot?.description ?? null;
  const manufacturer = snapshot?.manufacturer ?? null;
  const category = snapshot?.category ?? null;
  const condition = snapshot?.condition ?? null;
  const quality = snapshot?.quality ?? null;
  const colorPalette = snapshot?.color_palette ?? null;
  const colorTone = snapshot?.color_tone ?? null;
  const glossLevel = snapshot?.gloss_level ?? null;
  const surface = snapshot?.surface ?? null;
  const application = snapshot?.application ?? null;

  if (loading) return <BoerseLoading />;

  return (
    <>
      <Navbar />

      <div className={styles.wrapper}>
        <button
          type="button"
          className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
          onClick={() => router.back()}
          style={{ marginBottom: 18 }}
        >
          Zurück
        </button>

        {error && (
          <div className={styles.emptyState}>
            <strong>Fehler:</strong> {error}
          </div>
        )}

        {!error && order && (
          <>
            <h2 className={styles.heading}>
              {role === "seller" ? "Verkaufsdetails" : "Bestelldetails"}
            </h2>

            <div className={styles.kontoContainer}>
              <div className={`${styles.card} ${styles.cardCyan}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className={styles.titleLink}>{title}</span>
                  </div>
                  <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className={styles.meta}>
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Kaufdetails</div>
                    <div className={styles.metaValue}>
                      <div>
                        Menge: {order.qty}{" "}
                        {order.unit === "stueck" ? "Stück" : "kg"}
                      </div>
                      <div>Artikel: {formatEUR(order.price_gross_cents)}</div>
                      <div>
                        Versand:{" "}
                        {(order.shipping_gross_cents ?? 0) === 0
                          ? "kostenlos"
                          : formatEUR(order.shipping_gross_cents)}
                      </div>
                      <div>
                        <strong>Gesamt: {formatEUR(order.total_gross_cents)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Bestellung</div>
                    <div className={styles.metaValue}>
                      <div>Bestell-Nr.: {order.id}</div>
                      <div>Kaufdatum: {formatDateTime(order.created_at)}</div>
                      <div>Bezahlt am: {formatDateTime(order.paid_at)}</div>
                      <div>Versandt am: {formatDateTime(order.shipped_at)}</div>
                      <div>Freigegeben am: {formatDateTime(order.released_at)}</div>
                    </div>
                  </div>

                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Verkäufer</div>
                    <div className={styles.metaValue}>
                      <div>{order.seller_username ?? "Verkäufer"}</div>
                      {order.seller_company_name && <div>Firma: {order.seller_company_name}</div>}
                      {order.seller_display_name && <div>Name: {order.seller_display_name}</div>}
                      {order.seller_vat_number && <div>UID: {order.seller_vat_number}</div>}
                      {order.seller_address && <div>Adresse: {formatAddress(order.seller_address)}</div>}
                    </div>
                  </div>

                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Käufer</div>
                    <div className={styles.metaValue}>
                      <div>{order.buyer_username ?? "Käufer"}</div>
                      {order.buyer_company_name && <div>Firma: {order.buyer_company_name}</div>}
                      {order.buyer_display_name && <div>Name: {order.buyer_display_name}</div>}
                      {order.buyer_vat_number && <div>UID: {order.buyer_vat_number}</div>}
                      {order.buyer_address && <div>Adresse: {formatAddress(order.buyer_address)}</div>}
                    </div>
                  </div>
                </div>

                <hr className={styles.divider} />

                <div className={styles.meta}>
                  <div className={styles.metaCol}>
                    <div className={styles.metaLabel}>Artikeldaten zum Kaufzeitpunkt</div>
                    <div className={styles.metaValue}>
                      {manufacturer && <div>Hersteller: {manufacturer}</div>}
                      {category && <div>Kategorie: {category}</div>}
                      {condition && <div>Zustand: {condition}</div>}
                      {quality && <div>Qualität: {quality}</div>}
                      {colorPalette && <div>Farbpalette: {colorPalette}</div>}
                      {colorTone && <div>Farbton: {colorTone}</div>}
                      {glossLevel && <div>Glanzgrad: {glossLevel}</div>}
                      {surface && <div>Oberfläche: {surface}</div>}
                      {application && <div>Anwendung: {application}</div>}
                    </div>
                  </div>

                  {description && (
                    <div className={styles.metaCol}>
                      <div className={styles.metaLabel}>Beschreibung</div>
                      <div className={styles.metaValue}>{description}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}