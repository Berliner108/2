'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import styles from './ArtikelCard.module.css';

type ArtikelProps = {
  artikel: {
    id: string | number;
    titel: string;
    menge: number;
    lieferdatum: Date;
    hersteller: string;
    zustand: string;
    kategorie: string;
    ort: string;
    bilder: string [];
    gesponsert?: boolean;
    gewerblich?: boolean;
    privat?: boolean;
  };
};

export default function ArtikelCard({ artikel }: ArtikelProps) {
  const {
    id, titel, menge, lieferdatum, hersteller,
    zustand, kategorie, ort, bilder,
    gesponsert, gewerblich, privat,
  } = artikel;

  return (
    <div className={styles.card}>
      <div className={styles.cardBildWrapper}>
        {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}

        <Image
            className={styles.cardBild}
            src={bilder[0] || '/images/platzhalter.jpg'}
            alt={titel}
            fill
            priority
            />


      </div>

      {gewerblich && (
        <div className={`${styles.verkaufsTypLabel} ${styles.gewerblichLabel}`}>Gewerblich</div>
      )}
      {privat && !gewerblich && (
        <div className={`${styles.verkaufsTypLabel} ${styles.privatLabel}`}>Privat</div>
      )}

      <div className={styles.cardTextBlock}>
        <div className={styles.cardText1}>{titel}</div>
        <div className={styles.cardText2}>Menge: {menge} kg</div>
        <div className={styles.cardText3}>Lieferdatum: {lieferdatum.toLocaleDateString('de-DE')}</div>
        <div className={styles.cardText4}>Hersteller: {hersteller}</div>
        <div className={styles.cardText5}>Zustand: {zustand}</div>
        <div className={styles.cardText6}>Kategorie: {kategorie}</div>
        <div className={styles.cardOrt}>
          <MapPin size={16} className={styles.ortIcon} />
          <span>{ort}</span>
        </div>

        <div className={styles.cardButtonWrapper}>
          <Link href={`/lackanfragen/artikel/${id}`}>
            <button className={styles.cardButton}>Lack anbieten</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
