'use client';
import React, { useState } from 'react';
import styles from './angebote.module.css';
import Pager from './navbar/pager';

export default function AngebotEinstellen() {
  const [dateien, setDateien] = useState<File[]>([]); // Zustand für hochgeladene Dateien
  const MAX_FILES = 8;
  const MAX_FILE_SIZE_MB = 20;

  // Funktion für das Drag-and-Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleUploadClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
  };

  // Dateien hinzufügen
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

    setDateien(prev => [...prev, ...validFiles]);
  };

  // Dateien entfernen
  const handleRemove = (index: number) => {
    setDateien(dateien.filter((_, i) => i !== index));
  };

  // Vorschau des Dateityps
  const getPreviewIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file); // Für Bilder: Vorschau direkt über die URL
    }
    if (file.type === 'application/pdf') {
      return "/pdf-icon.png"; // Pfad zu einem PDF-Icon (muss vorhanden sein)
    }
    if (file.name.endsWith('.zip')) {
      return "/zip-icon.png"; // Pfad zu einem ZIP-Icon (muss vorhanden sein)
    }
    return "/file-icon.png"; // Standard-Icon für alle anderen Dateitypen
  };

  // Submit-Funktion (beispielsweise für API-Aufruf)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formular gesendet');
    // Hier könntest du eine API-Anfrage oder ein anderes Submit-Verfahren hinzufügen
  };

  return (
    <>
      <Pager />

      <div className={styles.wrapper}>
        <h1 className={styles.heading}>Artikel Einstellen</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div
            className={styles.dropzone}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
          >
            <label htmlFor="file-upload" className={styles.dropzoneLabel}>
              Dateien hierher ziehen oder klicken
            </label>
            <input
              type="file"
              id="file-upload"
              multiple
              className={styles.input}
              onChange={handleUploadClick}
            />
          </div>

          {/* Vorschau der hochgeladenen Dateien */}
          {dateien.length > 0 && (
            <div className={styles.preview}>
              {dateien.map((file, index) => (
                <div className={styles.fileCard} key={index}>
                  <img
                    src={getPreviewIcon(file)} // Verwenden des richtigen Icons
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
        </form>
      </div>
    </>
  );
}
