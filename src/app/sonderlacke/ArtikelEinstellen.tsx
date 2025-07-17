'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './sonderlacke.module.css';
import { FaCloud } from 'react-icons/fa'; 
import { FaSprayCan } from 'react-icons/fa';
import Pager from './navbar/pager';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Dropzone from './Dropzone';
import DateiVorschau from './DateiVorschau';



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
  return erlaubteMimeTypen.includes(file.type);}

export default function ArtikelEinstellen() {
  const searchParams = useSearchParams(); // <-- HIER
  const [kategorie, setKategorie] = useState<'nasslack' | 'pulverlack' | null>(null);
  const [titel, setTitel] = useState('');
  const [farbpaletteWert, setFarbpaletteWert] = useState('');
  const herstellerRef = useRef<HTMLDivElement>(null);
  const [zustand, setZustand] = useState('');
  const [warnungKategorie, setWarnungKategorie] = useState('');




useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (herstellerRef.current && !herstellerRef.current.contains(event.target as Node)) {
      setHerstellerDropdownOffen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);


  


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
  const [hersteller, setHersteller] = useState('');

  const [herstellerDropdownOffen, setHerstellerDropdownOffen] = useState(false);
    const herstellerListe = [
    'IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm Pulverlacke', 'Akzo Nobel',
    'Sherwin Williams', 'Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
    'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL',
    'E-Pulverit', 'Braunsteiner', 'Ganzlin', 'Colors-Manufaktur', 'Aalbert',
    'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de', 'Pulverlacke24.de',
    'Pulverlacke.de', 'Pulverlack-pro.de', 'Pulverlackshop.de'
    ];
    const farbpalette = [
  { name: 'Nach Vorlage ', value: 'Nach Vorlage' },
  { name: 'RAL ', value: 'RAL' },
  { name: 'NCS', value: 'NCS' },
  { name: 'MCS', value: 'MCS' },
  { name: 'Candy', value: 'Candy' },
  { name: 'Neon', value: 'Neon' },
  { name: 'Pantone', value: 'Pantone' },
  { name: 'Sikkens', value: 'Sikkens' },
  { name: 'Munsell', value: 'Munsell' },
  { name: 'HKS', value: 'HKS' },
  { name: 'DB', value: 'DB' },
  { name: 'BS', value: 'BS' },
  { name: 'Klarlack', value: 'Klarlack' },
  { name: 'RAL D2-Design', value: 'RAL D2-Design' },
  { name: 'RAL E4-Effekt', value: 'RAL E4-Effekt' },
];

const [farbpaletteDropdownOffen, setFarbpaletteDropdownOffen] = useState(false);
const farbpaletteRef = useRef<HTMLDivElement>(null);
  

  



  

 

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (farbpaletteRef.current && !farbpaletteRef.current.contains(event.target as Node)) {
      setFarbpaletteDropdownOffen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

  useEffect(() => {
    const urls = bilder.map(file => URL.createObjectURL(file));
    setBildPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [bilder]);
  

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Kategorie prüfen
  if (!kategorie) {
    setWarnungKategorie('Bitte wähle eine Kategorie aus.');
  } else {
    setWarnungKategorie('');
  }

  // Bilder prüfen
  if (bilder.length === 0) {
    setWarnung('Bitte lade mindestens ein Bild hoch.');
  } else {
    setWarnung('');
  }

  // Pflichtfelder bei Pulverlack prüfen
  if (kategorie === 'pulverlack') {
    if (!titel.trim()) {
      setWarnung('Bitte gib einen Titel an.');
    } else if (!farbpaletteWert) {
      setWarnung('Bitte wähle eine Farbpalette aus.');
    } else if (!zustand) {
      setWarnung('Bitte wähle den Zustand aus.');
    } else {
      setWarnung('');
    }
  }

  // Wenn irgendeine Warnung aktiv ist: abbrechen
  if (!kategorie || bilder.length === 0 || (kategorie === 'pulverlack' && (!titel.trim() || !farbpaletteWert || !zustand))) {
    return;
  }

  const formData = new FormData();
  formData.append('kategorie', kategorie);

  if (kategorie === 'pulverlack') {
    formData.append('titel', titel);
    formData.append('farbton', farbton);
    formData.append('glanzgrad', glanzgrad);
    formData.append('hersteller', hersteller);
    formData.append('zustand', zustand);
    formData.append('farbpalette', farbpaletteWert);
  }

  if (kategorie === 'nasslack') {
    formData.append('modell', modell);
    formData.append('baujahr', baujahr);
  }

  bilder.forEach((file) => formData.append('bilder', file));
  dateien.forEach((file) => formData.append('dateien', file));

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
      setWarnungKategorie('');
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

        <Dropzone
  type="bilder"
  label="Fotos hierher ziehen oder klicken (max. 8)"
  accept="image/*"
  maxFiles={8}
  files={bilder}
  setFiles={setBilder}
  setWarnung={setWarnung}
  id="fotoUpload"
/>


        {bilder.length === 0 && warnung && (
          <p className={styles.validierungsfehler}>{warnung}</p>
        )}

                {/* Vorschau Bilder */}
                <DateiVorschau
          bilder
          files={bilder}
          previews={bildPreviews}
          onRemove={(idx) => setBilder(prev => prev.filter((_, i) => i !== idx))}
        />


        <Dropzone
  type="dateien"
  label="Dateien hierher ziehen oder klicken (max. 8)"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.dwg,.dxf,.step,.stp"
  maxFiles={8}
  files={dateien}
  setFiles={setDateien}
  istGueltig={istGueltigeDatei}
  setWarnung={setWarnung}
  id="dateiUpload"
/>


        {/* Vorschau Dateien */}
        <DateiVorschau
          files={dateien}
          onRemove={(idx) => setDateien(prev => prev.filter((_, i) => i !== idx))}
        />

        

        {/* Kategorie-Auswahl */}
        <div className={styles.kategorieContainer}>
            <h2>Artikelkategorie wählen:</h2>
            <div className={`${styles.iconRow} ${!kategorie && warnung.includes('Kategorie') ? styles.kategorieFehler : ''}`}>

                <div
                className={`${styles.iconBox} ${kategorie === 'nasslack' ? styles.activeIcon : ''}`}
                onClick={() => setKategorie('nasslack')}
                >
                <FaSprayCan size={32} />
                <span>Nasslack</span>
                </div>
                <div
                    className={`${styles.iconBox} ${kategorie === 'pulverlack' ? styles.activeIcon : ''}`}
                    onClick={() => setKategorie('pulverlack')}
                    >
                    <FaCloud size={32} />

                    <span>Pulverlack</span>
                    </div>
                    

            </div>
            
            </div>
            {!kategorie && warnungKategorie && (
                        <p className={styles.validierungsfehler}>{warnungKategorie}</p>
                        )}
            



        {/* Dynamische Felder animiert */}
        {(kategorie === 'nasslack' || kategorie === 'pulverlack') && (
          <AnimatePresence mode="wait">
            <motion.div
              key={kategorie}
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

      { kategorie === 'pulverlack' && (
  <>
  <label>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Titel: <span style={{ color: 'red' }}>*</span>
  </span>

  <input
    type="text"
    className={styles.input}
    maxLength={60}
    value={titel}
    onChange={(e) => setTitel(e.target.value)}
    required
  />
  <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
</label>
<label className={styles.label}>
  Hersteller (optional):
  <div ref={herstellerRef} className={styles.customSelect} onClick={() => setHerstellerDropdownOffen(!herstellerDropdownOffen)}>
    <div className={styles.selectedValue}>{hersteller || 'Alle'}</div>
    {herstellerDropdownOffen && (
      <div className={styles.optionList}>
        <div
          className={styles.optionItem}
          onClick={(e) => {
            e.stopPropagation();
            setHersteller('');
            setHerstellerDropdownOffen(false);
          }}
        >
          Alle
        </div>
        {herstellerListe.map((option) => (
          <div
            key={option}
            className={`${styles.optionItem} ${hersteller === option ? styles.activeOption : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setHersteller(option);
              setHerstellerDropdownOffen(false);
            }}
          >
            {option}
          </div>
        ))}
      </div>
    )}
  </div>
</label>
<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Farbpalette: <span style={{ color: 'red' }}>*</span>
  </span>

  {/* Unsichtbares echtes Pflichtfeld für native Validierung */}
  <select
  value={farbpaletteWert}
  required
  onChange={() => {}}
  style={{
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: -1,
  }}
>

    <option value="">Bitte wählen</option>
    {farbpalette.map(f => (
      <option key={f.value} value={f.value}>
        {f.name}
      </option>
    ))}
  </select>

  {/* Benutzerdefiniertes Dropdown */}
  <div
    ref={farbpaletteRef}
    className={styles.customSelect}
    onClick={() => setFarbpaletteDropdownOffen(!farbpaletteDropdownOffen)}
  >
    <div className={styles.selectedValue}>
      {farbpalette.find(f => f.value === farbpaletteWert)?.name || 'Bitte wählen'}
    </div>
    {farbpaletteDropdownOffen && (
      <div className={styles.optionList}>
        {farbpalette.map(farbe => (
          <div
            key={farbe.value}
            className={`${styles.optionItem} ${farbpaletteWert === farbe.value ? styles.activeOption : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setFarbpaletteWert(farbe.value);
              setFarbpaletteDropdownOffen(false);
            }}
          >
            {farbe.name}
          </div>
        ))}
      </div>
    )}
  </div>
</label>

    {/* Dropdown: Farbton */}
<label>
  Farbton (optional):
  <input
    type="text"
    className={styles.input}
    maxLength={20}
    value={farbton}
    onChange={(e) => setFarbton(e.target.value)}
    placeholder="z. B. 9010 bei RAL oder S-8500 bei NCS "
  />
  <div className={styles.counter}>{farbton.length} / 20 Zeichen</div>
</label>
{/* Radio: Zustand */}
{/* Radio: Zustand */}
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>
    Zustand: <span style={{ color: 'red' }}>*</span>
  </legend>
  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
  <input
    type="radio"
    name="zustand"
    value="neu"
    checked={zustand === 'neu'}
    onChange={() => setZustand('neu')}
  />
  <span>Neu und ungeöffnet</span>
</label>

    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="zustand"
        value="geöffnet"
        checked={zustand === 'geöffnet'}
        onChange={() => setZustand('geöffnet')}
        required
      />
      <span>Geöffnet, aber einwandfrei</span>
    </label>
  </div>
</fieldset>   
  </>
) }

    </motion.div>
  </AnimatePresence>
)}        <button type="submit" className={styles.submitBtn}>Angebote einholen</button>
      </form>
    </>
  );
}
