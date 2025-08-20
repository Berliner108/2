'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
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
    preis: number;
    bilder: string [];
    gesponsert?: boolean;
    gewerblich?: boolean;
    privat?: boolean;
  };
};

export default function ArtikelCard({ artikel }: ArtikelProps) {
  const {
    id, titel, menge, lieferdatum, hersteller,
    zustand, kategorie, preis, bilder,
    gesponsert, gewerblich, privat,
  } = artikel;

  return (
    <Link href={`/kaufen/artikel/${id}`} className={styles.cardLink}>
    <div className={styles.card}>
      <div className={styles.cardBildContainer}>
  <div className={styles.cardBildWrapper}>
    {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}
    <Image
  className={styles.cardBild}
  src={bilder[0] || '/images/platzhalter.jpg'}
  alt={titel}
  fill
  priority={false}
  loading="lazy"
/>

  </div>

  {/* Nur auf Desktop sichtbar */}
{(gewerblich || privat) && (
  <div className={`${styles.verkaufsTypLabel} ${gewerblich ? styles.gewerblichLabel : styles.privatLabel} ${styles.desktopOnly}`}>
    {gewerblich ? 'Gewerblich' : 'Privat'}
  </div>
)}

{/* Nur auf Mobile sichtbar */}
{(gewerblich || privat) && (
  <div className={`${styles.verkaufsTypLabel} ${gewerblich ? styles.gewerblichLabel : styles.privatLabel} ${styles.mobileOnly}`}>
    {gewerblich ? 'Gewerblich' : 'Privat'}
  </div>
)}

</div>


      <div className={styles.cardTextBlock}>
        <div className={styles.cardText1}>{titel}</div>
        <div className={styles.cardText2}>Verfügbare Menge: {menge} kg</div>
        <div className={styles.cardText3}>Lieferdatum: {lieferdatum.toLocaleDateString('de-DE')}</div>
        <div className={styles.cardText4}>Hersteller: {hersteller}</div>
        <div className={styles.cardText5}>Zustand: {zustand}</div>
        <div className={styles.cardText6}>Kategorie: {kategorie}</div>
        <div className={styles.cardText7}>Preis: {preis.toFixed(2)} €</div>

        
      </div>
    </div>
    </Link>
  );
}
