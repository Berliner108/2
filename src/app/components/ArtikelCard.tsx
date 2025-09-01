'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import styles from './ArtikelCard.module.css';

type ArtikelCardModel = {
  id: string | number;
  titel: string;
  menge?: number | null;
  lieferdatum?: Date | string | null;
  hersteller?: string;
  zustand?: string;
  kategorie?: string;
  ort?: string;
  bilder?: string[];
  gesponsert?: boolean;
  gewerblich?: boolean;
  privat?: boolean;

  // Farbton (+ mögliche Varianten)
  farbton?: string;
  farbtonbezeichnung?: string;
  farb_bezeichnung?: string;
  farb_name?: string;
  color_name?: string;
  color?: string;
  ral?: string;
  ncs?: string;

  // mögliche Fallback-Quellen für Ort
  lieferort?: string;
  lieferOrt?: string;
  plz?: string | number;
  zip?: string | number;
  zipCode?: string | number;
  postal_code?: string | number;
  city?: string;
  town?: string;
  lieferadresse?: string;
  lieferAdresse?: string;
  adresse?: string;
  logistik?: { lieferort?: string; adresse?: string };
} & Record<string, any>;

type ArtikelProps = { artikel: ArtikelCardModel };

/* ---------- Helpers ---------- */

function formatLieferdatum(d?: Date | string | null) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('de-DE');
}

/** Tage bis (inkl. heute) – 0 = heute, <0 = abgelaufen */
function daysLeft(d?: Date | string | null): number | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;

  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Menschlich lesbarer Badge-Text: "in 10 Tagen", "morgen", "Heute", "gestern", "vor 3 Tagen" */
function deadlineBadgeText(dl: number | null): string | null {
  if (dl == null) return null;
  if (dl < -1) return `vor ${Math.abs(dl)} Tagen`;
  if (dl === -1) return 'gestern';
  if (dl === 0) return 'Heute';
  if (dl === 1) return 'morgen';
  if (dl === 2) return 'übermorgen';
  return `in ${dl} Tagen`;
}

function joinPlzOrt(plz?: unknown, ort?: unknown) {
  const p = (plz ?? '').toString().trim();
  const o = (ort ?? '').toString().trim();
  return [p, o].filter(Boolean).join(' ') || o || '';
}

function extractPlzOrtFromText(s?: unknown): string {
  const text = (s ?? '').toString();
  if (!text) return '';
  const m = text.match(/(^|\b)(\d{4,5})\s+([A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß.\-\s]{2,}?)(?=,|$)/);
  if (!m) return '';
  const zip = m[2].trim();
  const city = m[3].trim().replace(/\s+/g, ' ');
  return [zip, city].filter(Boolean).join(' ');
}

function deriveOrt(a: ArtikelCardModel): string {
  const direct =
    a.ort?.toString().trim() ||
    a.lieferort?.toString().trim() ||
    a.lieferOrt?.toString().trim();
  if (direct) return direct;

  const plz = a.plz ?? a.postal_code ?? a.zip ?? a.zipCode;
  const city = a.city ?? a.ort ?? a.town;
  const combined = joinPlzOrt(plz, city);
  if (combined) return combined;

  const fromText = extractPlzOrtFromText(
    a.lieferadresse ?? a.lieferAdresse ?? a.logistik?.adresse ?? a.adresse
  );
  return fromText || '—';
}

function displayFarbton(a: ArtikelCardModel): string {
  const candidates = [
    a.farbton, a.farbtonbezeichnung, a.farb_bezeichnung, a.farb_name,
    a.color_name, a.color, a.ral, a.ncs,
  ]
    .map(v => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);

  return candidates[0] || '—';
}

const displayHersteller = (v?: string) => (v && v.trim() ? v : 'Alle');
const filterHerstellerKey = (v?: string) => (v && v.trim() ? v.trim() : 'Alle');

const displayZustand = (v?: string) => {
  const s = (v || '').toLowerCase();
  if (s.includes('neu')) return 'Neu und ungeöffnet';
  if (s.includes('geöffnet') || s.includes('geoeffnet') || s.includes('offen')) return 'Geöffnet und einwandfrei';
  return v ?? '—';
};

const displayKategorie = (k?: string) => {
  const v = (k || '').toLowerCase();
  if (v === 'pulverlack') return 'Pulverlack';
  if (v === 'nasslack') return 'Nasslack';
  return k ?? '—';
};

const filterKategorieKey = (k?: string) => {
  const v = (k || '').toLowerCase();
  return v === 'pulverlack' ? 'Pulverlack'
       : v === 'nasslack'   ? 'Nasslack'
       : (k || '');
};

const filterZustandKey = (z?: string) => {
  const s = (z || '').toLowerCase();
  if (s.includes('neu')) return 'neu';
  if (s.includes('geöffnet') || s.includes('geoeffnet') || s.includes('offen')) return 'geöffnet';
  return s || '';
};

/* ---------- Component ---------- */

export default function ArtikelCard({ artikel }: ArtikelProps) {
  const {
    id,
    titel,
    menge,
    lieferdatum,
    hersteller,
    zustand,
    kategorie,
    bilder,
    gesponsert,
    gewerblich,
    privat,
  } = artikel;

  const imageSrc = (bilder && bilder[0]) || '/images/platzhalter.jpg';
  const anzeigenOrt = deriveOrt(artikel);

  // Badge-Berechnung
  const dl = daysLeft(lieferdatum);
  const badgeText = deadlineBadgeText(dl);

  const badgeClass =
    dl == null ? ''
    : dl < 0 ? styles.deadlineDanger
    : dl <= 3 ? styles.deadlineWarn
    : styles.deadlineOk;

  return (
    <Link href={`/lackanfragen/artikel/${String(id)}`} className={styles.cardLink}>
      <div
        className={styles.card}
        data-hersteller={filterHerstellerKey(hersteller)}
        data-kategorie={filterKategorieKey(kategorie)}
        data-zustand={filterZustandKey(zustand)}
      >
        <div className={styles.cardBildContainer}>
          <div className={styles.cardBildWrapper}>
            {gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}
            <Image
              className={styles.cardBild}
              src={imageSrc}
              alt={titel}
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
          <div className={styles.cardText1}>{titel}</div>

          <div className={styles.cardText3}>
            Lieferdatum bis: {formatLieferdatum(lieferdatum)}
            {badgeText && (
              <span className={`${styles.deadlineBadge} ${badgeClass}`}>
                {badgeText}
              </span>
            )}
          </div>

          <div className={styles.cardText2}>
            Benötigte Menge: {menge ?? '—'}{menge != null ? ' kg' : ''}
          </div>

          <div className={styles.cardText6}>Kategorie: {displayKategorie(kategorie)}</div>
          <div className={styles.cardText4}>Farbtonbezeichnung: {displayFarbton(artikel)}</div>
          <div className={styles.cardText4}>Hersteller: {displayHersteller(hersteller)}</div>
          <div className={styles.cardText5}>Zustand: {displayZustand(zustand)}</div>

          <div className={styles.cardOrt}>
            <MapPin size={16} className={styles.ortIcon} />
            <span>{anzeigenOrt}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
