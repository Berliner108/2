'use client';

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

function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

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

  // Preis-Accordion + Validierung
  const [preisOpen, setPreisOpen] = useState(false);
  const [preis, setPreis] = useState<string>('');
  const [preisError, setPreisError] = useState<string | null>(null);

  const onPreisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreisError(null);
    let v = e.target.value.replace(/,/g, '.').replace(/[^\d.]/g, '');
    if (v.startsWith('.')) v = '0' + v;

    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }

    let [int = '', dec = ''] = v.split('.');
    if (int.length > 7) int = int.slice(0, 7);

    if (v.endsWith('.')) {
      setPreis(int + '.');
      return;
    }

    if (dec) dec = dec.slice(0, 2);
    setPreis(dec ? `${int}.${dec}` : int);
  };

  const onPreisBlur = () => {
    if (!preis || preis.trim() === '') {
      setPreisError('Bitte gib einen Preis ein.');
      return;
    }
    let v = preis.replace(/,/g, '.').replace(/[^\d.]/g, '');
    if (v === '.' || v === '') {
      setPreisError('Bitte gib einen Preis ein.');
      setPreis('');
      return;
    }
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
      v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }
    const n = Number(v);
    if (Number.isNaN(n)) {
      setPreisError('Bitte gib einen Preis ein.');
      setPreis('');
      return;
    }
    const clamped = Math.min(Math.max(n, 0), 9_999_999.99);
    setPreis(clamped.toFixed(2));
  };

  const preisNumber: number | null = (() => {
    if (!preis) return null;
    const n = Number(preis.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  })();

  const onPreisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preis || preis.trim() === '') {
      setPreisError('Bitte gib einen Preis ein.');
      return;
    }
    if (preisNumber === null || preisNumber <= 0) {
      setPreisError('Bitte gib einen gültigen Preis > 0 ein.');
      return;
    }
    // TODO: API-Call (z.B. POST /api/angebote)
    alert(`Preis übermittelt: ${preisNumber.toFixed(2)} € (Auftrag #${auftrag.id})`);
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
                  className={`${styles.thumbnail} ${i === photoIndex ? styles.thumbnailActive : ''}`}
                  onClick={() => setPhotoIndex(i)}
                />
              ))}
            </div>
          </div>

          {/* Rechte Spalte */}
          <div className={styles.rightColumn}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                {auftrag.verfahren.map((v) => v.name).join(' & ')}
              </h1>
              <div className={styles.badges}>
                {auftrag.gesponsert && (
                  <span className={`${styles.badge} ${styles.gesponsert}`}>Gesponsert</span>
                )}
                {auftrag.gewerblich && (
                  <span className={`${styles.badge} ${styles.gewerblich}`}>Gewerblich</span>
                )}
                {auftrag.privat && (
                  <span className={`${styles.badge} ${styles.privat}`}>Privat</span>
                )}
              </div>
            </div>

            {/* Meta */}
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
                <span className={styles.value}>{auftrag.warenausgabeArt || '-'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Datum Warenausgabe:</span>
                <span className={styles.value}>
                  {auftrag.warenausgabeDatum.toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Warenrückgabe per:</span>
                <span className={styles.value}>{auftrag.warenannahmeArt || '-'}</span>
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
                  href={`/messages?empfaenger=${encodeURIComponent(auftrag.user)}`}
                  className={styles.kontaktLink}
                >
                  User kontaktieren
                </Link>
              </div>
            )}

            {/* Dynamische Felder */}
            {auftrag.verfahren.map((v, idx) => {
              const entries = Object.entries(v.felder);
              if (entries.length === 0) return null;
              return (
                <div key={idx} className={styles.verfahrenBlock}>
                  <h3 className={styles.verfahrenTitel}>{v.name}</h3>
                  <div className={styles.verfahrenGrid}>
                    {entries.map(([key, val]) => (
                      <div key={key} className={styles.metaItem}>
                        <span className={styles.label}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^\w/, (c) => c.toUpperCase())}:
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

            {/* Beschreibung */}
            {auftrag.beschreibung && (
              <div className={styles.beschreibung}>
                <h2>Beschreibung</h2>
                <p>{auftrag.beschreibung}</p>
              </div>
            )}

            {/* Ausklappbarer Preisbereich */}
            <div className={`${styles.metaItem} ${styles.priceSection}`}>
              <button
                type="button"
                className={`${styles.buyButton} ${styles.disclosureBtn}`}
                aria-expanded={preisOpen}
                aria-controls="pricePanel"
                onClick={() => setPreisOpen((o) => !o)}
              >
                <span>Mach ein Angebot</span>
                <span className={styles.disclosureIcon}>{preisOpen ? '▾' : '▸'}</span>
              </button>

              {preisOpen && (
                <form onSubmit={onPreisSubmit} className={styles.priceForm}>
                  <label htmlFor="preis" className={styles.label}>
                    Dein Preis (€):
                  </label>
                  <div className={styles.priceRow}>
                    <input
                      id="preis"
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 449.90"
                      value={preis}
                      onChange={onPreisChange}
                      onBlur={onPreisBlur}
                      aria-invalid={!!preisError}
                      className={`${styles.priceInput} ${preisError ? styles.isInvalid : ''}`}
                      autoComplete="off"
                      pattern="^\d{1,7}([.,]\d{1,2})?$"
                      title="Zahl mit bis zu 2 Nachkommastellen"
                    />
                    <button type="submit" className={styles.buyButton}>
                      Angebot abgeben
                    </button>
                  </div>

                  {preisError ? (
                    <div role="alert" className={styles.priceError} aria-live="polite">
                      {preisError}
                    </div>
                  ) : (
                    <div className={styles.priceHint}>
                      Abgegebene Angebote können nicht zurückgezogen werden. Mit der Angebotsabgabe bestätigst du im Falle einer Annahme vom Auftraggeber, alle Kundenanforderungen ausnahmslos erfüllen zu können. Dein Angebot ist 72h, oder bis zum Tag der Warenausgabe gültig.
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
