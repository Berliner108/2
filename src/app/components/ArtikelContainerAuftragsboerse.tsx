'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import styles from './ArtikelContainerAuftragsboerse.module.css';
// Pfad ggf. anpassen:
import { Auftrag } from '../../data/dummyAuftraege';

type ArtikelContainerAuftragsboerseProps = {
  artikel: Auftrag;
};

export default function ArtikelContainerAuftragsboerse({ artikel }: ArtikelContainerAuftragsboerseProps) {
  const {
    id,
    verfahren,
    material,
    length,
    width,
    height,
    masse,
    warenausgabeDatum,
    warenannahmeDatum,
    warenannahmeArt,
    warenausgabeArt,
    bilder = [],
    standort,
    gesponsert = false,
    gewerblich = false,
    privat = false,
  } = artikel;

  const verfahrenName = verfahren.map((v) => v.name).join(' & ');
  const imgSrc = bilder.length > 0 ? bilder[0] : '/images/platzhalter.jpg';

  return (
    <Link href={`/auftragsboerse/auftraege/${id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.cardBildContainer}>
          <div className={styles.cardBildWrapper}>
            {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}
            <Image
              className={styles.cardBild}
              src={imgSrc}
              alt={verfahrenName}
              fill
              priority={false}
              loading="lazy"
            />
          </div>

          {(gewerblich || privat) && (
            <>
              {/* Desktop */}
              <div
                className={`${styles.verkaufsTypLabel} ${
                  gewerblich ? styles.gewerblichLabel : styles.privatLabel
                } ${styles.desktopOnly}`}
              >
                {gewerblich ? 'Gewerblich' : 'Privat'}
              </div>
              {/* Mobile */}
              <div
                className={`${styles.verkaufsTypLabel} ${
                  gewerblich ? styles.gewerblichLabel : styles.privatLabel
                } ${styles.mobileOnly}`}
              >
                {gewerblich ? 'Gewerblich' : 'Privat'}
              </div>
            </>
          )}
        </div>

        <div className={styles.cardTextBlock}>
          <div className={styles.cardText1}>{verfahrenName}</div>
          <div className={styles.cardText2}>Material: {material}</div>
          <div className={styles.cardText3}>
            Maße: {length} × {width} × {height} mm
          </div>
          <div className={styles.cardText4}>Masse: {masse}</div>

          <div className={styles.cardText5}>
            Warenausgabe: {warenausgabeDatum.toLocaleDateString('de-DE')}
            {warenausgabeArt ? ` (${warenausgabeArt})` : ''}
          </div>
          <div className={styles.cardText6}>
            Warenannahme: {warenannahmeDatum.toLocaleDateString('de-DE')}
            {warenannahmeArt ? ` (${warenannahmeArt})` : ''}
          </div>

          <div className={styles.cardOrt}>
            <MapPin size={16} className={styles.ortIcon} />
            <span>{standort}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
