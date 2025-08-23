'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './sonderlacke.module.css';
import { FaSprayCan, FaCloud } from 'react-icons/fa';
import Navbar from '../components/navbar/Navbar'
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Dropzone from './Dropzone';
import DateiVorschau from './DateiVorschau';
import { Star, Search, Crown } from 'lucide-react';

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

  const erlaubteEndungen = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.dwg', '.dxf', '.step', '.stp'
  ];

  const dateiname = file.name.toLowerCase();

  const hatErlaubteEndung = erlaubteEndungen.some(ext => dateiname.endsWith(ext));
  const istErlaubterTyp = erlaubteMimeTypen.includes(file.type);
  

  return istErlaubterTyp || hatErlaubteEndung;
}
const heute = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
})();


  const glanzgradListe = [
  { name: 'Stumpfmatt', value: 'Stumpfmatt' },
  { name: 'Seidenmatt', value: 'Seidenmatt' },
  { name: 'Matt', value: 'Matt' },
  { name: 'Glanz', value: 'Glanz' },
  { name: 'Seidenglanz', value: 'Seidenglanz' },
  { name: 'Hochglanz', value: 'Hochglanz' },
];


function ArtikelEinstellen() {
  const searchParams = useSearchParams(); // <-- HIER
  const [kategorie, setKategorie] = useState<'nasslack' | 'pulverlack' | null>(null);
  const [titel, setTitel] = useState('');
  const [farbpaletteWert, setFarbpaletteWert] = useState('');
  const herstellerRef = useRef<HTMLDivElement>(null);
  const [zustand, setZustand] = useState('');
  const [warnungKategorie, setWarnungKategorie] = useState('');
  const [warnungBilder, setWarnungBilder] = useState('');
  const [warnungTitel, setWarnungTitel] = useState('');
  const [warnungMenge, setWarnungMenge] = useState('');
  const [warnungGlanzgrad, setWarnungGlanzgrad] = useState('');
  const [warnungPalette, setWarnungPalette] = useState('');
  const [WarnungOberflaeche, setWarnungOberflaeche] = useState('');
  const [warnungAnwendung, setWarnungAnwendung] = useState('');
  const [warnungZustand, setWarnungZustand] = useState('');
  const [anwendung, setAnwendung] = useState('');
  const [farbcode, setFarbcode] = useState('');
  const [glanzgradDropdownOffen, setGlanzgradDropdownOffen] = useState(false);
  const glanzgradRef = useRef<HTMLDivElement>(null);
  const [sondereffekte, setSondereffekte] = useState<string[]>([]);
  const [sondereffekteOffen, setSondereffekteOffen] = useState(false);
  const [qualitaet, setQualitaet] = useState('');
  const [qualitaetOffen, setQualitaetOffen] = useState(false);
  const [lieferadresseOption, setLieferadresseOption] = useState<'profil' | 'manuell'>('profil');
  const [lieferDatum, setLieferDatum] = useState<Date | null>(null);
  const [firma, setFirma] = useState('');
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [strasse, setStrasse] = useState('');
  const [hausnummer, setHausnummer] = useState('');
  const [plz, setPlz] = useState('');
  const [ort, setOrt] = useState('');
  const [land, setLand] = useState('');
  const [ladeStatus, setLadeStatus] = useState(false);
  const [bewerbungOptionen, setBewerbungOptionen] = useState<string[]>([])
  const [vorschauAktiv, setVorschauAktiv] = useState(false);
  const [zertifizierungen, setZertifizierungen] = useState<string[]>([]);
  const [menge, setMenge] = useState<number>(0);
  const [agbAccepted, setAgbAccepted] = useState(false)
  const [agbError, setAgbError] = useState(false)
  const agbRef = useRef<HTMLDivElement>(null)
  const [formAbgesendet, setFormAbgesendet] = useState(false);



const berechneFortschritt = () => {
  let total = 0, filled = 0;

  // 1. Kategorie
  total++;
  if (kategorie) filled++;

  // 2. Bilder
  total++;
  if (bilder.length > 0) filled++;

  // 3. Menge
  total++;
  if (menge > 0) filled++;

  // 4. Titel
  total++;
  if (titel.trim() !== '') filled++;

  // 5. Farbpalette
  total++;
  if (farbpaletteWert) filled++;

  // 6. Glanzgrad
  total++;
  if (glanzgrad) filled++;

  // 7. Zustand
  total++;
  if (zustand) filled++;

  // 8. Oberfläche
  total++;
  if (oberflaeche) filled++;

  // 9. Anwendung
  total++;
  if (anwendung) filled++;

  // 10. Beschreibung
  total++;
  if (beschreibung.trim() !== '') filled++;

  // 11. Lieferdatum
  total++;
  if (lieferDatum) filled++;

  // 12. Lieferadresse-Auswahl
  total++;
  if (lieferadresseOption) filled++;

  // Pulverlack-spezifisch: Aufladung
  if (kategorie === 'pulverlack') {
    total++;
    if (aufladung.length > 0) filled++;
  }
    // 13. AGB akzeptiert
  // AGB akzeptiert
total++;
if (agbAccepted) filled++;
  return Math.round((filled / total) * 100);
};

const formularZuruecksetzen = () => {
  setKategorie(null);
  setTitel('');
  setFarbton('');
  setGlanzgrad('');
  setFarbcode('');
  setHersteller('');
  setBeschreibung('');
  setMenge(0);
  setZustand('');
  setOberflaeche('');
  setAnwendung('');
  setEffekt([]);
  setSondereffekte([]);
  setQualitaet('');
  setBewerbungOptionen([]);
  setBilder([]);
  setDateien([]);
  setFarbpaletteWert('');
  setAufladung([]);
  setWarnung('');
  setWarnungKategorie('');
  setWarnungBilder('');
  setWarnungPalette('');
  setWarnungZustand('');
  setWarnungBeschreibung('');
  setLieferDatum(null);  
  setVorname('');
  setNachname('');
  setFirma('');
  setStrasse('');
  setHausnummer('');
  setPlz('');
  setOrt('');
  setLand('');
  setLieferadresseOption('profil'); // wieder Standard setzen
  setFormAbgesendet(false); // rote Rahmen weg
};

  const [aufladung, setAufladung] = useState<string[]>([]);
  const [oberflaeche, setOberflaeche] = useState('');

const [warnungAufladung, setWarnungAufladung] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
const [warnungBeschreibung, setWarnungBeschreibung] = useState('');

const resetFieldsExceptCategory = () => {
  setTitel('');
  setHersteller('');
  setMenge(0);  
  setFarbpaletteWert('');
  setFarbton('');
  setFarbcode('');
  setGlanzgrad('');
  setQualitaet('');
  setZustand('');
  setOberflaeche('');
  setAnwendung('');
  setZertifizierungen([]);
  setEffekt([]);  
  setSondereffekte([]);
  setBeschreibung('');
  setAufladung([]);
};
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
  const [farbton, setFarbton] = useState('');
  const [glanzgrad, setGlanzgrad] = useState('');
  const [hersteller, setHersteller] = useState('');
  const [effekt, setEffekt] = useState<string[]>([]);
  


  const [herstellerDropdownOffen, setHerstellerDropdownOffen] = useState(false);
    const herstellerListePulver = [
    'IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm Pulverlacke', 'Akzo Nobel',
    'Sherwin Williams', 'Brillux','Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
    'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL',
    'E-Pulverit', 'Braunsteiner', 'Ganzlin', 'Colors-Manufaktur', 'Aalbert',
    'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de', 'Pulverlacke24.de',
    'Pulverlacke.de', 'Pulverlack-pro.de', 'Pulverlackshop.de'
    ];
    const herstellerListeNass = [
  'Sherwin‑Williams', 'Brillux','PPG Industries',  'Akzo Nobel',  'Nippon Paint',  'RPM International',  'Axalta',  'BASF',  'Kansai',  'Asian Paints',  'Jotun',  'Hempel',  'Adler Lacke',
  'Berger',  'Nerolac',  'Benjamin Moore'
];

// 2. In deinem JSX-Dropdown wählst du die Liste dynamisch aus:
const aktuelleHerstellerListe =
  kategorie === 'nasslack'
    ? herstellerListeNass
    : kategorie === 'pulverlack'
    ? herstellerListePulver
    : [];

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
    if (glanzgradRef.current && !glanzgradRef.current.contains(event.target as Node)) {
      setGlanzgradDropdownOffen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

function handleMengeChange(e: React.ChangeEvent<HTMLInputElement>) {
  const val = e.target.value.replace(',', '.'); // <- neu
  if (val === '') {
    setMenge(0);
  } else if (/^\d{0,7}(\.\d{0,1})?$/.test(val)) {
    setMenge(parseFloat(val));
  }
}



  const fadeIn = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 },
};

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
  

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setFormAbgesendet(true); // 🔹 wichtig für rote Rahmen
  let fehler = false;

  // Pflichtfelder prüfen
  if (!kategorie) {
    setWarnungKategorie('Bitte wähle eine Kategorie aus.');
    fehler = true;
  } else {
    setWarnungKategorie('');
  }

  if (bilder.length === 0) {
    setWarnungBilder('Bitte lade mindestens ein Bild hoch.');
    fehler = true;
  } else {
    setWarnungBilder('');
  }  
    if (!titel.trim()) {
      setWarnungTitel('Bitte gib einen Titel an.');
      fehler = true;
    } else {
      setWarnungTitel('');}
      if (isNaN(menge) || menge <= 0) {
  setWarnungMenge('Bitte gib eine gültige Menge an.');
  fehler = true;
} else {
  setWarnungMenge('');
}

if (!glanzgrad) {
  setWarnungGlanzgrad('Bitte gib den Glanzgrad an.');
  fehler = true;
} else {
  setWarnungGlanzgrad('');
}

    

    if (!farbpaletteWert) {
      setWarnungPalette('Bitte wähle eine Farbpalette aus.');
      fehler = true;
    } else {
      setWarnungPalette('');
    }

    if (!oberflaeche) {
  setWarnungOberflaeche('Bitte wähle eine Oberfläche aus.');
  fehler = true;
} else {
  setWarnungOberflaeche('');
}

if (!anwendung) {
  setWarnungAnwendung('Bitte wähle eine Anwendung aus.');
  fehler = true;
} else {
  setWarnungAnwendung('');
}
    if (!zustand) {
      setWarnungZustand('Bitte wähle den Zustand aus.');
      fehler = true;
    } else {
      setWarnungZustand('');
    }
    if (kategorie === 'pulverlack') {
    if (aufladung.length === 0) {
      setWarnungAufladung('Bitte wähle mindestens eine Option bei der Aufladung.');
      fehler = true;
    } else {
      setWarnungAufladung('');
    }}
    

    if (!beschreibung.trim()) {
      setWarnungBeschreibung('Bitte gib eine Beschreibung ein.');
      fehler = true;
    } else {
      setWarnungBeschreibung('');
    }
    if (!agbAccepted) {
  setAgbError(true);
  agbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  fehler = true;  
} else {
  setAgbError(false);
}
if (lieferadresseOption === 'manuell') {
    if (!vorname.trim() || !nachname.trim() || !strasse.trim() || 
        !hausnummer.trim() || !plz.trim() || !ort.trim() || !land.trim()) {
      fehler = true;
    }
  }

if (fehler) {
    setLadeStatus(false);
    return;
  }

  setLadeStatus(true); // ✅ Nur hier aufrufen, wenn alles korrekt ist

  const formData = new FormData();
  formData.append('kategorie', kategorie!);
  formData.append('zertifizierungen', zertifizierungen.join(', '));
  formData.append('titel', titel);
    formData.append('farbton', farbton);
    formData.append('glanzgrad', glanzgrad);
    formData.append('hersteller', hersteller);
    formData.append('zustand', zustand);
    formData.append('farbpalette', farbpaletteWert);
    formData.append('beschreibung', beschreibung);    
    formData.append('anwendung', anwendung);
    formData.append('oberflaeche', oberflaeche);
    formData.append('farbcode', farbcode);
    formData.append('effekt', effekt.join(', '));
    formData.append('sondereffekte', sondereffekte.join(', '));
    formData.append('qualitaet', qualitaet);
    formData.append('bewerbung', bewerbungOptionen.join(','));
    formData.append('menge', menge.toString());
    formData.append('lieferadresseOption', lieferadresseOption);
    formData.append('vorname', vorname);
    formData.append('nachname', nachname);
    formData.append('firma', firma);
    formData.append('strasse', strasse);
    formData.append('hausnummer', hausnummer);
    formData.append('plz', plz);
    formData.append('ort', ort);
    formData.append('land', land);


  if (kategorie === 'pulverlack') {
    formData.append('aufladung', aufladung.join(', '));
  }

  bilder.forEach((file) => formData.append('bilder', file));
  dateien.forEach((file) => formData.append('dateien', file));

  try {
    const res = await fetch('/api/angebot-einstellen', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      alert('Erfolgreich hochgeladen!');
      formularZuruecksetzen(); // <- nutzt deine zentrale Funktion
      setBilder([]);
      setDateien([]);
      setWarnung('');
      setWarnungKategorie('');
      setWarnungBilder('');
      setWarnungPalette('');
      setWarnungZustand('');
      setFarbton('');
      setGlanzgrad('');
      setKategorie(null);
    } else {
      alert('Fehler beim Hochladen');
    }
  } catch (error) {
    console.error(error);
    alert('Serverfehler');
  } finally {
    setLadeStatus(false);
  }
};
const toggleBewerbung = (option: string) => {
  setBewerbungOptionen(prev =>
    prev.includes(option)
      ? prev.filter(o => o !== option)
      : [...prev, option]
  )
}
  return (
    <>
      <Navbar />
      
      <form onSubmit={handleSubmit} className={styles.container}>
        <motion.div
  {...fadeIn}
  className={styles.infoBox}
  viewport={{ once: true }}
>
  💡 Ab sofort ist das Einholen von Lack-Angeboten <strong>kostenlos</strong>!
  <a href="/mehr-erfahren" className={styles.infoLink}>Mehr erfahren</a>
</motion.div>        
        <h1 className={styles.heading}>Passenden Lack nicht gefunden? Kein Problem! </h1>
        <p className={styles.description}>
          Bitte lade aussagekräftige Bilder und relevante Unterlagen zu deinem Artikel hoch. Das erste Bild das du hochlädst wird dein Titelbild.
        </p>
        <Dropzone
  type="bilder"
  label="Fotos hierher ziehen oder klicken (max. 8)"
  accept="image/*"
  maxFiles={8}
  files={bilder}
  setFiles={setBilder}
  setWarnung={setWarnungBilder} // <-- das ist korrekt
  id="fotoUpload"
/>
{warnungBilder && (
  <p className={styles.validierungsfehler}>{warnungBilder}</p>
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
            <h2 className={styles.centeredHeading}>Ich möchte Angebote für einen</h2>
            <div  className={`${styles.iconRow} ${!kategorie && warnungKategorie ? styles.kategorieFehler : ''}`}
>

                <div
                className={`${styles.iconBox} ${kategorie === 'nasslack' ? styles.activeIcon : ''}`}
                     onClick={() => {
                  resetFieldsExceptCategory();
                  setKategorie('nasslack');
                }}
                >
              <FaSprayCan size={32} />
              <span>Nasslack</span>
            </div>
                <div
                    className={`${styles.iconBox} ${kategorie === 'pulverlack' ? styles.activeIcon : ''}`}
                         onClick={() => {
                      resetFieldsExceptCategory();
                      setKategorie('pulverlack');
                    }}
                    >
                    <FaCloud size={32} />

                    <span>Pulverlack</span>
                    </div>
              </div>            
            </div>
            {!kategorie && warnungKategorie && (
                        <p className={styles.validierungsfehler}>{warnungKategorie}</p>)}
                        
          {/* Dynamische Felder animiert */}
        {kategorie && (
          <AnimatePresence mode="wait">
            <motion.div
              key={kategorie}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className={styles.dynamicFields}
            >
            
{ (kategorie === 'pulverlack' || kategorie === 'nasslack') && (
  <>
    <label>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        Titel für meine Anzeige: <span style={{ color: 'red' }}>*</span>
      </span>

      <input
        type="text"
        className={styles.input}
        maxLength={60}
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
      />
      <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
    </label>

    {/* ⚠️ Warnung anzeigen, falls nötig */}
    {warnungTitel && (
      <p className={styles.validierungsfehler}>{warnungTitel}</p>
    )}
  

<label className={styles.label1}>
  Hersteller (optional):
  <div
    ref={herstellerRef}
    className={styles.customSelect}
    onClick={() => setHerstellerDropdownOffen(prev => !prev)}
  >
    <div className={styles.selectedValue}>{hersteller || 'Alle'}</div>
    {herstellerDropdownOffen && (
      <div className={styles.optionList}>
        <div
          className={styles.optionItem}
          onClick={e => {
            e.stopPropagation();
            setHersteller('');
            setHerstellerDropdownOffen(false);
          }}
        >
          Alle
        </div>
        {aktuelleHerstellerListe.map(option => (
          <div
            key={option}
            className={`${styles.optionItem} ${hersteller === option ? styles.activeOption : ''}`}
            onClick={e => {
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
<label className={styles.labelmenge}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Menge (kg): <span style={{ color: 'red' }}>*</span>
  </span>
  <input
    type="number"
    step="0.1"
    min="0.1"
    max="99999.9"
    className={styles.input}
    value={menge === 0 ? '' : menge}
    onChange={handleMengeChange}
    placeholder="z. B. 5.5"
    onKeyDown={(e) => {
      if (['e', 'E', '+', '-'].includes(e.key)) {
        e.preventDefault();
      }
    }}
  />
</label>
{warnungMenge && (
  <p className={styles.validierungsfehler}>{warnungMenge}</p>
)}
<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.0rem' }}>
    Farbpalette: <span style={{ color: 'red' }}>*</span>
  </span>

  {/* Unsichtbares echtes Pflichtfeld für native Validierung */}
  <select
  value={farbpaletteWert}
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
{warnungPalette && (
  <p className={styles.validierungsfehler}>{warnungPalette}</p>
)}

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
<label className={styles.labelFarbcode}>
  Farbcode (optional):
  <input
    type="text"
    className={styles.inputFarbcode}
    maxLength={20}
    value={farbcode}
    onChange={(e) => setFarbcode(e.target.value)}
    placeholder="z. B. #00e5ff"
  />
  <div className={styles.counter}>{farbcode.length} / 20 Zeichen</div>
</label>
<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Glanzgrad: <span style={{ color: 'red' }}>*</span>
  </span>

  {/* Unsichtbares echtes Select für Validierung */}
  <select
    value={glanzgrad}
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
    {glanzgradListe.map(g => (
      <option key={g.value} value={g.value}>{g.name}</option>
    ))}
  </select>

  {/* Benutzerdefiniertes Dropdown */}
  <div
    ref={glanzgradRef}
    className={styles.customSelect}
    onClick={() => setGlanzgradDropdownOffen(!glanzgradDropdownOffen)}
  >
    <div className={styles.selectedValue}>
      {glanzgradListe.find(g => g.value === glanzgrad)?.name || 'Bitte wählen'}
    </div>
    {glanzgradDropdownOffen && (
      <div className={styles.optionList}>
        {glanzgradListe.map(g => (
          <div
            key={g.value}
            className={`${styles.optionItem} ${glanzgrad === g.value ? styles.activeOption : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setGlanzgrad(g.value);
              setGlanzgradDropdownOffen(false);
            }}
          >
            {g.name}
          </div>
        ))}
      </div>
    )}
  </div>
</label>
{warnungGlanzgrad && (
  <p className={styles.validierungsfehler}>{warnungGlanzgrad}</p>
)}
{ kategorie === 'pulverlack' && (
<label className={styles.label}>
  Qualität (optional)
  <div
    className={styles.customSelect}
    onClick={() => setQualitaetOffen(!qualitaetOffen)}
    tabIndex={0}
    onBlur={() => setTimeout(() => setQualitaetOffen(false), 100)}
  >
    <div className={styles.selectedValue}>
      {qualitaet || 'Bitte wählen'}
    </div>
    {qualitaetOffen && (
      <div className={styles.optionList}>
        {[
          'Standard',
          'Polyester',
          'Epoxy-Polyester',
          'Polyurethan',
          'Polyester für Feuerverzinkung',          
          'Thermoplast',
        ].map((q) => (
          <div
            key={q}
            className={styles.optionItem}
            onClick={() => {
              setQualitaet(q);
              setQualitaetOffen(false);
            }}
          >
            {q}
          </div>
        ))}
      </div>
    )}
  </div>
</label>
)}
{ kategorie === 'nasslack' && (
<label className={styles.label}>
  Qualität (optional)
  <div
    className={styles.customSelect}
    onClick={() => setQualitaetOffen(!qualitaetOffen)}
    tabIndex={0}
    onBlur={() => setTimeout(() => setQualitaetOffen(false), 100)}
  >
    <div className={styles.selectedValue}>
      {qualitaet || 'Bitte wählen'}
    </div>
    {qualitaetOffen && (
      <div className={styles.optionList}>
        {[
          '1K‑Lack',
          '2K‑Lack',
          'UV‑härtender Lack',
        ].map((q) => (
          <div
            key={q}
            className={styles.optionItem}
            onClick={() => {
              setQualitaet(q);
              setQualitaetOffen(false);
            }}
          >
            {q}
          </div>
        ))}
      </div>
    )}
  </div>
</label>
)}

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
  <span>Neu & Ungeöffnet</span>
</label>

    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="zustand"
        value="geöffnet"
        checked={zustand === 'geöffnet'}
        onChange={() => setZustand('geöffnet')}
      />
      <span>Geöffnet & Einwandfrei</span>
    </label>
    {warnungZustand && (
  <p className={styles.validierungsfehlerradio}>{warnungZustand}</p>
)}
  </div>
</fieldset>   
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>
    Oberfläche: <span style={{ color: 'red' }}>*</span>
  </legend>
  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="oberflaeche"
        value="glatt"
        checked={oberflaeche === 'glatt'}
        onChange={() => setOberflaeche('glatt')}
      />
      <span>Glatt</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="oberflaeche"
        value="feinstruktur"
        checked={oberflaeche === 'feinstruktur'}
        onChange={() => setOberflaeche('feinstruktur')}
      />
      <span>Feinstruktur</span>
    </label>
    
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="oberflaeche"
        value="grobstruktur"
        checked={oberflaeche === 'grobstruktur'}
        onChange={() => setOberflaeche('grobstruktur')}
      />
      <span>Grobstruktur</span>
    </label>
    {WarnungOberflaeche && (
    <p className={styles.validierungsfehlerradio}>{WarnungOberflaeche}</p>
      )}
  </div>
</fieldset>
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>
    Anwendung: <span style={{ color: 'red' }}>*</span>
  </legend>
  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="anwendung"
        value="universal"
        checked={anwendung === 'universal'}
        onChange={() => setAnwendung('universal')}
      />
      <span>Universal</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="anwendung"
        value="innen"
        checked={anwendung === 'innen'}
        onChange={() => setAnwendung('innen')}
      />
      <span>Innen</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="anwendung"
        value="außen"
        checked={anwendung === 'außen'}
        onChange={() => setAnwendung('außen')}
      />
      <span>Außen</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="anwendung"
        value="industrie"
        checked={anwendung === 'industrie'}
        onChange={() => setAnwendung('industrie')}
      />
      <span>Industrie</span>
    </label>
    {warnungAnwendung && (
  <p className={styles.validierungsfehlerradio}>{warnungAnwendung}</p>
)}
  </div>
</fieldset>
{kategorie === 'pulverlack' && (
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>Zertifizierungen (optional):</legend>
  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="zertifizierungen"
        value="GSB"
        checked={zertifizierungen.includes('GSB')}
        onChange={(e) => {
          const checked = e.target.checked;
          setZertifizierungen(prev =>
            checked ? [...prev, 'GSB'] : prev.filter(v => v !== 'GSB')
          );
        }}
      />
      <span>GSB</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="zertifizierungen"
        value="Qualicoat"
        checked={zertifizierungen.includes('Qualicoat')}
        onChange={(e) => {
          const checked = e.target.checked;
          setZertifizierungen(prev =>
            checked ? [...prev, 'Qualicoat'] : prev.filter(v => v !== 'Qualicoat')
          );
        }}
      />
      <span>Qualicoat</span>
    </label>
  </div>
</fieldset>
)}
{kategorie === 'nasslack' && (
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>Zertifizierungen (optional):</legend>
  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="zertifizierungen"
        value="GEB EMICODE"
        checked={zertifizierungen.includes('GEB EMICODE')}
        onChange={(e) => {
          const checked = e.target.checked;
          setZertifizierungen(prev =>
            checked ? [...prev, 'GEB EMICODE'] : prev.filter(v => v !== 'GEB EMICODE')
          );
        }}
      />
      <span>GEB EMICODE</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="zertifizierungen"
        value="Blauer Engel"
        checked={zertifizierungen.includes('Blauer Engel')}
        onChange={(e) => {
          const checked = e.target.checked;
          setZertifizierungen(prev =>
            checked ? [...prev, 'Blauer Engel'] : prev.filter(v => v !== 'Blauer Engel')
          );
        }}
      />
      <span>Blauer Engel</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="zertifizierungen"
        value="EU Ecolabel"
        checked={zertifizierungen.includes('EU Ecolabel')}
        onChange={(e) => {
          const checked = e.target.checked;
          setZertifizierungen(prev =>
            checked ? [...prev, 'EU Ecolabel'] : prev.filter(v => v !== 'EU Ecolabel')
          );
        }}
      />
      <span>EU Ecolabel</span>
    </label>
  </div>
</fieldset>
)}
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>Effekt (optional):</legend>
  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="effekt"
        value="Metallic"
        checked={effekt.includes('Metallic')}
        onChange={(e) => {
          const checked = e.target.checked;
          setEffekt((prev) =>
            checked ? [...prev, 'Metallic'] : prev.filter((v) => v !== 'Metallic')
          );
        }}
      />
      <span>Metallic</span>
    </label>
    <label className={styles.radioLabel}>
      <input
        type="checkbox"
        name="effekt"
        value="Fluoreszierend"
        checked={effekt.includes('Fluoreszierend')}
        onChange={(e) => {
          const checked = e.target.checked;
          setEffekt((prev) =>
            checked ? [...prev, 'Fluoreszierend'] : prev.filter((v) => v !== 'Fluoreszierend')
          );
        }}
      />
      <span>Fluoreszierend</span>
    </label>
  </div>
</fieldset>
{/* Pulverlack‐Sondereffekte */}
{kategorie === 'pulverlack' && (
  <fieldset className={styles.radioGroup}>
    <legend className={styles.toggleLegend} onClick={() => setSondereffekteOffen(!sondereffekteOffen)} style={{ cursor: 'pointer' }}>
      Sondereffekte (Pulverlack) {sondereffekteOffen ? '▲' : '▼'}
    </legend>
    <AnimatePresence initial={false}>
      {sondereffekteOffen && (
        <motion.div className={styles.checkboxGrid} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
          {[
            'Hochwetterfest',
            'Ultra Hochwetterfest',
            'Transparent',
            'Niedrigtemperaturpulver',
            'Hochtemperaturpulver',
            'Anti-Ausgasung',
            'Kratzresistent',
            'Elektrisch Ableitfähig',
            'Solar geeignet',
            'Soft-Touch',
            'Hammerschlag',
            'Eisenglimmer',
            'Perlglimmer',
            'Selbstreinigend',
            'Anti-Bakteriell',
            'Anti-Grafitti',
            'Anti-Quietsch',
            'Anti-Rutsch',
          ].map((eff) => (
            <label key={eff} className={styles.radioLabel}>
              <input
                type="checkbox"
                name="sondereffekte"
                value={eff}
                checked={sondereffekte.includes(eff)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSondereffekte((prev) => (checked ? [...prev, eff] : prev.filter((v) => v !== eff)));
                }}
              />
              <span>{eff}</span>
            </label>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </fieldset>
)}

{/* Nasslack‐Sondereffekte */}
{kategorie === 'nasslack' && (
  <fieldset className={styles.radioGroup}>
    <legend className={styles.toggleLegend} onClick={() => setSondereffekteOffen(!sondereffekteOffen)} style={{ cursor: 'pointer' }}>
      Sondereffekte (Nasslack) {sondereffekteOffen ? '▲' : '▼'}
    </legend>
    <AnimatePresence initial={false}>
      {sondereffekteOffen && (
        <motion.div className={styles.checkboxGrid} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
          {[
            'Hochwetterfest',
            'Ultra Hochwetterfest',
            'Transparent',
            'Kratzresistent',
            'Elektrisch Ableitfähig',
            'Solar geeignet',
            'Soft-Touch',
            'Hammerschlag',
            'Eisenglimmer',
            'Perlglimmer',
            'Selbstreinigend',
            'Anti-Bakteriell',
            'Anti-Grafitti',
            'Anti-Quietsch',
            'Anti-Rutsch',
          ].map((eff) => (
            <label key={eff} className={styles.radioLabel}>
              <input
                type="checkbox"
                name="sondereffekte"
                value={eff}
                checked={sondereffekte.includes(eff)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSondereffekte((prev) => (checked ? [...prev, eff] : prev.filter((v) => v !== eff)));
                }}
              />
              <span>{eff}</span>
            </label>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </fieldset>
)}


{kategorie === 'pulverlack' && (
  <fieldset
    className={`${styles.radioGroup} ${
      formAbgesendet && aufladung.length === 0 ? styles.feldError : ''
    }`}
  >
    <legend className={styles.radioLegend}>
      Aufladung: <span style={{ color: 'red' }}>*</span>
    </legend>

    

    {/* Natives Pflichtfeld kann bleiben, ist aber optional */}
    {aufladung.length === 0 && (
      <input
        type="checkbox"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        onChange={() => {}}
      />
    )}

    <div className={styles.radioOptionsHorizontal}>
      <label className={styles.radioLabel}>
        <input
          type="checkbox"
          name="aufladung"
          value="Corona"
          checked={aufladung.includes('Corona')}
          onChange={(e) => {
            const checked = e.target.checked;
            setAufladung(prev => checked ? [...prev, 'Corona'] : prev.filter(v => v !== 'Corona'));
          }}
        />
        <span>Corona</span>
      </label>

      <label className={styles.radioLabel}>
        <input
          type="checkbox"
          name="aufladung"
          value="Tribo"
          checked={aufladung.includes('Tribo')}
          onChange={(e) => {
            const checked = e.target.checked;
            setAufladung(prev => checked ? [...prev, 'Tribo'] : prev.filter(v => v !== 'Tribo'));
          }}
        />
        <span>Tribo</span>
      </label>
      {/* Fehlermeldung gut sichtbar direkt unter der Legend */}
    {(formAbgesendet && aufladung.length === 0) && (
      <p className={styles.validierungsfehlerradio}>
        Bitte wähle mindestens eine Option bei der Aufladung.
      </p>
    )}
    </div>
  </fieldset>

)}
<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
  Beschreibung: <span style={{ color: 'red' }}>*</span>
</span>
  <textarea
    className={styles.textarea}
    maxLength={600}
    rows={6}
    value={beschreibung}
    onChange={(e) => setBeschreibung(e.target.value)}
    placeholder="Beschreibe deinen Artikel oder besondere Hinweise..."
  />
  <div className={styles.counter}>{beschreibung.length} / 600 Zeichen</div>
</label>
{warnungBeschreibung && (
  <p className={styles.validierungsfehler}>{warnungBeschreibung}</p>
)}
  </>
) }
    </motion.div>    
  </AnimatePresence>
)} 
<fieldset className={styles.radioGroupliefercontainer}>
  <legend className={styles.radioLegendlieferdetails}>
    Lieferdetails: <span style={{ color: 'red' }}>*</span>
  </legend>

  <div className={styles.lieferContainer}>
    <label className={styles.label}>
      Lieferdatum:
      <input
  type="date"
  value={lieferDatum ? lieferDatum.toISOString().split('T')[0] : ''}
  onChange={(e) => {
    const dateString = e.target.value;
    setLieferDatum(dateString ? new Date(dateString) : null);
  }}
  className={styles.dateInput}
  required
  min={heute}
/>
    </label>
    <fieldset className={styles.radioGrouplieferadressewaehlen}>
  <legend className={styles.radioLegendwaehlen}>
    Lieferadresse wählen: <span style={{ color: 'red' }}>*</span>
  </legend>

  <div className={styles.radioOptionsHorizontal}>
    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="lieferadresse"
        value="profil"
        checked={lieferadresseOption === 'profil'}
        onChange={() => setLieferadresseOption('profil')}
      />
      <span>Meine Anschrift verwenden</span>
    </label>

    <label className={styles.radioLabel}>
      <input
        type="radio"
        name="lieferadresse"
        value="manuell"
        checked={lieferadresseOption === 'manuell'}
        onChange={() => setLieferadresseOption('manuell')}
      />
      <span>Lieferadresse manuell eingeben</span>
    </label>
  </div>
</fieldset>

{lieferadresseOption === 'manuell' && (
  <div className={styles.grid3spaltig}>
<label className={styles.inputLabel}>
  Vorname
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !vorname.trim()
        ? styles.inputError
        : ''
    }`}
    value={vorname}
    maxLength={15}
    onChange={(e) =>
      setVorname(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß \-]/g, ''))
    }
  />
</label>

<label className={styles.inputLabel}>
  Nachname
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !nachname.trim()
        ? styles.inputError
        : ''
    }`}
    maxLength={30}
    value={nachname}
    onChange={(e) =>
      setNachname(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß \-]/g, ''))
    }
  />
</label>

<label className={styles.inputLabel}>
  Firma
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !firma.trim()
        ? styles.inputError
        : ''
    }`}
    maxLength={20}
    value={firma}
    onChange={(e) =>
      setFirma(e.target.value.replace(/[^a-zA-Z0-9äöüÄÖÜß .\-&]/g, ''))
    }
  />
</label>

<label className={styles.inputLabel}>
  Straße
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !strasse.trim()
        ? styles.inputError
        : ''
    }`}
    maxLength={40}
    value={strasse}
    onChange={(e) =>
      setStrasse(e.target.value.replace(/[^a-zA-Z0-9äöüÄÖÜß .\-]/g, ''))
    }
  />
</label>

<label className={styles.inputLabel}>
  Hausnummer
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet &&
      lieferadresseOption === 'manuell' &&
      (!hausnummer.trim() || !/\d/.test(hausnummer))
        ? styles.inputError
        : ''
    }`}
    maxLength={4}
    value={hausnummer}
    onChange={(e) =>
      setHausnummer(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))
    }
  />
</label>


<label className={styles.inputLabel}>
  PLZ
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !plz.trim()
        ? styles.inputError
        : ''
    }`}
    inputMode="numeric"
    pattern="[0-9]*"
    maxLength={6}
    value={plz}
    onChange={(e) => setPlz(e.target.value.replace(/\D/g, ''))}
  />
</label>

<label className={styles.inputLabel}>
  Ort
  <input
    type="text"
    className={`${styles.input} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !ort.trim()
        ? styles.inputError
        : ''
    }`}
    value={ort}
    maxLength={30}
    onChange={(e) =>
      setOrt(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß \-]/g, ''))
    }
  />
</label>

<label className={styles.inputLabel}>
  Land
  <select
    className={`${styles.select} ${
      formAbgesendet && lieferadresseOption === 'manuell' && !land
        ? styles.selectError
        : ''
    }`}
    value={land}
    onChange={(e) => setLand(e.target.value)}
  >
    <option value="" disabled hidden>Bitte wählen</option>
    <option value="Österreich">Österreich</option>
    <option value="Deutschland">Deutschland</option>
    <option value="Schweiz">Schweiz</option>
    <option value="Liechtenstein">Liechtenstein</option>
    <option value="Italien">Italien</option>
    <option value="Frankreich">Frankreich</option>
    <option value="Niederlande">Niederlande</option>
    <option value="Belgien">Belgien</option>
    <option value="Luxemburg">Luxemburg</option>
    <option value="Tschechien">Tschechien</option>
    <option value="Slowakei">Slowakei</option>
    <option value="Slowenien">Slowenien</option>
    <option value="Polen">Polen</option>
    <option value="Ungarn">Ungarn</option>
  </select>
</label>

</div>

)}
{lieferadresseOption === 'profil' && (
  <div className={styles.grid3spaltig}>
    <label className={styles.inputLabel}>
      Vorname
      <input type="text" className={styles.input} value="Max" disabled />
    </label>
    <label className={styles.inputLabel}>
      Nachname
      <input type="text" className={styles.input} value="Muster" disabled />
    </label>
    <label className={styles.inputLabel}>
      Firma
      <input type="text" className={styles.input} value="Muster GmbH" disabled />
    </label>
    <label className={styles.inputLabel}>
      Straße
      <input type="text" className={styles.input} value="Musterstraße" disabled />
    </label>
    <label className={styles.inputLabel}>
      Hausnummer
      <input type="text" className={styles.input} value="12" disabled />
    </label>
    <label className={styles.inputLabel}>
      PLZ
      <input type="text" className={styles.input} value="12345" disabled />
    </label>
    <label className={styles.inputLabel}>
      Ort
      <input type="text" className={styles.input} value="Musterstadt" disabled />
    </label>
    <label className={styles.inputLabel}>
      Land
      <input type="text" className={styles.input} value="Österreich" disabled />
    </label>
  </div>
)}

    
  </div>
</fieldset>
<div className={styles.bewerbungGruppe}>
  <label className={styles.bewerbungOption}>
    <input
      type="checkbox"
      onChange={() => toggleBewerbung('startseite')}
      checked={bewerbungOptionen.includes('startseite')}
    />
    <Star size={18} color="#f5b400" />
    Anzeige auf Startseite hervorheben (39,99 €)
  </label>

  <label className={styles.bewerbungOption}>
    <input
      type="checkbox"
      onChange={() => toggleBewerbung('suche')}
      checked={bewerbungOptionen.includes('suche')}
    />
    <Search size={18} color="#0070f3" />
    Anzeige in Suche priorisieren (17,99 €)
  </label>

  <label className={styles.bewerbungOption}>
    <input
      type="checkbox"
      onChange={() => toggleBewerbung('premium')}
      checked={bewerbungOptionen.includes('premium')}
    />
    <Crown size={18} color="#9b59b6" />
    Premium-Anzeige aktivieren (19,99 €)
  </label>

  <p className={styles.steuerHinweis}>Preise inkl. MwSt.</p>
</div>
<div className={styles.agbContainer} ref={agbRef}>

  <motion.label
  className={`${styles.agbLabel} ${agbError ? styles.agbError : ''}`}
  animate={agbError ? { x: [0, -4, 4, -4, 0] } : {}}
  transition={{ duration: 0.3 }}
>
  <input
    type="checkbox"
    id="agbCheckbox"
    checked={agbAccepted}
    onChange={(e) => {
      setAgbAccepted(e.target.checked);
      setAgbError(false);
    }}
  />
  <span>
    Ich akzeptiere die{' '}
    <a href="/agb" className={styles.nutzungsbedingungenLink}>
      Allgemeinen Geschäftsbedingungen
    </a>{' '}
    zur Gänze. Informationen zur Verarbeitung deiner Daten findest du in unserer{' '}
    <a href="/datenschutz" className={styles.agbLink}>
      Datenschutzerklärung
    </a>.
  </span>
</motion.label>

{agbError && (
  <p className={styles.validierungsfehleragb}>Bitte akzeptiere die AGB.</p>
)}

  

</div>
<button
  type="button"
  onClick={() => setVorschauAktiv(prev => !prev)}
  className={styles.vorschauToggle}
>
  {vorschauAktiv ? 'Vorschau ausblenden ▲' : 'Vorschau anzeigen ▼'}
</button>

<AnimatePresence>
  {vorschauAktiv && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={styles.vorschauBox}
    >
      <h3>📝 Vorschau deiner Angaben</h3>

      <p><strong>Kategorie:</strong> {kategorie || '–'}</p>
      <p><strong>Titel:</strong> {titel || '–'}</p>
      <p><strong>Farbton:</strong> {farbton || '–'}</p>
      <p><strong>Menge (kg):</strong> {menge || '–'}</p>
      <p><strong>Farbcode:</strong> {farbcode || '–'}</p>
      <p><strong>Glanzgrad:</strong> {glanzgrad || '–'}</p>
      <p><strong>Farbpalette:</strong> {farbpaletteWert || '–'}</p>
      <p><strong>Hersteller:</strong> {hersteller || '–'}</p>
      <p><strong>Oberfläche:</strong> {oberflaeche || '–'}</p>
      <p><strong>Anwendung:</strong> {anwendung || '–'}</p>
      <p><strong>Effekte:</strong> {effekt.join(', ') || '–'}</p>
      <p><strong>Sondereffekte:</strong> {sondereffekte.join(', ') || '–'}</p>
      <p><strong>Qualität:</strong> {qualitaet || '–'}</p>
      <p><strong>Zertifizierungen:</strong> {zertifizierungen.join(', ') || '–'}</p>

      {/* Nur für Pulverlack */}
      {kategorie === 'pulverlack' && (
        <p><strong>Aufladung:</strong> {aufladung.join(', ') || '–'}</p>
      )}

      <p><strong>Bewerbung:</strong> {bewerbungOptionen.join(', ') || 'Keine ausgewählt'}</p>
      <p><strong>Bilder:</strong> {bilder.length} Bild(er) ausgewählt</p>
      <p><strong>Dateien:</strong> {dateien.length} Datei(en) ausgewählt</p>
      <p><strong>Lieferdatum:</strong> {lieferDatum ? lieferDatum.toLocaleDateString('de-DE') : '–'}</p>
      <p><strong>AGB:</strong> {agbAccepted ? '✓ akzeptiert' : '✗ nicht akzeptiert'}</p>
    </motion.div>
  )}
</AnimatePresence>
    <button type="submit" className={styles.submitBtn} disabled={ladeStatus}>
  {ladeStatus ? (
    <>
      Anzeige wird veröffentlicht
      <span className={styles.spinner}></span>
    </>
  ) : (
    'Anzeige veröffentlichen'
  )}
</button>
<div className={styles.buttonRechts}>
  <button
    type="button"
    onClick={formularZuruecksetzen}
    className={styles.zuruecksetzenButton}
  >
    Alle Eingaben zurücksetzen
  </button>
</div>
    <div className={styles.progressContainer}>
  <div className={styles.progressBarWrapper}>
    <div
      className={styles.progressBar}
      style={{ width: `${berechneFortschritt()}%` }}
    >
      <span className={styles.progressValue}>{berechneFortschritt()}%</span>
    </div>
  </div>
</div>
      </form>
    </>
  );
}
export default ArtikelEinstellen;
