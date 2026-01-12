'use client';

import React, { useEffect, useMemo, useState } from 'react';
import styles from './verkaufsseite.module.css';
import Dropzone from './Dropzone';
import DateiVorschau from './DateiVorschau';

type Props = {
  existingImageUrls: string[];
  existingFileUrls: string[];

  newImages: File[];
  setNewImages: React.Dispatch<React.SetStateAction<File[]>>;

  newFiles: File[];
  setNewFiles: React.Dispatch<React.SetStateAction<File[]>>;

  warnImages: string;
  setWarnImages: (msg: string) => void;

  warnFiles: string;
  setWarnFiles: (msg: string) => void;

  istGueltigeDatei: (file: File) => boolean;

  maxImages?: number; // default 8
  maxFiles?: number;  // default 8
};

function fileNameFromUrl(url: string) {
  try {
    const last = url.split('/').pop() || 'Datei';
    return decodeURIComponent(last);
  } catch {
    return 'Datei';
  }
}

export default function ArtikelMedien({
  existingImageUrls,
  existingFileUrls,
  newImages,
  setNewImages,
  newFiles,
  setNewFiles,
  warnImages,
  setWarnImages,
  warnFiles,
  setWarnFiles,
  istGueltigeDatei,
  maxImages = 8,
  maxFiles = 8,
}: Props) {
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = newImages.map((f) => URL.createObjectURL(f));
    setNewImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newImages]);

  const remainingImages = useMemo(
    () => Math.max(0, maxImages - (existingImageUrls?.length || 0)),
    [existingImageUrls, maxImages]
  );

  const remainingFiles = useMemo(
    () => Math.max(0, maxFiles - (existingFileUrls?.length || 0)),
    [existingFileUrls, maxFiles]
  );

  return (
    <>
      {/* Vorhandene Bilder (URLs) */}
      {existingImageUrls.length > 0 && (
        <div className={styles.mediaBox}>
          <h2 className={styles.mediaHeading}>Bereits vorhandene Bilder</h2>
          <div className={styles.mediaGrid}>
            {existingImageUrls.map((url, idx) => (
              <a
                key={url + idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                className={styles.mediaItem}
                title="In neuem Tab öffnen"
              >
                <img src={url} alt={`Vorhandenes Bild ${idx + 1}`} className={styles.mediaThumb} />
              </a>
            ))}
          </div>
          <p className={styles.mediaHint}>
            Upload ist nur <strong>zusätzlich</strong>. Restplätze: {remainingImages}
          </p>
        </div>
      )}

      {/* Zusätzliche Bilder */}
      <Dropzone
        type="bilder"
        label={
          remainingImages > 0
            ? `Zusätzliche Fotos hierher ziehen oder klicken (noch ${remainingImages} frei)`
            : 'Maximale Bildanzahl erreicht'
        }
        accept="image/*"
        maxFiles={remainingImages}
        files={newImages}
        setFiles={setNewImages}
        setWarnung={setWarnImages}
        id="fotoUploadExtra"
      />
      {warnImages && <p className={styles.validierungsfehler}>{warnImages}</p>}

      <DateiVorschau
        bilder
        files={newImages}
        previews={newImagePreviews}
        onRemove={(idx) => setNewImages((prev) => prev.filter((_, i) => i !== idx))}
      />

      {/* Vorhandene Dateien (URLs) */}
      {existingFileUrls.length > 0 && (
        <div className={styles.mediaBox}>
          <h2 className={styles.mediaHeading}>Bereits vorhandene Dateien</h2>
          <ul className={styles.mediaList}>
            {existingFileUrls.map((url, idx) => (
              <li key={url + idx}>
                <a href={url} target="_blank" rel="noreferrer">
                  {fileNameFromUrl(url)}
                </a>
              </li>
            ))}
          </ul>
          <p className={styles.mediaHint}>
            Upload ist nur <strong>zusätzlich</strong>. Restplätze: {remainingFiles}
          </p>
        </div>
      )}

      {/* Zusätzliche Dateien */}
      <Dropzone
        type="dateien"
        label={
          remainingFiles > 0
            ? `Zusätzliche Dateien hierher ziehen oder klicken (noch ${remainingFiles} frei)`
            : 'Maximale Dateianzahl erreicht'
        }
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dwg,.dxf,.step,.stp"
        maxFiles={remainingFiles}
        files={newFiles}
        setFiles={setNewFiles}
        istGueltig={istGueltigeDatei}
        setWarnung={setWarnFiles}
        id="dateiUploadExtra"
      />
      {warnFiles && <p className={styles.validierungsfehler}>{warnFiles}</p>}

      <DateiVorschau
        files={newFiles}
        onRemove={(idx) => setNewFiles((prev) => prev.filter((_, i) => i !== idx))}
      />
    </>
  );
}
