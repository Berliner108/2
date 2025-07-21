'use client';

import { notFound } from 'next/navigation';
import { artikelDaten } from '@/data/ArtikelDatenLackanfragen';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import styles from './ArtikelDetail.module.css';
import Pager from './navbar/pager';
import { FaFilePdf } from 'react-icons/fa';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Link from 'next/link';  // ganz oben in der Datei

// ✅ HIER EINSETZEN
type PageProps = {
  params: {
    id: string;
  };
};

// ✅ richtig
export default function ArtikelDetailPage() {
  const params = useParams();
  const artikel = artikelDaten.find((a) => a.id.toString() === params.id);

  
  if (!artikel) return notFound();

  
  

  const [preis, setPreis] = useState('');
  const [extraPreisVisible, setExtraPreisVisible] = useState(false);
  const [extraPreis, setExtraPreis] = useState('');
  const [showFarbcodeHint, setShowFarbcodeHint] = useState(false);

  // Lightbox-Zustände
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (!artikel) return notFound();

  const slides = artikel.bilder?.map((bild) => ({ src: bild })) || [];

  return (
    <>
      <Pager />
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Linke Spalte: Bilder */}
          <div className={styles.leftColumn}>
            {/* Hauptbild anklickbar */}
            <img
              src={artikel.bilder?.[photoIndex]}
              alt={artikel.titel}
              className={styles.image}
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'pointer' }}
            />
            <div className={styles.thumbnails}>
              {artikel.bilder?.map((bild, i) => (
                <img
                  key={i}
                  src={bild}
                  alt={`Bild ${i + 1}`}
                  className={`${styles.thumbnail} ${i === photoIndex ? styles.activeThumbnail : ''}`}
                  onClick={() => setPhotoIndex(i)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Infos */}
          <div className={styles.rightColumn}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{artikel.titel}</h1>
              {artikel.gesponsert && (
                <span className={`${styles.badge} ${styles.gesponsert}`}>Gesponsert</span>
              )}
            </div>

            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.label}>Lieferdatum bis:</span>
                <span className={styles.value}>
                  {new Date(artikel.lieferdatum).toLocaleDateString('de-DE')}
                </span>

              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Zustand:</span>
                <span className={styles.value}>{artikel.zustand}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Hersteller:</span>
                <span className={styles.value}>{artikel.hersteller}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Lieferort:</span>
                <span className={styles.value}>{artikel.ort}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Farbcode:</span>
                <span className={styles.value}>{artikel.farbcode}</span>

                <div className={styles.farbcodeHintWrapper}>
                  <button
                    type="button"
                    onClick={() => setShowFarbcodeHint(!showFarbcodeHint)}
                    className={styles.farbcodeHintButton}
                    aria-expanded={showFarbcodeHint}
                    aria-controls="farbcode-hint"
                  >
                    So findest du den Farbcode heraus
                  </button>

                  {showFarbcodeHint && (
                    <div id="farbcode-hint" className={styles.farbcodeHintBox}>
                      <p>
                        Um den Farbcode einer Farbe herauszufinden, kannst du z.B. das Entwickler-Tool deines Browsers nutzen
                        (Rechtsklick → <em>Untersuchen</em>), oder du verwendest diesen{' '}
                        <a href="https://www.w3schools.com/colors/colors_picker.asp" target="_blank" rel="noopener noreferrer">
                          Farbcode-Picker
                        </a>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Anwendung:</span>
                <span className={styles.value}>{artikel.anwendung}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Glanzgrad:</span>
                <span className={styles.value}>{artikel.glanzgrad}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Oberfläche:</span>
                <span className={styles.value}>{artikel.oberfläche}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Sondereigenschaft:</span>
                <span className={styles.value}>{artikel.sondereigenschaft}</span>
              </div>

              {artikel.menge && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Menge (kg):</span>
                  <span className={styles.value}>{artikel.menge}</span>
                </div>
              )}

              {artikel.kategorie && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Kategorie:</span>
                  <span className={styles.value}>{artikel.kategorie}</span>
                </div>
              )}

{artikel.user && (
  <div className={styles.metaItem}>
    <span className={styles.label}>User:</span>
    <span className={styles.value}>{artikel.user}</span>
    <div>
    <Link href={`/messages?empfaenger=${encodeURIComponent(artikel.user)}`} className={styles.kontaktLink}>
  User kontaktieren
</Link>
    </div>
  </div>
)}

              {artikel.effekt && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Effekt:</span>
                  <span className={styles.value}>{artikel.effekt}</span>
                </div>
              )}

              {artikel.dateien && artikel.dateien.length > 0 && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Downloads:</span>
                  <ul className={styles.downloadList}>
                    {artikel.dateien.map((file, i) => (
                      <li key={i} className={styles.downloadItem}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>
                          <FaFilePdf style={{ color: 'red', marginRight: '0.4rem' }} />
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {artikel.beschreibung && (
                <div className={styles.beschreibung}>
                  <h2>Beschreibung</h2>
                  <p>{artikel.beschreibung}</p>
                </div>
              )}
            </div>

            <div className={styles.badges}>
              {artikel.gewerblich && (
                <span className={`${styles.badge} ${styles.gewerblich}`}>Gewerblich</span>
              )}
              {artikel.privat && (
                <span className={`${styles.badge} ${styles.privat}`}>Privat</span>
              )}
            </div>

            <div className={styles.offerBox}>
              <div className={styles.inputGroup}>
                Preis inkl. Versand:
                <input
                  type="number"
                  value={preis}
                  onChange={(e) => setPreis(e.target.value)}
                  className={styles.priceField}
                  placeholder="Preis (€)"
                />

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={extraPreisVisible}
                    onChange={(e) => setExtraPreisVisible(e.target.checked)}
                  />
                  <span>&nbsp;5 Musterbleche anbieten</span>
                </label>

                {extraPreisVisible && (
                  <input
                    type="number"
                    value={extraPreis}
                    onChange={(e) => setExtraPreis(e.target.value)}
                    className={styles.altPriceField}
                    placeholder="Preis inkl. Versand (€)"
                  />
                )}
              </div>

              <button className={styles.submitOfferButton}>Lack verbindlich anbieten</button>
              <p className={styles.offerNote}>
                Mit der Angebotsabgabe bestätigen Sie, die Anforderungen zur Gänze erfüllen zu können. Ihr Angebot ist 24h gültig.
              </p>
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
    on={{
      view: ({ index }) => setPhotoIndex(index),
    }}
  />
)}

    </>
  );
}
