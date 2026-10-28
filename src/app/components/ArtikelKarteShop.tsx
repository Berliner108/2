'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ArtikelKarteShop.module.css';

type ArtikelProps = {
  artikel: {
    id: string | number;
    titel: string;

    // robust (DB kann null/undefined liefern)
    menge?: number;
    lieferdatum?: Date;
    hersteller?: string | null;
    zustand?: string | null;
    kategorie?: string | null;
    preis?: number;
    versand?: number | null;
    bilder?: string[] | null;
    // kommt aus DB (price_unit)
    einheit: 'kg' | 'stueck';
    sale_type?: "gesamt" | "pro_kg" | "pro_stueck" | null;
    price_mode?: "legacy_gross" | "net" | "no_vat" | null;

    // ✅ Verkäufer-Typ (profiles.account_type)
    seller_account_type?: 'business' | 'private' | null;
    viewer_is_business?: boolean;
    viewer_country?: "DE" | "AT" | null;

    gesponsert?: boolean;

    // legacy (kann bleiben, wird hier nicht mehr verwendet)
    gewerblich?: boolean;
    privat?: boolean;
  };
};

function formatKategorie(kategorie?: string | null) {
  const k = (kategorie ?? '').toLowerCase().trim();
  if (k === 'pulverlack') return 'Pulverlack';
  if (k === 'nasslack') return 'Nasslack';
  if (k === 'arbeitsmittel') return 'Arbeitsmittel';
  if (k === 'galvano_zubehoer') return 'Galvano-Zubehör';
  return (kategorie ?? '').trim();
}

export default function ArtikelCard({ artikel }: ArtikelProps) {
  const {
    id,
    titel,
    menge,
    lieferdatum,
    hersteller,
    zustand,
    kategorie,
    preis,
    versand,
    bilder,
    gesponsert,
  } = artikel;

  const katAnzeige = formatKategorie(kategorie);
  const einheitLabel =
  artikel.einheit === 'stueck'
    ? 'Stück'
    : (kategorie ?? '').toLowerCase() === 'nasslack'
      ? 'Liter'
      : 'kg';

  // ✅ Badge-Text + Klasse = Verkäufer-Typ
  const sellerLabel =
    artikel.seller_account_type === 'business'
      ? 'Gewerblich'
      : artikel.seller_account_type === 'private'
      ? 'Privat'
      : null;

  const sellerClass =
    artikel.seller_account_type === 'business' ? styles.gewerblichLabel : styles.privatLabel;

  const showSellLabel = Boolean(sellerLabel);

  const vatRate =
    artikel.viewer_country === "DE"
      ? 0.19
      : artikel.viewer_country === "AT"
        ? 0.20
        : null;

  const showGrossForPrivate =
    artikel.price_mode === "net" &&
    artikel.viewer_is_business === false &&
    vatRate != null;

  const displayPrice =
    typeof preis === "number"
      ? showGrossForPrivate
        ? Math.round(preis * 100 * (1 + vatRate!)) / 100
        : preis
      : null;

  const displayShipping =
    typeof versand === "number"
      ? showGrossForPrivate
        ? Math.round(versand * 100 * (1 + vatRate!)) / 100
        : versand
      : null;

  const taxLabel =
    artikel.price_mode === "no_vat"
      ? "ohne USt."
      : showGrossForPrivate || artikel.price_mode === "legacy_gross"
        ? "inkl. USt."
        : "netto";

  const formatPrice = (value?: number | null) =>
    typeof value === 'number'
      ? value.toLocaleString('de-DE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—';

  return (
    <Link href={`/kaufen/artikel/${id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.cardBildContainer}>
          <div className={styles.cardBildWrapper}>
            {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}

            <Image
              className={styles.cardBild}
              src={(bilder?.[0] as string) || '/images/platzhalter.jpg'}
              alt={titel}
              fill
              priority={false}
              loading="lazy"
            />
          </div>

          {/* Desktop Label */}
          {showSellLabel && (
            <div className={`${styles.verkaufsTypLabel} ${sellerClass} ${styles.desktopOnly}`}>
              {sellerLabel}
            </div>
          )}

          {/* Mobile Label */}
          {showSellLabel && (
            <div className={`${styles.verkaufsTypLabel} ${sellerClass} ${styles.mobileOnly}`}>
              {sellerLabel}
            </div>
          )}
        </div>

        <div className={styles.cardTextBlock}>
          <div className={styles.cardText1}>{titel}</div>

          <div className={styles.cardText2}>
            {typeof menge === "number"
            ? <>Verfügbare Menge: {menge} {einheitLabel}</>
            : <>Verfügbarkeit: Auf Lager</>}
          </div>

          <div className={styles.cardText3}>
            Lieferdatum: {lieferdatum ? lieferdatum.toLocaleDateString('de-DE') : '—'}
          </div>

          <div className={styles.cardText4}>Hersteller: {hersteller ?? '—'}</div>
          <div className={styles.cardText5}>Zustand: {(zustand ?? "").trim() || "—"}</div>
          <div className={styles.cardText6}>Kategorie: {katAnzeige || '—'}</div>

          <div className={styles.cardText7}>
            {artikel.sale_type === "gesamt" ? (
              <>
                Preis: {formatPrice(displayPrice)} € · {taxLabel}
              </>
            ) : (
              <>
                Preis ab: {formatPrice(displayPrice)} € / {einheitLabel} · {taxLabel}
              </>
            )}
          </div>

          <div className={styles.cardText7}>
            Versand: {displayShipping === 0 ? "kostenlos" : `${formatPrice(displayShipping)} €`}
          </div>

        </div>
      </div>
    </Link>
  );
}
