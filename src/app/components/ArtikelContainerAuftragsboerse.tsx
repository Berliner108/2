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
              <div className={`${styles.verkaufsTypLabel} ${gewerblich ? styles.gewerblichLabel : styles.privatLabel} ${styles.desktopOnly}`}>
                {gewerblich ? 'Gewerblich' : 'Privat'}
              </div>
              <div className={`${styles.verkaufsTypLabel} ${gewerblich ? styles.gewerblichLabel : styles.privatLabel} ${styles.mobileOnly}`}>
                {gewerblich ? 'Gewerblich' : 'Privat'}
              </div>
            </>
          )}
        </div>

        <div className={styles.cardTextBlock}>
          <h4 className={styles.cardText1}>{verfahrenName}</h4>
          {/* Labels nach deinem Wunsch + Klammern nur bei vorhandenem Wert */}
          <p className={styles.cardText5}>
            Warenausgabe: {warenausgabeDatum.toLocaleDateString('de-DE')}
            {warenausgabeArt ? ` (${warenausgabeArt})` : ''}
          </p>
          <p className={styles.cardText6}>
            Warenannahme: {warenannahmeDatum.toLocaleDateString('de-DE')}
            {warenannahmeArt ? ` (${warenannahmeArt})` : ''}
          </p>
          
          <p className={styles.cardText2}>Material: {material}</p>
          <p className={styles.cardText3}>Maße: {length} × {width} × {height} mm</p>
          <p className={styles.cardText4}>Masse: {masse}</p>

          

          <div className={styles.cardOrt}>
            <MapPin size={16} className={styles.ortIcon} />
            <span>{standort}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
