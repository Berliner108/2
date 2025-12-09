'use client';

import type React from 'react';
import { notFound, useParams } from 'next/navigation';
import { dummyAuftraege, type Auftrag } from '../../../../data/dummyAuftraege';
import { useState } from 'react';
import Image from 'next/image';
import styles from './detailseite.module.css';
import Navbar from '../../../components/navbar/Navbar';
import { FaFilePdf } from 'react-icons/fa';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Link from 'next/link';

/* ===== Fancy Top Loader ===== */
function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

/* ===== Skeleton ===== */
function DetailSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>
      <div className={styles.skelTwoCols}>
        <div className={styles.skelDrop} />
        <div className={styles.skelGrid}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>
      </div>
      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />
    </div>
  );
}

/* ===== Deadline-Helper – IDENTISCH zu Lackanfragen ===== */
function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ date }: { date: Date | null }) {
  if (!date) return null;
  const d = daysUntil(date);
  let text = '';
  if (d < 0) text = `abgeschlossen seit ${Math.abs(d)} Tag${Math.abs(d) === 1 ? '' : 'en'}`;
  else if (d === 0) text = 'heute';
  else if (d === 1) text = 'morgen';
  else text = `in ${d} Tagen`;
  const variant = d < 0 ? styles.badgeDanger : d <= 3 ? styles.badgeWarn : styles.badgeOk;
  return (
    <span
      className={`${styles.badge} ${styles.deadline} ${variant}`}
      title={`Lieferfrist: ${date.toLocaleDateString('de-DE')}`}
      aria-label={`Lieferfrist ${text}`}
    >
      {text}
    </span>
  );
}

/* ===== Money-Helper (sehr simpel) ===== */
function parseMoneyOrNull(raw: string): number | null {
  if (!raw) return null;
  let v = raw.replace(/\s/g, '').replace(',', '.');
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, 0), 9_999_999.99);
}

function formatMoney(n: number): string {
  return n.toFixed(2);
}

export default function AuftragDetailPage() {
  // später: beim echten Backend auf true setzen
  const [loading] = useState(false);

  const params = useParams<{ id: string }>();
  const auftrag: Auftrag | undefined = dummyAuftraege.find(
    (a) => a.id.toString() === params.id
  );

  if (!auftrag) {
    notFound();
    return null;
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <TopLoader />
        <div className={styles.container}>
          <DetailSkeleton />
        </div>
      </>
    );
  }

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const slides = auftrag.bilder?.map((src) => ({ src })) || [];

  // Preisbereich: 2 Felder
  const [preisOpen, setPreisOpen] = useState(false);
  const [gesamtPreis, setGesamtPreis] = useState<string>('');
  const [logistikPreis, setLogistikPreis] = useState<string>('');
  const [preisError, setPreisError] = useState<string | null>(null);

  // Logistik-Bedingung: nur wenn NICHT beides "Selbst..."
  const warenausgabeArt = (auftrag.warenausgabeArt || '').toLowerCase();
  const warenannahmeArt = (auftrag.warenannahmeArt || '').toLowerCase();
  const selbstAnlieferung = warenausgabeArt.includes('selbst');
  const selbstAbholung = warenannahmeArt.includes('selbst');
  const brauchtLogistikPreis = !(selbstAnlieferung && selbstAbholung);

  const handleGesamtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreisError(null);
    setGesamtPreis(e.target.value);
  };

  const handleLogistikChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreisError(null);
    setLogistikPreis(e.target.value);
  };

  const handleGesamtBlur = () => {
    if (!gesamtPreis.trim()) return;
    const n = parseMoneyOrNull(gesamtPreis);
    if (n === null) {
      setPreisError('Bitte gib einen gültigen Gesamtpreis ein.');
      setGesamtPreis('');
      return;
    }
    setGesamtPreis(formatMoney(n));
  };

  const handleLogistikBlur = () => {
    if (!logistikPreis.trim()) return;
    const n = parseMoneyOrNull(logistikPreis);
    if (n === null) {
      setPreisError('Bitte gib einen gültigen Logistikpreis ein.');
      setLogistikPreis('');
      return;
    }
    setLogistikPreis(formatMoney(n));
  };

  const onPreisSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPreisError(null);

    const base = parseMoneyOrNull(gesamtPreis);
    if (base === null || base <= 0) {
      setPreisError('Bitte die Gesamtkosten für den Auftrag eingeben ( > 0 € ).');
      return;
    }

    let logistik = 0;
    if (brauchtLogistikPreis) {
      const l = parseMoneyOrNull(logistikPreis);
      if (l === null || l < 0) {
        setPreisError('Bitte einen gültigen Logistikpreis angeben (0 ist möglich).');
        return;
      }
      logistik = l;
    }

    // TODO: später API-Call (z. B. POST /api/auftraege/{id}/angebote)
    alert(
      `Angebot gesendet:\n` +
        `Gesamtkosten Auftrag: ${formatMoney(base)} €\n` +
        (brauchtLogistikPreis
          ? `Logistikkosten: ${formatMoney(logistik)} €\n`
          : 'Logistikkosten: 0,00 € (Selbstanlieferung & Selbstabholung)\n') +
        `Auftrag #${auftrag.id}`
    );
  };

  const verfahrenName = auftrag.verfahren.map((v) => v.name).join(' & ');

  return (
    <>
      <Navbar />

      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Bilder */}
          <div className={styles.leftColumn}>
            <div className={styles.imageWrapper}>
              <Image
                src={auftrag.bilder?.[photoIndex] || '/images/platzhalter.jpg'}
                alt={verfahrenName}
                width={500}
                height={500}
                className={styles.image}
                loading="lazy"
                onClick={() => setLightboxOpen(true)}
              />
            </div>

            <div className={styles.thumbnails}>
              {auftrag.bilder.map((bild, i) => (
                <img
                  key={i}
                  src={bild}
                  alt={`Bild ${i + 1}`}
                  className={`${styles.thumbnail} ${
                    i === photoIndex ? styles.thumbnailActive : ''
                  }`}
                  onClick={() => setPhotoIndex(i)}
                />
              ))}
            </div>
          </div>

          {/* Rechte Spalte */}
          <div className={styles.rightColumn}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{verfahrenName}</h1>
              <div className={styles.badges}>
                {auftrag.gesponsert && (
                  <span className={`${styles.badge} ${styles.gesponsert}`}>
                    Gesponsert
                  </span>
                )}
                {auftrag.gewerblich && (
                  <span className={`${styles.badge} ${styles.gewerblich}`}>
                    Gewerblich
                  </span>
                )}
                {auftrag.privat && (
                  <span className={`${styles.badge} ${styles.privat}`}>
                    Privat
                  </span>
                )}
              </div>
            </div>

            {/* Meta-Grid: alle allgemeinen Eingaben */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.label}>Material:</span>
                <span className={styles.value}>{auftrag.material}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Maße größtes Werkstück:</span>
                <span className={styles.value}>
                  {auftrag.length} × {auftrag.width} × {auftrag.height} mm
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Masse schwerstes Werkstück:</span>
                <span className={styles.value}>{auftrag.masse}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Standort:</span>
                <span className={styles.value}>{auftrag.standort}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Warenausgabe per:</span>
                <span className={styles.value}>
                  {auftrag.warenausgabeArt || '—'}
                </span>
              </div>

              <div className={styles.metaItem1}>
                <span className={styles.label}>Datum Warenausgabe:</span>
                <span className={styles.value}>
                  {auftrag.warenausgabeDatum
                    ? auftrag.warenausgabeDatum.toLocaleDateString('de-DE')
                    : '—'}
                </span>
                <DeadlineBadge date={auftrag.warenausgabeDatum} />
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Warenrückgabe per:</span>
                <span className={styles.value}>
                  {auftrag.warenannahmeArt || '—'}
                </span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Datum Warenrückgabe:</span>
                <span className={styles.value}>
                  {auftrag.warenannahmeDatum
                    ? auftrag.warenannahmeDatum.toLocaleDateString('de-DE')
                    : '—'}
                </span>
              </div>
            </div>

            {/* User */}
            {auftrag.user && (
              <div className={styles.metaItem}>
                <span className={styles.label}>User:</span>
                <span className={styles.value}>{auftrag.user}</span>
                <Link
                  href={`/messages?empfaenger=${encodeURIComponent(
                    auftrag.user
                  )}`}
                  className={styles.kontaktLink}
                >
                  User kontaktieren
                </Link>
              </div>
            )}

            {/* Dynamische Spezifikationen je Verfahren – NUR wenn es Felder gibt */}
            {auftrag.verfahren.map((v, idx) => {
              const entries = Object.entries(v.felder ?? {});
              if (!entries.length) return null;

              return (
                <div key={idx} className={styles.verfahrenBlock}>
                  <h3 className={styles.verfahrenTitel}>{v.name}</h3>
                  <div className={styles.verfahrenGrid}>
                    {entries.map(([key, val]) => (
                      <div key={key} className={styles.metaItem}>
                        <span className={styles.label}>
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^\w/, (c) => c.toUpperCase())}
                          :
                        </span>
                        <span className={styles.value}>
                          {Array.isArray(val) ? val.join(', ') : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Downloads */}
            {auftrag.dateien && auftrag.dateien.length > 0 && (
              <div className={styles.metaItem}>
                <span className={styles.label}>Downloads:</span>
                <ul className={styles.downloadList}>
                  {auftrag.dateien.map((file, i) => (
                    <li key={i} className={styles.downloadItem}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.downloadLink}
                      >
                        <FaFilePdf className={styles.fileIcon} />
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Beschreibung (aus Formular) */}
            {auftrag.beschreibung && (
              <div className={styles.beschreibung}>
                <h2>Beschreibung</h2>
                <p className={styles.preserveNewlines}>{auftrag.beschreibung}</p>
              </div>
            )}

            {/* Ausklappbarer Preisbereich – nur 2 Felder */}
            <div className={`${styles.metaItem} ${styles.priceSection}`}>
              <button
                type="button"
                className={`${styles.buyButton} ${styles.disclosureBtn}`}
                aria-expanded={preisOpen}
                aria-controls="pricePanel"
                onClick={() => setPreisOpen((o) => !o)}
              >
                <span>Mach ein Angebot für diesen Auftrag</span>
                <span className={styles.disclosureIcon}>
                  {preisOpen ? '▾' : '▸'}
                </span>
              </button>

              {preisOpen && (
                <form
                  id="pricePanel"
                  onSubmit={onPreisSubmit}
                  className={styles.priceForm}
                >
                  <label htmlFor="gesamtpreis" className={styles.label}>
                    Gesamtkosten für den Auftrag (inkl. aller Arbeitsschritte, exkl. Logistik) in €
                  </label>
                  <div className={styles.priceRow}>
                    <input
                      id="gesamtpreis"
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 1450,00"
                      value={gesamtPreis}
                      onChange={handleGesamtChange}
                      onBlur={handleGesamtBlur}
                      className={`${styles.priceInput} ${
                        preisError ? styles.isInvalid : ''
                      }`}
                      autoComplete="off"
                    />
                  </div>

                  {brauchtLogistikPreis && (
                    <>
                      <label
                        htmlFor="logistikpreis"
                        className={styles.label}
                        style={{ marginTop: '0.75rem' }}
                      >
                        Logistikkosten in € (Transport/Spedition)
                      </label>
                      <div className={styles.priceRow}>
                        <input
                          id="logistikpreis"
                          type="text"
                          inputMode="decimal"
                          placeholder="z. B. 180,00"
                          value={logistikPreis}
                          onChange={handleLogistikChange}
                          onBlur={handleLogistikBlur}
                          className={`${styles.priceInput} ${
                            preisError ? styles.isInvalid : ''
                          }`}
                          autoComplete="off"
                        />
                      </div>
                    </>
                  )}

                  {preisError ? (
                    <div
                      role="alert"
                      className={styles.priceError}
                      aria-live="polite"
                    >
                      {preisError}
                    </div>
                  ) : (
                    <div className={styles.priceHint}>
                      Mit der Angebotsabgabe bestätigst du, alle
                      Kundenanforderungen zum Auftrag vollständig erfüllen zu
                      können. Dein Angebot ist 72&nbsp;h oder bis zum Tag der
                      Warenausgabe gültig.
                    </div>
                  )}

                  <button type="submit" className={styles.buyButton}>
                    Angebot abgeben
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={slides}
          index={photoIndex}
          plugins={[Thumbnails]}
          thumbnails={{ vignette: true }}
          on={{ view: ({ index }) => setPhotoIndex(index) }}
        />
      )}
    </>
  );
}
