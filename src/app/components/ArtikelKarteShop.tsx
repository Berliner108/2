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
    bilder?: string[] | null;
    // kommt aus DB (price_unit)
    einheit: 'kg' | 'stueck';
    sale_type?: "gesamt" | "pro_kg" | "pro_stueck" | null;

    // ✅ Verkäufer-Typ (profiles.account_type)
    seller_account_type?: 'business' | 'private' | null;

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
    bilder,
    gesponsert,
  } = artikel;

  const katAnzeige = formatKategorie(kategorie);
  const einheitLabel = artikel.einheit === 'stueck' ? 'Stück' : 'kg';

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
              <>Preis: {typeof preis === "number" ? preis.toFixed(2) : "—"} €</>
            ) : (
              <>Preis ab: {typeof preis === "number" ? preis.toFixed(2) : "—"} € / {einheitLabel}</>
            )}
          </div>

        </div>
      </div>
    </Link>
  );
}
