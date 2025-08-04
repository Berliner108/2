'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import styles from './ArtikelContainerAuftragsboerse.module.css';
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
    lieferdatum,
    abholdatum,
    abholArt,
    lieferArt,
    bilder,
    standort,
    gesponsert = false,
    gewerblich = false,
    privat = false,
  } = artikel;

  // Anzeige der Verfahren-Namen
  const verfahrenName = verfahren.map((v) => v.name).join(' & ');

  return (
    <Link href={`/auftragsboerse/auftraege/${id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.cardBildContainer}>
          <div className={styles.cardBildWrapper}>
            {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}
            <Image
              className={styles.cardBild}
              src={bilder[0] || '/images/platzhalter.jpg'}
              alt={verfahrenName}
              fill
              priority={false}
              loading="lazy"
            />
          </div>
          {(gewerblich || privat) && (
            <div
              className={`${styles.verkaufsTypLabel} ${
                gewerblich ? styles.gewerblichLabel : styles.privatLabel
              } ${styles.desktopOnly}`}
            >
              {gewerblich ? 'Gewerblich' : 'Privat'}
            </div>
          )}
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
          <h4 className={styles.cardText1}>{verfahrenName}</h4>
          <p className={styles.cardText2}>Material: {material}</p>
          <p className={styles.cardText3}>
            Maße: {length} × {width} × {height} mm
          </p>
          <p className={styles.cardText4}>Masse: {masse}</p>
          <p className={styles.cardText5}>
            Lieferung: {lieferdatum.toLocaleDateString('de-DE')} ({lieferArt})
          </p>
          <p className={styles.cardText6}>
            Abholung: {abholdatum.toLocaleDateString('de-DE')} ({abholArt})
          </p>
          <div className={styles.cardOrt}>
            <MapPin size={16} className={styles.ortIcon} />
            <span>{standort}</span>
          </div>
          </div>
      </div>
    </Link>
  );
}
