// src/app/auftragsboerse/auftraege/[id]/AuftragDetailClient.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import styles from './detailseite.module.css'
import { FaFilePdf } from 'react-icons/fa'
import Lightbox from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import Link from 'next/link'
import type { Auftrag } from '@/lib/types/auftrag'

// ✅ mini-helper, damit Date | string sicher ist
const asDate = (d: Date | string | null | undefined) =>
  d instanceof Date ? d : d ? new Date(d) : null

export default function AuftragDetailClient({ auftrag }: { auftrag: Auftrag }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  const slides = (auftrag.bilder ?? []).map((src) => ({ src }))
  const verfahrenName = auftrag.verfahren.map((v) => v.name).join(' & ')

  const wa = asDate(auftrag.warenausgabeDatum)
  const wn = asDate(auftrag.warenannahmeDatum)

  return (
    <>
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
            {(auftrag.bilder ?? []).map((bild, i) => (
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

        {/* Rechte Spalte – hier kannst du deinen bestehenden Block 1:1 reinkopieren */}
        <div className={styles.rightColumn}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{verfahrenName}</h1>
            <div className={styles.badges}>
              {auftrag.gesponsert && <span className={`${styles.badge} ${styles.gesponsert}`}>Gesponsert</span>}
              {auftrag.gewerblich && <span className={`${styles.badge} ${styles.gewerblich}`}>Gewerblich</span>}
              {auftrag.privat && <span className={`${styles.badge} ${styles.privat}`}>Privat</span>}
            </div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.label}>Material:</span>
              <span className={styles.value}>{auftrag.material}</span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.label}>Warenausgabe per:</span>
              <span className={styles.value}>{auftrag.warenausgabeArt || '—'}</span>
            </div>

            <div className={styles.metaItem1}>
              <span className={styles.label}>Datum Warenausgabe:</span>
              <span className={styles.value}>{wa ? wa.toLocaleDateString('de-DE') : '—'}</span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.label}>Warenrückgabe per:</span>
              <span className={styles.value}>{auftrag.warenannahmeArt || '—'}</span>
            </div>

            <div className={styles.metaItem1}>
              <span className={styles.label}>Datum Warenrückgabe:</span>
              <span className={styles.value}>{wn ? wn.toLocaleDateString('de-DE') : '—'}</span>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.label}>Standort:</span>
              <span className={styles.value}>{auftrag.standort}</span>
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
          </div>

          {auftrag.dateien && auftrag.dateien.length > 0 && (
            <div className={styles.metaItem}>
              <span className={styles.label}>Downloads:</span>
              <ul className={styles.downloadList}>
                {auftrag.dateien.map((file, i) => (
                  <li key={i} className={styles.downloadItem}>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>
                      <FaFilePdf className={styles.fileIcon} />
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {auftrag.beschreibung && (
            <div className={styles.beschreibung}>
              <h2>Beschreibung</h2>
              <p className={styles.preserveNewlines}>{auftrag.beschreibung}</p>
            </div>
          )}

          {/* Deine Spezifikationsblöcke + Preisform kannst du hier wieder 1:1 reinkopieren */}
        </div>
      </div>

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
  )
}
