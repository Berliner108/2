'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import styles from './ArtikelContainerAuftragsboerse.module.css';
import type { Auftrag } from '@/lib/types/auftrag';

type ArtikelContainerAuftragsboerseProps = {
  artikel: Auftrag;
};

/* ===== Label-Mapping (nur Anzeige) ===== */
const labelWarenausgabeArt = (v?: string | null) => {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'abholung') return 'Abholung';
  if (s === 'selbst') return 'Selbstanlieferung';
  return '';
};

const labelWarenrueckgabeArt = (v?: string | null) => {
  const s = (v ?? '').trim().toLowerCase();
  if (s === 'anlieferung') return 'Anlieferung';
  if (s === 'selbst') return 'Selbstabholung';
  return '';
};

/* ===== Deadline-Helper – gleiche Logik wie bei Lackanfragen ===== */
type DeadlineVariant = 'ok' | 'warn' | 'danger';

function daysBetweenToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diffMs = d.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function getDeadlineInfo(
  date?: Date | null
): { text: string; variant: DeadlineVariant } | null {
  if (!date) return null;

  const d = daysBetweenToday(date);

  let text: string;
  if (d < -100) text = 'abgeschlossen vor über 100 Tagen';
  else if (d < -1) text = `abgeschlossen vor ${Math.abs(d)} Tagen`;
  else if (d === -1) text = 'abgeschlossen seit gestern';
  else if (d === 0) text = 'heute';
  else if (d === 1) text = 'in 1 Tag';
  else if (d <= 100) text = `in ${d} Tagen`;
  else text = 'in über 100 Tagen';

  const variant: DeadlineVariant = d < 0 ? 'danger' : d <= 3 ? 'warn' : 'ok';
  return { text, variant };
}

/* ===== Komponente ===== */
export default function ArtikelContainerAuftragsboerse({
  artikel,
}: ArtikelContainerAuftragsboerseProps) {
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

  const waDate =
    warenausgabeDatum instanceof Date ? warenausgabeDatum : new Date(warenausgabeDatum as any);
  const wnDate =
    warenannahmeDatum instanceof Date ? warenannahmeDatum : new Date(warenannahmeDatum as any);

  const waInfo = getDeadlineInfo(waDate);
  const wnInfo = getDeadlineInfo(wnDate);

  // ✅ Labels erst NACH Definition verwenden
  const waArtText = labelWarenausgabeArt(warenausgabeArt);
  const wnArtText = labelWarenrueckgabeArt(warenannahmeArt);

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
              loading="lazy"
              unoptimized
            />
          </div>

          {(gewerblich || privat) && (
            <>
              <div
                className={`${styles.verkaufsTypLabel} ${
                  gewerblich ? styles.gewerblichLabel : styles.privatLabel
                } ${styles.desktopOnly}`}
              >
                {gewerblich ? 'Gewerblich' : 'Privat'}
              </div>
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
          <h4 className={styles.cardText1}>{verfahrenName}</h4>

          <p className={styles.cardText5}>
            Warenausgabe: {waDate.toLocaleDateString('de-DE')}
            {waArtText ? ` – ${waArtText}` : ''}
            {waInfo && (
              <span
                className={`${styles.deadlineBadge} ${
                  waInfo.variant === 'danger'
                    ? styles.badgeDanger
                    : waInfo.variant === 'warn'
                    ? styles.badgeWarn
                    : styles.badgeOk
                }`}
              >
                {waInfo.text}
              </span>
            )}
          </p>

          <p className={styles.cardText6}>
            Warenrückgabe: {wnDate.toLocaleDateString('de-DE')}
            {wnArtText ? ` – ${wnArtText}` : ''}
            {wnInfo && (
              <span
                className={`${styles.deadlineBadge} ${
                  wnInfo.variant === 'danger'
                    ? styles.badgeDanger
                    : wnInfo.variant === 'warn'
                    ? styles.badgeWarn
                    : styles.badgeOk
                }`}
              >
                {wnInfo.text}
              </span>
            )}
          </p>

          <p className={styles.cardText2}>Material: {material}</p>
          <p className={styles.cardText3}>
            Maße größtes Werkstück: {length} × {width} × {height} mm
          </p>
          <p className={styles.cardText4}>Masse schwerstes Werkstück: {masse} kg</p>

          <div className={styles.cardOrt}>
            <MapPin size={16} className={styles.ortIcon} />
            <span>{standort}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
