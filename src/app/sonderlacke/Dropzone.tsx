'use client';
import React, { useState } from 'react';
import styles from './sonderlacke.module.css';

const nurBilder = (file: File) => file.type.startsWith('image/');

interface DropzoneProps {
  label: string;
  accept: string;
  maxFiles: number;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  istGueltig?: (file: File) => boolean;
  maxDateigroesseMB?: number;
  setWarnung: (msg: string) => void;
  id: string;
  type?: 'bilder' | 'dateien';
}

const Dropzone: React.FC<DropzoneProps> = ({
  label,
  accept,
  maxFiles,
  files,
  setFiles,
  istGueltig = nurBilder,
  maxDateigroesseMB = 10,
  setWarnung,
  id,
  type,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const istZuGross = (file: File) => file.size > maxDateigroesseMB * 1024 * 1024;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const dropped = Array.from(e.dataTransfer.files);
    const zuGross = dropped.filter(istZuGross);
    if (zuGross.length > 0) {
      setWarnung(`Einige Dateien überschreiten ${maxDateigroesseMB} MB.`);
      return;
    }

    const ungeeignet = dropped.filter(file => {
      if (type === 'bilder') return !file.type.startsWith('image/');
      return istGueltig && !istGueltig(file);
    });
    if (ungeeignet.length > 0) {
      setWarnung(type === 'bilder' ? 'Nur Bilddateien erlaubt.' : 'Einige Dateien sind nicht erlaubt.');
      return;
    }

    const gefiltert = istGueltig ? dropped.filter(istGueltig) : dropped;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const auswahl = Array.from(e.target.files);
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
    }
  };

  return (
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
  );
};

export default Dropzone;
