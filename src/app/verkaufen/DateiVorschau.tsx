// components/DateiVorschau.tsx
'use client';
import React from 'react';
import styles from './verkaufsseite.module.css';

interface DateiVorschauProps {
  bilder?: boolean;
  files: File[];
  previews?: string[]; // nur für Bilder
  onRemove: (index: number) => void;
}

const DateiVorschau: React.FC<DateiVorschauProps> = ({ bilder = false, files, previews = [], onRemove }) => {
  if (files.length === 0) return null;

  return (
    <div className={styles.vorschau}>
      <h2>{bilder ? 'Bilder:' : 'Dateien:'}</h2>
      {bilder ? (
        <div className={styles.thumbnailGrid}>
          {previews.map((url, idx) => (
            <div key={idx} className={styles.previewItem}>
              <img src={url} alt={`Bild ${idx + 1}`} className={styles.thumbnail} />
              <button type="button" onClick={() => onRemove(idx)} className={styles.removeBtn}>
                Entfernen
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul>
          {files.map((file, idx) => (
            <li key={idx}>
              {file.name}
              <button type="button" onClick={() => onRemove(idx)} className={styles.removeBtn}>
                Entfernen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DateiVorschau;
