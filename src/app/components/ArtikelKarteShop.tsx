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

    gesponsert?: boolean;
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
    gewerblich,
    privat,
  } = artikel;

  const katAnzeige = formatKategorie(kategorie);
  const einheitLabel = artikel.einheit === 'stueck' ? 'Stück' : 'kg';

  const verkaufLabel =
    gewerblich && privat
      ? 'Privat & Gewerblich'
      : gewerblich
      ? 'Gewerblich'
      : privat
      ? 'Privat'
      : '';

  const showSellLabel = Boolean(verkaufLabel);

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
            <div
              className={`${styles.verkaufsTypLabel} ${
                gewerblich ? styles.gewerblichLabel : styles.privatLabel
              } ${styles.desktopOnly}`}
            >
              {verkaufLabel}
            </div>
          )}

          {/* Mobile Label */}
          {showSellLabel && (
            <div
              className={`${styles.verkaufsTypLabel} ${
                gewerblich ? styles.gewerblichLabel : styles.privatLabel
              } ${styles.mobileOnly}`}
            >
              {verkaufLabel}
            </div>
          )}
        </div>

        <div className={styles.cardTextBlock}>
          <div className={styles.cardText1}>{titel}</div>

          <div className={styles.cardText2}>
            Verfügbare Menge: {typeof menge === 'number' ? menge : 0} {einheitLabel}
          </div>

          <div className={styles.cardText3}>
            Lieferdatum: {lieferdatum ? lieferdatum.toLocaleDateString('de-DE') : '—'}
          </div>

          <div className={styles.cardText4}>Hersteller: {hersteller ?? '—'}</div>
          <div className={styles.cardText5}>Zustand: {zustand ?? '—'}</div>
          <div className={styles.cardText6}>Kategorie: {katAnzeige || '—'}</div>

          <div className={styles.cardText7}>
            Preis ab: {typeof preis === 'number' ? preis.toFixed(2) : '—'} € / {einheitLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
