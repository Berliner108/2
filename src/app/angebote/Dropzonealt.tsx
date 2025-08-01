'use client';
import React, { useState, useEffect } from 'react';
import styles from './sonderlackedropzone.module.css';

const nurBilder = (file: File) => file.type.startsWith('image/');

interface DropzoneProps {
  label: string;
  accept: string;
  maxFiles: number;
  istGueltig?: (file: File) => boolean;
  maxDateigroesseMB?: number;
  id: string;
  type?: 'bilder' | 'dateien';
  onUpdate?: (files: File[]) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({
  label,
  accept,
  maxFiles,
  istGueltig = nurBilder,
  maxDateigroesseMB = 10,
  id,
  type = 'dateien',
  onUpdate,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [warnung, setWarnung] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const istZuGross = (file: File) => file.size > maxDateigroesseMB * 1024 * 1024;

  useEffect(() => {
    if (type === 'bilder') {
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviews(urls);
      return () => urls.forEach(url => URL.revokeObjectURL(url));
    }
  }, [files, type]);

  useEffect(() => {
    if (onUpdate) onUpdate(files);
  }, [files, onUpdate]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (auswahl: File[]) => {
    const zuGross = auswahl.filter(istZuGross);
    if (zuGross.length > 0) {
      setWarnung(`Einige Dateien überschreiten ${maxDateigroesseMB} MB.`);
      return;
    }

    const ungeeignet = auswahl.filter(file => {
      if (type === 'bilder') return !file.type.startsWith('image/');
      return istGueltig && !istGueltig(file);
    });
    if (ungeeignet.length > 0) {
      setWarnung(type === 'bilder' ? 'Nur Bilddateien erlaubt.' : 'Einige Dateien sind nicht erlaubt.');
      return;
    }

    const gefiltert = istGueltig ? auswahl.filter(istGueltig) : auswahl;
    if (gefiltert.length === 0) {
      setWarnung(type === 'bilder' ? 'Bitte lade mindestens ein Bild hoch.' : 'Bitte lade mindestens eine gültige Datei hoch.');
      return;
    }

    const neueDateien = [...files, ...gefiltert];
    if (neueDateien.length > maxFiles) {
      setWarnung(`Maximal ${maxFiles} Dateien erlaubt.`);
      return;
    }

    setFiles(neueDateien);
    setWarnung('');
  };

  const handleRemove = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
  };

  return (
    <div>
      <div
        className={`
          ${styles.dropzone}
          ${type === 'bilder' ? styles.dropzoneFotos : ''}
          ${type === 'dateien' ? styles.dropzoneDateien : ''}
          ${isDragging ? styles.dragActive : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => document.getElementById(id)?.click()}
      >
        <p>{isDragging ? 'Dateien hier loslassen' : label}</p>
        <input
          id={id}
          type="file"
          accept={accept}
          multiple
          className={styles.hidden}
          onChange={handleChange}
        />
      </div>

      {warnung && <p className={styles.warnung}>{warnung}</p>}

      {files.length > 0 && (
        <div className={styles.vorschau}>
          <h3>{type === 'bilder' ? 'Bilder:' : 'Dateien:'}</h3>
          {type === 'bilder' ? (
            <div className={styles.thumbnailGrid}>
              {previews.map((url, idx) => (
                <div key={idx} className={styles.previewItem}>
                  <img src={url} alt={`Bild ${idx + 1}`} className={styles.thumbnail} />
                  <button type="button" onClick={() => handleRemove(idx)} className={styles.removeBtn}>
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
                  <button type="button" onClick={() => handleRemove(idx)} className={styles.removeBtn}>
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default Dropzone;
