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

/* ===== Page Skeleton ===== */

function DetailSkeleton() {
  return (
    <div
      className={styles.skeletonPage}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
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

/* ===== Helfer für schöne Labels in den Spezifikationen ===== */

function formatSpecLabel(rawKey: string): string {
  const key = rawKey.toLowerCase();

  const special: Record<string, string> = {
    farbeeloxieren: 'Farbe',
    farbe: 'Farbe',
    farbpalette: 'Farbpalette',
    glanzgrad: 'Glanzgrad',
    zertifizierungen: 'Zertifizierungen',
    zertifizierung: 'Zertifizierung',
  };

  if (special[key]) return special[key];

  let base = key.replace(/_+/g, ' ').trim();

  const endings = ['eloxieren', 'lackieren', 'beschichten'];
  for (const ending of endings) {
    if (base.endsWith(ending) && !base.includes(' ')) {
      const prefix = base.slice(0, -ending.length);
      base = (prefix ? prefix + ' ' : '') + ending;
      break;
    }
  }

  return base.replace(/(^|\s)\w/g, (m) => m.toUpperCase());
}

/* ===== Helfer für Preis-Eingabe (Formatierung) ===== */

function normalizePriceInput(value: string): string {
  let v = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (v.startsWith('.')) v = '0' + v;

  const firstDot = v.indexOf('.');
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
  }

  let [int = '', dec = ''] = v.split('.');
  if (int.length > 7) int = int.slice(0, 7);

  if (v.endsWith('.')) {
    return int + '.';
  }

  if (dec) dec = dec.slice(0, 2);
  return dec ? `${int}.${dec}` : int;
}

export default function AuftragDetailPage() {
  // später: auf true setzen, während echte Backend-Daten geladen werden
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

  // 🔹 Logistik-Bedingung: nur wenn NICHT beides "selbst"
  const isSelfAnlieferung = (auftrag.warenausgabeArt || '')
    .toLowerCase()
    .includes('selbst');
  const isSelfAbholung = (auftrag.warenannahmeArt || '')
    .toLowerCase()
    .includes('selbst');
  const logistikNoetig = !(isSelfAnlieferung && isSelfAbholung);

  // Angebots-Accordion + 2 Preisfelder
  const [preisOpen, setPreisOpen] = useState(false);

  const [gesamtPreis, setGesamtPreis] = useState<string>('');
  const [logistikPreis, setLogistikPreis] = useState<string>('');
  const [gesamtPreisError, setGesamtPreisError] = useState<string | null>(null);
  const [logistikPreisError, setLogistikPreisError] = useState<string | null>(
    null
  );

  const onGesamtPreisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGesamtPreisError(null);
    setGesamtPreis(normalizePriceInput(e.target.value));
  };

  const onLogistikPreisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogistikPreisError(null);
    setLogistikPreis(normalizePriceInput(e.target.value));
  };

  const onPreisBlur =
    (
      value: string,
      setValue: (v: string) => void,
      setError: (msg: string | null) => void,
      label: string
    ) =>
    () => {
      if (!value || value.trim() === '') {
        setError(`Bitte gib einen ${label} ein.`);
        return;
      }
      let v = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
      if (v === '.' || v === '') {
        setError(`Bitte gib einen ${label} ein.`);
        setValue('');
        return;
      }
      const firstDot = v.indexOf('.');
      if (firstDot !== -1) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
      }
      const n = Number(v);
      if (Number.isNaN(n)) {
        setError(`Bitte gib einen ${label} ein.`);
        setValue('');
        return;
      }
      const clamped = Math.min(Math.max(n, 0), 9_999_999.99);
      setValue(clamped.toFixed(2));
    };

  const gesamtPreisNumber: number | null = (() => {
    if (!gesamtPreis) return null;
    const n = Number(gesamtPreis.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })();

  const logistikPreisNumber: number | null = (() => {
    if (!logistikPreis) return null;
    const n = Number(logistikPreis.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })();

  const onPreisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    setGesamtPreisError(null);
    setLogistikPreisError(null);

    if (!gesamtPreis || gesamtPreis.trim() === '') {
      setGesamtPreisError('Bitte gib den Gesamtpreis für den Auftrag ein.');
      hasError = true;
    } else if (gesamtPreisNumber === null || gesamtPreisNumber <= 0) {
      setGesamtPreisError('Bitte gib einen gültigen Gesamtpreis > 0 ein.');
      hasError = true;
    }

    if (logistikNoetig) {
      if (!logistikPreis || logistikPreis.trim() === '') {
        setLogistikPreisError(
          'Bitte gib die Logistikkosten ein (Transport/Spedition).'
        );
        hasError = true;
      } else if (logistikPreisNumber === null || logistikPreisNumber < 0) {
        setLogistikPreisError(
          'Bitte gib einen gültigen Logistikpreis (≥ 0) ein.'
        );
        hasError = true;
      }
    }

    if (hasError) return;

    // TODO: API-Call (z.B. POST /api/angebote)
    const teile: string[] = [];
    if (gesamtPreisNumber != null) {
      teile.push(`Gesamtpreis (ohne Logistik): ${gesamtPreisNumber.toFixed(2)} €`);
    }
    if (logistikNoetig && logistikPreisNumber != null) {
      teile.push(`Logistikkosten: ${logistikPreisNumber.toFixed(2)} €`);
    }

    alert(
      `Angebot übermittelt für Auftrag #${auftrag.id}:\n` + teile.join('\n')
    );
  };

  return (
    <>
      <Navbar />

      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Bilder */}
          <div className={styles.leftColumn}>
            <div className={styles.imageWrapper}>
              <Image
                src={auftrag.bilder?.[photoIndex] || ''}
                alt={auftrag.verfahren[0]?.name || ''}
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
            {/* Titel + Badges */}
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                {auftrag.verfahren.map((v) => v.name).join(' & ')}
              </h1>
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

            {/* 🔝 OBERER TEIL: alle Eingaben außer Spezifikationen */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.label}>Material:</span>
                <span className={styles.value}>{auftrag.material}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Maße:</span>
                <span className={styles.value}>
                  {auftrag.length}×{auftrag.width}×{auftrag.height} mm
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Max. Masse:</span>
                <span className={styles.value}>{auftrag.masse}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Standort:</span>
                <span className={styles.value}>{auftrag.standort}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Warenausgabe per:</span>
                <span className={styles.value}>
                  {auftrag.warenausgabeArt || '-'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Datum Warenausgabe:</span>
                <span className={styles.value}>
                  {auftrag.warenausgabeDatum.toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Warenrückgabe per:</span>
                <span className={styles.value}>
                  {auftrag.warenannahmeArt || '-'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Datum Warenrückgabe:</span>
                <span className={styles.value}>
                  {auftrag.warenannahmeDatum.toLocaleDateString('de-DE')}
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

            {/* Beschreibung */}
            {auftrag.beschreibung && (
              <div className={styles.beschreibung}>
                <h2>Beschreibung</h2>
                <p>{auftrag.beschreibung}</p>
              </div>
            )}

            {/* 🔻 UNTERER TEIL: Spezifikationen pro Verfahren */}
            {auftrag.verfahren.map((v, idx) => {
              const entries = Object.entries(v.felder ?? {}).filter(
                ([, val]) => {
                  if (val == null) return false;
                  if (Array.isArray(val)) {
                    return (
                      val.length > 0 &&
                      val.some(
                        (x) =>
                          String(x).trim() !== '' &&
                          String(x).trim().toLowerCase() !== 'keine'
                      )
                    );
                  }
                  const str = String(val).trim();
                  if (!str) return false;
                  if (str.toLowerCase() === 'keine') return false;
                  return true;
                }
              );

              if (entries.length === 0) return null;

              return (
                <div key={idx} className={styles.verfahrenBlock}>
                  <h3 className={styles.verfahrenTitel}>
                    {v.name} – Spezifikationen
                  </h3>
                  <div className={styles.verfahrenGrid}>
                    {entries.map(([key, val]) => {
                      if (key.toLowerCase() === 'verfahren') return null;

                      const label = formatSpecLabel(key);

                      const displayValue = Array.isArray(val)
                        ? val
                            .filter(
                              (x) =>
                                String(x).trim() !== '' &&
                                String(x).trim().toLowerCase() !== 'keine'
                            )
                            .join(', ')
                        : String(val);

                      if (!displayValue || displayValue.trim() === '') {
                        return null;
                      }

                      return (
                        <div key={key} className={styles.metaItem}>
                          <span className={styles.label}>{label}:</span>
                          <span className={styles.value}>{displayValue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Ausklappbarer Preisbereich mit 2 Feldern */}
            <div className={`${styles.metaItem} ${styles.priceSection}`}>
              <button
                type="button"
                className={`${styles.buyButton} ${styles.disclosureBtn}`}
                aria-expanded={preisOpen}
                aria-controls="pricePanel"
                onClick={() => setPreisOpen((o) => !o)}
              >
                <span>Mach ein Angebot</span>
                <span className={styles.disclosureIcon}>
                  {preisOpen ? '▾' : '▸'}
                </span>
              </button>

              {preisOpen && (
                <form onSubmit={onPreisSubmit} className={styles.priceForm}>
                  <div className={styles.priceRow}>
                    <div className={styles.priceCol}>
                      <label
                        htmlFor="gesamtPreis"
                        className={styles.label}
                      >
                        Gesamtpreis für den Auftrag (ohne Logistik) (€):
                      </label>
                      <input
                        id="gesamtPreis"
                        type="text"
                        inputMode="decimal"
                        placeholder="z. B. 1490.00"
                        value={gesamtPreis}
                        onChange={onGesamtPreisChange}
                        onBlur={onPreisBlur(
                          gesamtPreis,
                          setGesamtPreis,
                          setGesamtPreisError,
                          'Gesamtpreis'
                        )}
                        aria-invalid={!!gesamtPreisError}
                        className={`${styles.priceInput} ${
                          gesamtPreisError ? styles.isInvalid : ''
                        }`}
                        autoComplete="off"
                        pattern="^\d{1,7}([.,]\d{1,2})?$"
                        title="Zahl mit bis zu 2 Nachkommastellen"
                      />
                    </div>

                    {logistikNoetig && (
                      <div className={styles.priceCol}>
                        <label
                          htmlFor="logistikPreis"
                          className={styles.label}
                        >
                          Logistikkosten (Transport/Spedition) (€):
                        </label>
                        <input
                          id="logistikPreis"
                          type="text"
                          inputMode="decimal"
                          placeholder="z. B. 120.00"
                          value={logistikPreis}
                          onChange={onLogistikPreisChange}
                          onBlur={onPreisBlur(
                            logistikPreis,
                            setLogistikPreis,
                            setLogistikPreisError,
                            'Logistikpreis'
                          )}
                          aria-invalid={!!logistikPreisError}
                          className={`${styles.priceInput} ${
                            logistikPreisError ? styles.isInvalid : ''
                          }`}
                          autoComplete="off"
                          pattern="^\d{1,7}([.,]\d{1,2})?$"
                          title="Zahl mit bis zu 2 Nachkommastellen"
                        />
                      </div>
                    )}
                  </div>

                  <button type="submit" className={styles.buyButton}>
                    Angebot abgeben
                  </button>

                  {gesamtPreisError || logistikPreisError ? (
                    <div
                      role="alert"
                      className={styles.priceError}
                      aria-live="polite"
                    >
                      {gesamtPreisError && <div>{gesamtPreisError}</div>}
                      {logistikPreisError && <div>{logistikPreisError}</div>}
                    </div>
                  ) : (
                    <div className={styles.priceHint}>
                      Abgegebene Angebote können nicht zurückgezogen werden. Mit
                      der Angebotsabgabe bestätigst du im Falle einer Annahme
                      vom Auftraggeber, alle Kundenanforderungen ausnahmslos
                      erfüllen zu können. Dein Angebot ist 72h, oder bis zum Tag
                      der Warenausgabe gültig.
                    </div>
                  )}
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
