'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ArtikelKarteShop.module.css';

type ArtikelProps = {
  artikel: {
    id: string | number;
    titel: string;
    menge: number;
    lieferdatum: Date;
    hersteller: string;
    zustand: string;
    kategorie: string;
    preis: number; // = price_from (Brutto)
    bilder: string[];
    gesponsert?: boolean;
    gewerblich?: boolean;
    privat?: boolean;
  };
};

function formatKategorie(kategorie: string) {
  const k = (kategorie ?? '').toLowerCase().trim();
  if (k === 'pulverlack') return 'Pulverlack';
  if (k === 'nasslack') return 'Nasslack';
  if (k === 'arbeitsmittel') return 'Arbeitsmittel';
  return kategorie;
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

  const kLower = (kategorie ?? '').toLowerCase();
  const einheit = kLower.includes('arbeitsmittel') ? 'Stück' : 'kg';
  const katAnzeige = formatKategorie(kategorie);
  const einheitLabel = artikel.einheit === "stueck" ? "Stück" : "kg";


  return (
    <Link href={`/kaufen/artikel/${id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.cardBildContainer}>
          <div className={styles.cardBildWrapper}>
            {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}

            <Image
              className={styles.cardBild}
              src={bilder?.[0] || '/images/platzhalter.jpg'}
              alt={titel}
              fill
              priority={false}
              loading="lazy"
            />
          </div>

          {/* Desktop Label */}
          {(gewerblich || privat) && (
            <div
              className={`${styles.verkaufsTypLabel} ${
                gewerblich ? styles.gewerblichLabel : styles.privatLabel
              } ${styles.desktopOnly}`}
            >
              {gewerblich ? 'Gewerblich' : 'Privat'}
            </div>
          )}

          {/* Mobile Label */}
          {(gewerblich || privat) && (
            <div
              className={`${styles.verkaufsTypLabel} ${
                gewerblich ? styles.gewerblichLabel : styles.privatLabel
              } ${styles.mobileOnly}`}
            >
              {gewerblich ? 'Gewerblich' : 'Privat'}
            </div>
          )}
        </div>

        <div className={styles.cardTextBlock}>
          <div className={styles.cardText1}>{titel}</div>
          <div className={styles.cardText2}>
            Verfügbare Menge: {menge} {einheitLabel}
          </div>
          <div className={styles.cardText3}>
            Lieferdatum: {lieferdatum.toLocaleDateString('de-DE')}
          </div>
          <div className={styles.cardText4}>Hersteller: {hersteller}</div>
          <div className={styles.cardText5}>Zustand: {zustand}</div>
          <div className={styles.cardText6}>Kategorie: {katAnzeige}</div>

          {/* Preis ist bei dir jetzt "Preis ab" (Brutto) */}
          <div className={styles.cardText7}>
            Preis ab: {preis.toFixed(2)} € / {einheitLabel}

          </div>
        </div>
      </div>
    </Link>
  );
}
