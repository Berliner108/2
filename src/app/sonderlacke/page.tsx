'use client';

import { useState, useEffect } from 'react';
import styles from './sonderlacke.module.css';
import { Paintbrush, Hammer } from 'lucide-react';
import Pager from './navbar/pager';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';




function istGueltigeDatei(file: File): boolean {
  const erlaubteMimeTypen = [
    'application/pdf',
    'application/vnd.dwg',
    'application/dxf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'model/step',
    'model/stl',
  ];
  return erlaubteMimeTypen.includes(file.type);
}

export default function ArtikelEinstellen() {
  const searchParams = useSearchParams(); // <-- HIER
  const [kategorie, setKategorie] = useState<'nasslack' | 'pulverlack' | null>(null);


  useEffect(() => {
  const vorausgewaehlt = searchParams.get('kategorie');
  if (vorausgewaehlt === 'nasslack' || vorausgewaehlt === 'pulverlack') {
    setKategorie(vorausgewaehlt);
  }
}, [searchParams]);
  const [bilder, setBilder] = useState<File[]>([]);
  const [dateien, setDateien] = useState<File[]>([]);
  const [bildPreviews, setBildPreviews] = useState<string[]>([]);
  const [warnung, setWarnung] = useState('');
  
  const [modell, setModell] = useState('');
  const [baujahr, setBaujahr] = useState('');
  const [farbton, setFarbton] = useState('');
  const [glanzgrad, setGlanzgrad] = useState('');
  

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    files: File[],
    setFiles: React.Dispatch<React.SetStateAction<File[]>>,
    max: number,
    filterFunktion?: (file: File) => boolean
  ) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    const gefiltert = filterFunktion ? dropped.filter(filterFunktion) : dropped;
    const neueDateien = [...files, ...gefiltert];

    if (neueDateien.length > max) {
      setWarnung(`Maximal ${max} Dateien erlaubt.`);
      return;
    }

    if (gefiltert.length !== dropped.length) {
      setWarnung('Einige Dateien wurden aufgrund ihres Formats ignoriert.');
    } else {
      setWarnung('');
    }

    setFiles(neueDateien);
  };

  const removeFile = (index: number, setFiles: React.Dispatch<React.SetStateAction<File[]>>) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const urls = bilder.map(file => URL.createObjectURL(file));
    setBildPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [bilder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bilder.length === 0) {
      setWarnung('Bitte lade mindestens ein Bild hoch.');
      return;
    }

    const formData = new FormData();
    bilder.forEach((file) => formData.append('bilder', file));
    dateien.forEach((file) => formData.append('dateien', file));
    formData.append('kategorie', kategorie || '');

    if (kategorie === 'nasslack') {
      formData.append('modell', modell);
      formData.append('baujahr', baujahr);
    }

    if (kategorie === 'pulverlack') {
      formData.append('farbton', farbton);
      formData.append('glanzgrad', glanzgrad);
    }

    try {
      const res = await fetch('/api/artikel-einstellen', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert('Erfolgreich hochgeladen!');
        setBilder([]);
        setDateien([]);
        setWarnung('');
        setModell('');
        setBaujahr('');
        setFarbton('');
        setGlanzgrad('');
        setKategorie(null);
      } else {
        alert('Fehler beim Hochladen');
      }
    } catch {
      alert('Serverfehler');
    }
    
  };

  return (
    <>
      <Pager />
      <form onSubmit={handleSubmit} className={styles.container}>
        <h1 className={styles.heading}>Artikel einstellen</h1>
        <p className={styles.description}>
          Bitte lade aussagekräftige Bilder und relevante Unterlagen zu deinem Artikel hoch.
        </p>

        {/* Dropzone Bilder */}
        <div
          className={`${styles.dropzone} ${styles.dropzoneFotos} ${bilder.length === 0 && warnung ? styles.dropzoneFehler : ''}`}
          onDrop={(e) => handleDrop(e, bilder, setBilder, 8)}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('fotoUpload')?.click()}
        >
          <p>Fotos hierher ziehen oder klicken (max. 8)</p>
          <input
            id="fotoUpload"
            type="file"
            accept="image/*"
            multiple
            className={styles.hidden}
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) {
                const neueDateien = [...bilder, ...Array.from(target.files)];
                if (neueDateien.length > 8) {
                  setWarnung('Maximal 8 Bilder erlaubt.');
                  return;
                }
                setWarnung('');
                setBilder(neueDateien);
              }
            }}
          />
        </div>

        {bilder.length === 0 && warnung && (
          <p className={styles.validierungsfehler}>{warnung}</p>
        )}

        {/* Vorschau Bilder */}
        {bildPreviews.length > 0 && (
          <div className={styles.vorschau}>
            <h2>Bilder:</h2>
            <div className={styles.thumbnailGrid}>
              {bildPreviews.map((url, idx) => (
                <div key={idx} className={styles.previewItem}>
                  <img src={url} alt={`Bild ${idx + 1}`} className={styles.thumbnail} />
                  <button type="button" onClick={() => removeFile(idx, setBilder)} className={styles.removeBtn}>
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dropzone Dateien */}
        <div
          className={`${styles.dropzone} ${styles.dropzoneDateien}`}
          onDrop={(e) => handleDrop(e, dateien, setDateien, 8, istGueltigeDatei)}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('dateiUpload')?.click()}
        >
          <p>Dateien hierher ziehen oder klicken (max. 8)</p>
          <input
            id="dateiUpload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dwg,.dxf,.step,.stp"
            className={styles.hidden}
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              if (target.files) {
                const gefiltert = Array.from(target.files).filter(istGueltigeDatei);
                const neueDateien = [...dateien, ...gefiltert];

                if (neueDateien.length > 8) {
                  setWarnung('Maximal 8 gültige Dateien erlaubt.');
                  return;
                }

                if (gefiltert.length !== target.files.length) {
                  setWarnung('Einige Dateien wurden aufgrund ihres Formats ignoriert.');
                } else {
                  setWarnung('');
                }

                setDateien(neueDateien);
              }
            }}
          />
        </div>

        {/* Vorschau Dateien */}
        {dateien.length > 0 && (
          <div className={styles.vorschau}>
            <h2>Dateien:</h2>
            <ul>
              {dateien.map((file, idx) => (
                <li key={idx}>
                  {file.name}
                  <button type="button" onClick={() => removeFile(idx, setDateien)} className={styles.removeBtn}>
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Kategorie-Auswahl */}
        <div className={styles.kategorieContainer}>
  <h2>Artikelkategorie wählen:</h2>
  <div className={styles.iconRow}>
    <div
      className={`${styles.iconBox} ${kategorie === 'nasslack' ? styles.activeIcon : ''}`}
      onClick={() => setKategorie('nasslack')}
    >
      <Paintbrush size={32} />
      <span>Nasslack</span>
    </div>
    <div
      className={`${styles.iconBox} ${kategorie === 'pulverlack' ? styles.activeIcon : ''}`}
      onClick={() => setKategorie('pulverlack')}
    >
      <Hammer size={32} />
      <span>Pulverlack</span>
    </div>
  </div>
</div>


        {/* Dynamische Felder animiert */}
        <AnimatePresence mode="wait">
  <motion.div
    key={kategorie} // ← das sorgt für Übergangsanimation
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    transition={{ duration: 0.3 }}
    className={styles.dynamicFields}
  >
    {kategorie === 'nasslack' && (
      <>
        <label>
          Modell:
          <input type="text" className={styles.input} value={modell} onChange={(e) => setModell(e.target.value)} />
        </label>
        <label>
          Baujahr:
          <input type="number" className={styles.input} value={baujahr} onChange={(e) => setBaujahr(e.target.value)} />
        </label>
      </>
    )}

    {kategorie === 'pulverlack' && (
      <>
        <label>
          Farbton:
          <input type="text" className={styles.input} value={farbton} onChange={(e) => setFarbton(e.target.value)} />
        </label>
        <label>
          Glanzgrad:
          <select className={styles.input} value={glanzgrad} onChange={(e) => setGlanzgrad(e.target.value)}>
            <option value="">Bitte wählen</option>
            <option value="matt">Matt</option>
            <option value="seidenglanz">Seidenglanz</option>
            <option value="glänzend">Glänzend</option>
          </select>
        </label>
      </>
    )}
  </motion.div>
</AnimatePresence>



        <button type="submit" className={styles.submitBtn}>Absenden</button>
      </form>
    </>
  );
}
