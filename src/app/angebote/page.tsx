'use client';
import React, { useState } from 'react';
import styles from './angebote.module.css';
import Pager from './navbar/pager';

export default function AngebotEinstellen() {
  const [dateien, setDateien] = useState<File[]>([]);
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [preis, setPreis] = useState('');
  const [kategorie, setKategorie] = useState('');

  const MAX_FILES = 8;
  const MAX_FILE_SIZE_MB = 5;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${file.name}" ist größer als ${MAX_FILE_SIZE_MB} MB und wird ignoriert.`);
        return false;
      }
      return true;
    });

    if (dateien.length + validFiles.length > MAX_FILES) {
      alert(`Maximal ${MAX_FILES} Dateien erlaubt.`);
      return;
    }

    setDateien((prev) => [...prev, ...validFiles]);
  };

  const handleRemove = (index: number) => {
    setDateien(dateien.filter((_, i) => i !== index));
  };

  const preventDefault = (e: React.DragEvent) => e.preventDefault();

  const getPreviewIcon = (file: File) => {
    if (file.type.startsWith('image/')) return URL.createObjectURL(file);
    if (file.type === 'application/pdf') {
      return "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZTI0MTQxIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik02LjUgMThoMTEuNXYyaC0xMS41em0wLTEwaDExLjV2MmgtMTEuNXptMCA0aDExLjV2MmgtMTEuNXoiLz48L3N2Zz4=";
    }
    if (file.name.endsWith('.zip')) {
      return "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMDA0Y2Y0IiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik0xOCAyNGgtMTJjLTEuMSAwLTItLjktMi0ydi0yMGMwLTEuMS45LTIgMi0yaDEwYzEuMSAwIDIgLjkgMiAydjIwYzAgMS4xLS45IDItMiAyem0tMTItMjBoMXYxaC0xem0xIDJ2MWgxdjF6bTAgMnYxaDF2MXptMCAydjFoMXoiLz48cGF0aCBkPSJtNiAxNmgzdi0xaC0zem0wLTRoM3YtMWgtM3ptMC00aDN2LTFoLTN6Ii8+PC9zdmc+";
    }
    return "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjY2NjIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik0yMCAyaC0xMWMtMS4xIDAtMiAuOS0yIDJ2MTZjMCAxLjEuOSAyIDIgMmgxMWMxLjEgMCAyLS45IDItMnYtMTZjMC0xLjEtLjktMi0yLTJ6bTAgMThoLTExdi0xNmgxMXYxNnoiLz48cGF0aCBkPSJtNiAxNmgzdi0xaC0zem0wLTRoM3YtMWgtM3ptMC00aDN2LTFoLTN6Ii8+PC9zdmc+";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ titel, beschreibung, preis, kategorie, dateien });
  };

  return (
    <>
      <Pager />

      <div className={styles.wrapper}>
        <h1 className={styles.heading}>Artikel Einstellen</h1> {/* Überschrift hinzugefügt */}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div
            className={styles.dropzone}
            onDrop={handleDrop}
            onDragOver={preventDefault}
            onDragEnter={preventDefault}
          >
            <p>Dateien hierher ziehen oder klicken</p>
            <input
              type="file"
              multiple
              className={styles.input}
              onChange={handleUploadClick}
            />
          </div>

          {dateien.length > 0 && (
            <div className={styles.preview}>
              {dateien.map((file, index) => (
                <div className={styles.fileCard} key={index}>
                  <img
                    src={getPreviewIcon(file)}
                    alt="preview"
                    className={styles.fileIcon}
                  />
                  <p className={styles.fileName}>{file.name}</p>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className={styles.removeButton}
                  >
                    ✖
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.additionalContent}>
            {/* Hier kannst du neue Inhalte hinzufügen */}
            <h2>Weitere Inhalte hier</h2>
            <p>Gib hier deine neuen Inhalte ein, z. B. einen Text oder Bilder!</p>
          </div>
        </form>
      </div>
    </>
  );
}
