// page.tsx
'use client';

import { notFound } from 'next/navigation';
import { useParams } from 'next/navigation';
import { dummyAuftraege } from '../dummyAuftraege';
import { useState } from 'react';
import Image from 'next/image';
import styles from './detailseite.module.css';
import Pager from './navbar/pager';
import { FaFilePdf } from 'react-icons/fa';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Link from 'next/link';

export default function AuftragDetailPage() {
  const params = useParams();
  const auftrag = dummyAuftraege.find((a) => a.id.toString() === params.id);
  if (!auftrag) return notFound();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const slides = auftrag.bilder?.map((src) => ({ src })) || [];

  return (
    <>
      <Pager />
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* ← Linke Spalte: Bilder + Thumbnails */}
          <div className={styles.leftColumn}>
            {/* Wrapper um das Bild */}
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

          {/* → Rechte Spalte: Titel, Badges, Meta, Downloads, Beschreibung, Button */}
          <div className={styles.rightColumn}>
            <div className={styles.titleRow}>
  <h1 className={styles.title}>
    {auftrag.verfahren.map(v => v.name).join(' & ')}
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


            {/* Meta‑Bereich als 2‑Spalten‑Grid */}
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.label}>Material:</span>
                <span className={styles.value}>{auftrag.material}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Maße:</span>
                <span className={styles.value}>
                  {auftrag.length}×{auftrag.width}×{auftrag.height} mm
                </span>
              </div>
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


              <div className={styles.metaItem}>
                <span className={styles.label}>Masse:</span>
                <span className={styles.value}>{auftrag.masse}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Standort:</span>
                <span className={styles.value}>{auftrag.standort}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Lieferart:</span>
                <span className={styles.value}>{auftrag.lieferArt}</span>
                </div>
                <div className={styles.metaItem}>
                <span className={styles.label}>Lieferdatum:</span>
                <span className={styles.value}>
                    {new Date(auftrag.lieferdatum).toLocaleDateString('de-DE')}
                </span>
                </div>
                <div className={styles.metaItem}>
                <span className={styles.label}>Abholart:</span>
                <span className={styles.value}>{auftrag.abholArt}</span>
                </div>
                <div className={styles.metaItem}>
                <span className={styles.label}>Abholdatum:</span>
                <span className={styles.value}>
                    {new Date(auftrag.abholdatum).toLocaleDateString('de-DE')}
                </span>
                </div>

            </div>
                        {/* Dynamische Felder aus jedem Verfahren */}
            {/* Dynamische Felder aus jedem Verfahren */}
{auftrag.verfahren.map((v, idx) => {
  const entries = Object.entries(v.felder)
  if (entries.length === 0) return null
  return (
    <div key={idx} className={styles.verfahrenBlock}>
      <h3 className={styles.verfahrenTitel}>{v.name}</h3>
      {/* Hier kommt der neue 2‑Spalten-Wrapper */}
      <div className={styles.verfahrenGrid}>
        {entries.map(([key, val]) => (
          <div key={key} className={styles.metaItem}>
            <span className={styles.label}>
              {key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^\w/, c => c.toUpperCase())}
              :
            </span>
            <span className={styles.value}>
              {Array.isArray(val) ? val.join(', ') : val}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})}


            

            {/* Downloads */}
            {auftrag.dateien?.length > 0 && (
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


            {/* Beschreibung ganz unten */}
            {auftrag.beschreibung && (
              <div className={styles.beschreibung}>
                <h2>Beschreibung</h2>
                <p>{auftrag.beschreibung}</p>
              </div>
            )}

            {/* Button unter der Beschreibung */}
            <button className={styles.buyButton}>Kaufen / Angebot machen</button>
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
