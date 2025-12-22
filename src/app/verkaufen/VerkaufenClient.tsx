'use client'; 

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './verkaufsseite.module.css';
import { FaSprayCan, FaCloud, FaTools } from 'react-icons/fa';
import Navbar from '../components/navbar/Navbar'
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Dropzone from './Dropzone';
import DateiVorschau from './DateiVorschau';
import { Star, Search, Crown, Loader2 } from 'lucide-react';

/* ---------------- Fancy Loader Components ---------------- */

function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div
      className={styles.skeletonPage}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Header */}
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      {/* Info-/Hinweisbox */}
      <div className={styles.skelBlock} />

      {/* Dropzone-Bereich */}
      <div className={styles.skelDrop} />
      <div className={styles.skelDropSmall} />

      {/* Kategorie-Icons */}
      <div className={styles.skelThreeCols}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>

      {/* Ein paar Eingabefelder */}
      <div className={styles.skelGrid}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>

      {/* Preis / Versand / Werktage */}
      <div className={styles.skelThreeCols}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>
    </div>
  );
}
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))


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
const heute = new Date().toISOString().split('T')[0];


  const glanzgradListe = [
  { name: 'Stumpfmatt', value: 'Stumpfmatt' },
  { name: 'Seidenmatt', value: 'Seidenmatt' },
  { name: 'Matt', value: 'Matt' },
  { name: 'Glanz', value: 'Glanz' },
  { name: 'Seidenglanz', value: 'Seidenglanz' },
  { name: 'Hochglanz', value: 'Hochglanz' },
];

type ConnectStatus = { ready: boolean; reason?: string | null; mode?: 'test' | 'live' };

function ArtikelEinstellen() {
  const router = useRouter()
const [overlayTitle, setOverlayTitle] = useState('Wir stellen deinen Artikel ein …')
const [overlayText, setOverlayText] = useState('Wir leiten gleich weiter.')
  const searchParams = useSearchParams(); // <-- HIER
  const [bootLoading, setBootLoading] = useState(true);
  const [kategorie, setKategorie] = useState<'nasslack' | 'pulverlack' | 'arbeitsmittel' | null>(null);
  const [titel, setTitel] = useState('');
  const [farbpaletteWert, setFarbpaletteWert] = useState('');
  const herstellerRef = useRef<HTMLDivElement>(null);
  const [zustand, setZustand] = useState('');
  const [warnungKategorie, setWarnungKategorie] = useState('');
  const [warnungBilder, setWarnungBilder] = useState('');
  const [warnungTitel, setWarnungTitel] = useState('');
  const [warnungPalette, setWarnungPalette] = useState('');
  const [warnungZustand, setWarnungZustand] = useState('');
  const [anwendung, setAnwendung] = useState('');
  const [farbcode, setFarbcode] = useState('');
  const [glanzgradDropdownOffen, setGlanzgradDropdownOffen] = useState(false);
  const glanzgradRef = useRef<HTMLDivElement>(null);
  const [sondereffekte, setSondereffekte] = useState<string[]>([]);
  const [sondereffekteOffen, setSondereffekteOffen] = useState(false);
  const [qualitaet, setQualitaet] = useState('');
  const [qualitaetOffen, setQualitaetOffen] = useState(false);
  const [lieferdatum, setLieferdatum] = useState('');
  const [ladeStatus, setLadeStatus] = useState(false);
  const [bewerbungOptionen, setBewerbungOptionen] = useState<string[]>([]);
const promoPackages = [
  {
    id: 'homepage',
    title: 'Anzeige auf Startseite hervorheben',
    subtitle: 'Startseiten-Hervorhebung',
    priceCents: 6999,
    score: 30,
    icon: <Star size={18} className={styles.iconStar} aria-hidden />,
  },
  {
    id: 'search_boost',
    title: 'Anzeige in Suche priorisieren',
    subtitle: 'Ranking-Boost in der Suche',
    priceCents: 4999,
    score: 15,
    icon: <Search size={18} className={styles.iconSearch} aria-hidden />,
  },
  {
    id: 'premium',
    title: 'Premium-Anzeige aktivieren',
    subtitle: 'Premium-Badge & Listing',
    priceCents: 3499,
    score: 12,
    icon: <Crown size={18} className={styles.iconCrown} aria-hidden />,
  },
] as const;

const formatEUR = (cents: number) =>
  (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
const selectedPromoScore = promoPackages
  .filter((p) => bewerbungOptionen.includes(p.id))
  .reduce((sum, p) => sum + p.score, 0);

const selectedTotalCents = promoPackages
  .filter((p) => bewerbungOptionen.includes(p.id))
  .reduce((sum, p) => sum + p.priceCents, 0);


  const [vorschauAktiv, setVorschauAktiv] = useState(false);
  const [zertifizierungen, setZertifizierungen] = useState<string[]>([]);
  const [menge, setMenge] = useState<number>(0);
 const [versandKosten, setVersandKosten] = useState<string>(''); 
const [lieferWerktage, setLieferWerktage] = useState<string>(''); 
  // Verkaufspreis in Euro
const [preis, setPreis] = useState<string>(''); 
const [warnungPreis, setWarnungPreis] = useState('');
const [warnungWerktage, setWarnungWerktage] = useState('');
const [warnungVersand, setWarnungVersand] = useState('');
// Auf-Lager-Option für Menge
const [aufLager, setAufLager] = useState<boolean>(false);
// Für Arbeitsmittel-Mengen in Stück
const [mengeArbeitsmittel, setMengeArbeitsmittel] = useState<number>(0);

// Warnung für Menge
const [warnungMenge, setWarnungMenge] = useState<string>('');
const [mengeStueck, setMengeStueck] = useState<number>(1);
const [groesse, setGroesse] = useState<string>('');
const [warnungMengeStueck, setWarnungMengeStueck] = useState<string>('');
const [warnungGroesse, setWarnungGroesse] = useState<string>('');
const [stueckProEinheit, setStueckProEinheit] = useState<string>('');
const [warnungStueckProEinheit, setWarnungStueckProEinheit] = useState<string>('');
const [agbAccepted, setAgbAccepted] = useState(false)
const [agbError, setAgbError] = useState(false)
const agbRef = useRef<HTMLDivElement>(null)
const [connect, setConnect] = useState<ConnectStatus | null>(null);
const [connectLoaded, setConnectLoaded] = useState(false);

const berechneFortschritt = () => {
  let total = 0, filled = 0;

  if (kategorie === 'arbeitsmittel') {
    // Arbeitsmittel-Pflichtfelder
    // 1. Kategorie
    total++;
    if (kategorie) filled++;

    // 2. Bilder
    total++;
    if (bilder.length > 0) filled++;

    // 3. Menge (Stück)
    total++;
    if (aufLager || menge > 0) filled++;

    // 4. Titel
    total++;
    if (titel.trim() !== '') filled++;

 // 5. Stück pro Verkaufseinheit
total++;
if (parseInt(stueckProEinheit) > 0) filled++;


    // 6. Größe
    total++;
    if (groesse.trim() !== '') filled++;

    // 7. Beschreibung
    total++;
    if (beschreibung.trim() !== '') filled++;

    // 8. Werktage bis Lieferung
    // 8. Werktage bis Lieferung
total++;
if (parseInt(lieferWerktage) >= 1) filled++;

// 9. Preis
total++;
if (parseFloat(preis) > 0) filled++;

// 10. Versandkosten
total++;
if (parseFloat(versandKosten) >= 0) filled++;

// 11. AGB akzeptiert
  total++;
  if (agbAccepted) filled++;

  } else {
    // Lack-Pflichtfelder
    // 1. Kategorie
    total++;
    if (kategorie) filled++;

    // 2. Bilder
    total++;
    if (bilder.length > 0) filled++;

    // 3. Menge (kg)
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

   // 11. Werktage bis Lieferung
total++;
if (parseInt(lieferWerktage) >= 1) filled++;

// 12. Preis
total++;
if (parseFloat(preis) > 0) filled++;

// 13. Versandkosten
total++;
if (parseFloat(versandKosten) >= 0) filled++;


    // Pulverlack-spezifisch: Aufladung
    if (kategorie === 'pulverlack') {
      total++;
      if (aufladung.length > 0) filled++;
    }
  }
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
  setWarnungPreis('');
  setWarnungWerktage('');
  setWarnungVersand('');
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
  setPreis('');
  setLieferWerktage('1');
  setVersandKosten('');

  setMenge(1);
  setAufLager(false);
  setWarnungMenge('');

  // ─── Warnungen leeren ───
  setWarnungPreis('');
  setWarnungWerktage('');
  setWarnungVersand('');

  // ─── Optional: „Auf Lager“-Status zurücksetzen ───
  setAufLager(false);

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
const fetchConnect = useCallback(async () => {
  try {
    const r = await fetch('/api/connect/status', { cache: 'no-store', credentials: 'include' });
    const j: ConnectStatus = await r.json().catch(() => ({ ready: false }));
    setConnect(r.ok ? j : { ready: false });
  } catch {
    setConnect({ ready: false, reason: 'Dein Anbieter-Status konnte nicht geprüft werden.' });
  } finally {
    setConnectLoaded(true);
  }
}, []);

useEffect(() => {
  fetchConnect();
}, [fetchConnect]);

useEffect(() => {
  const onFocus = () => {
    fetchConnect();
  };
  window.addEventListener('focus', onFocus);
  window.addEventListener('pageshow', onFocus);
  return () => {
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pageshow', onFocus);
  };
}, [fetchConnect]);

const goToStripeOnboarding = useCallback(async () => {
  try {
    const r = await fetch('/api/connect/account-link', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        return_to: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.url) {
      const msg = j?.reason || j?.error || 'Onboarding-Link konnte nicht erstellt werden.';
      const extra = [j?.code, j?.mode].filter(Boolean).join(' · ');
      throw new Error(extra ? `${msg} (${extra})` : msg);
    }
    window.location.assign(j.url as string);
  } catch (e: any) {
    alert(e?.message || 'Onboarding-Link konnte nicht erstellt werden.');
  }
}, []);


  useEffect(() => {
  const vorausgewaehlt = searchParams.get('kategorie');
  if (vorausgewaehlt === 'nasslack' || vorausgewaehlt === 'pulverlack' || vorausgewaehlt === 'arbeitsmittel') {
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
  useEffect(() => {
    const vorausgewaehlt = searchParams.get('kategorie');
    if (
      vorausgewaehlt === 'nasslack' ||
      vorausgewaehlt === 'pulverlack' ||
      vorausgewaehlt === 'arbeitsmittel'
    ) {
      setKategorie(vorausgewaehlt);
    }
  }, [searchParams]);

  // ⬇️ NEU: kleines Boot-Loading mit Skeleton
  useEffect(() => {
    const t = setTimeout(() => setBootLoading(false), 400);
    return () => clearTimeout(t);
  }, []);


  const [herstellerDropdownOffen, setHerstellerDropdownOffen] = useState(false);
    const herstellerListePulver = [
    'IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm', 'Akzo Nobel',
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
  const val = e.target.value;
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
  let willNavigate = false
setOverlayTitle('Wir stellen deinen Artikel ein …')
setOverlayText('Wir leiten gleich weiter.')
  

let fehler = false;

// Pflichtfelder prüfen
if (!kategorie) {
  setWarnungKategorie('Bitte wähle eine Kategorie aus.');
  fehler = true;
} else {
  setWarnungKategorie('');
}

if (!agbAccepted) {
  setAgbError(true);
  agbRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  fehler = true;   // ⬅️ wichtig!
} else {
  setAgbError(false);
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
  setWarnungTitel('');
}

// Nur für Lack-Kategorien prüfen
if (kategorie === 'pulverlack' || kategorie === 'nasslack') {
  if (!farbpaletteWert) {
    setWarnungPalette('Bitte wähle eine Farbpalette aus.');
    fehler = true;
  } else {
    setWarnungPalette('');
  }

  if (!oberflaeche) {
    fehler = true;
  }

  if (!anwendung) {
    fehler = true;
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
    }
  }
}

    if (kategorie === 'pulverlack') {
    if (aufladung.length === 0) {
      setWarnungAufladung('Bitte wähle mindestens eine Option bei der Aufladung.');
      fehler = true;
    } else {
      setWarnungAufladung('');
    }}


if (kategorie === 'arbeitsmittel') {
  // Menge prüfen (nur wenn nicht "Auf Lager")
  if (!aufLager && menge < 1) {
    setWarnungMenge('Bitte gib mindestens 1 Stück an.');
    fehler = true;
  } else {
    setWarnungMenge('');
  }

 // Stück pro Einheit prüfen
if (parseInt(stueckProEinheit) < 1 || isNaN(parseInt(stueckProEinheit))) {
  setWarnungStueckProEinheit('Bitte gib mindestens 1 Stück pro Einheit an.');
  fehler = true;
} else {
  setWarnungStueckProEinheit('');
}


  // Größe prüfen
if (!groesse.trim()) {
  setWarnungGroesse('Bitte gib eine Größe an.');
  fehler = true;
} else if (groesse.length > 15) {
  setWarnungGroesse('Größe darf maximal 15 Zeichen haben.');
  fehler = true;
} else {
  setWarnungGroesse('');
}

}



    if (!beschreibung.trim()) {
      setWarnungBeschreibung('Bitte gib eine Beschreibung ein.');
      fehler = true;
    } else {
      setWarnungBeschreibung('');
    }
    if (parseFloat(preis) <= 0 || isNaN(parseFloat(preis))) {
  setWarnungPreis('Bitte gib einen gültigen Preis ein.');
  fehler = true;
} else {
  setWarnungPreis('');
}

if (versandKosten === '' || parseFloat(versandKosten) < 0) {
  setWarnungVersand('Bitte gib gültige Versandkosten ein.');
  fehler = true;
} else {
  setWarnungVersand('');
}

if (!lieferWerktage.trim() || isNaN(parseInt(lieferWerktage)) || parseInt(lieferWerktage) < 1) {
  setWarnungWerktage('Bitte mach eine gültige Angabe.');
  fehler = true;
} else {
  setWarnungWerktage('');
}


  // ─── Menge / „Auf Lager” prüfen ───
if (!aufLager) {
  // begrenzte Menge → muss ≥ 1 sein
  if (menge < 1) {
    setWarnungMenge('Bitte gib eine Stückzahl ≥ 1 ein.');
    fehler = true;
  } else {
    setWarnungMenge('');
  }
} else {
  // Auf Lager → immer gültig
  setWarnungMenge('');
}


if (fehler) {
  return;
}

// ===== Stripe Connect-Status prüfen =====
try {
  const stRes = await fetch('/api/connect/status', {
    cache: 'no-store',
    credentials: 'include',
  });
  const st: ConnectStatus = await stRes.json().catch(() => ({ ready: false }));

  if (!stRes.ok) {
    alert('Dein Anbieter-Status konnte nicht geprüft werden. Bitte versuche es erneut.');
    return;
  }

  if (!st.ready) {
    await goToStripeOnboarding();
    return;
  }
} catch {
  alert('Dein Anbieter-Status konnte nicht geprüft werden.');
  return;
}

// ab hier darfst du erst wirklich senden
setLadeStatus(true);

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
    if (aufLager) {
  formData.append('mengeStatus', 'auf Lager');
} else {
  formData.append('menge', menge.toString());
}   

  if (kategorie === 'pulverlack') {
    formData.append('aufladung', aufladung.join(', '));
  }
 if (kategorie === 'arbeitsmittel') {
  if (aufLager) {
    formData.append('mengeStatus', 'Auf Lager');
  } else {
    formData.append('mengeStueck', menge.toString());
  }
  
  formData.append('stueckProEinheit', stueckProEinheit.toString());
  formData.append('groesse', groesse);
}


  bilder.forEach((file) => formData.append('bilder', file));
  dateien.forEach((file) => formData.append('dateien', file));
  formData.append('preis', (parseFloat(preis) || 0).toString());
  formData.append('versandKosten', (parseFloat(versandKosten) || 0).toString());
  formData.append('lieferWerktage', (parseInt(lieferWerktage) || 0).toString());


try {
  const res = await fetch('/api/verkaufen', {
    method: 'POST',
    body: formData,
  });

  if (res.ok) {
    // ✅ Resets beibehalten (wie bei dir)
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
    setPreis('');
    setLieferWerktage('');
    setVersandKosten('');
    setWarnungPreis('');
    setWarnungWerktage('');
    setWarnungVersand('');
    setMengeStueck(0);
    setGroesse('');
    setWarnungMengeStueck('');
    setWarnungGroesse('');
    setStueckProEinheit('');
    setWarnungStueckProEinheit('');

    // ✅ Overlay-Text (identisch)
    setOverlayTitle('Artikel gespeichert');
    setOverlayText('Wir leiten gleich weiter.');

    // ✅ Overlay bleibt bis zur Navigation sichtbar
    willNavigate = true;

    // ✅ 1 Frame warten, damit Overlay sicher sichtbar wird
    await nextFrame();

    // ✅ Weiterleitung
    router.replace('/konto/verkaufen?artikel_published=1');
    return;
  } else {
    alert('Fehler beim Hochladen');
  }
} catch (error) {
  console.error(error);
  alert('Serverfehler');
} finally {
  if (!willNavigate) setLadeStatus(false);
}
};
const toggleBewerbung = (option: string) => {
  setBewerbungOptionen(prev =>
    prev.includes(option)
      ? prev.filter(o => o !== option)
      : [...prev, option]
  )
}
 if (bootLoading) {
    return (
      <>
        <Navbar />
        <TopLoader />
        <div className={styles.container}>
          <FormSkeleton />
        </div>
      </>
    );
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
    💡 Ab sofort ist das Einstellen von Artikeln <strong>kostenlos</strong>!
    <a href="/agb" className={styles.infoLink}>Mehr erfahren</a>
  </motion.div>

  {/* Hinweis Onboarding – stabil sichtbar, wenn nicht ready */}
  {connectLoaded && connect?.ready === false && (
    <div className={styles.connectNotice} role="status" aria-live="polite">
      <p>
        Um Auszahlungen empfangen zu können, musst du ein Auszahlungsprofil bei Stripe anlegen.
      </p>

      {connect?.reason && (
        <p style={{ margin: 0, fontWeight: 500 }}>{connect.reason}</p>
      )}

      <div className={styles.connectActions}>
        <button
          type="button"
          className={styles.connectBtn}
          onClick={goToStripeOnboarding}
        >
          Jetzt bei Stripe verifizieren
        </button>
      </div>
    </div>
  )}
     
        <h1 className={styles.heading}>Artikel verkaufen </h1>
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
            <h2 className={styles.centeredHeading}>Ich verkaufe</h2>
            <div className={`${styles.iconRow} ${!kategorie && warnung.includes('Kategorie') ? styles.kategorieFehler : ''}`}>
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
                  <div
                  className={`${styles.iconBox} ${kategorie === 'arbeitsmittel' ? styles.activeIcon : ''}`}
                  onClick={() => {
                    resetFieldsExceptCategory();
                    setKategorie('arbeitsmittel');
                  }}
                >
                  <FaTools size={32} />
                  <span>Arbeitsmittel</span>
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
    required
  />
  <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
</label>

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
<fieldset className={styles.mengeSection}>
  <legend className={styles.mengeLegend}>
    Menge (kg): <span style={{ color: 'red' }}>*</span>
  </legend>

  {/* Radio-Buttons nebeneinander */}
  <div className={styles.mengeRadioGroup}>
     <label className={styles.mengeOption}>
      <input
        type="radio"
        name="mengeOption"
        checked={aufLager}
        onChange={() => setAufLager(true)}
      />
      Auf Lager
    </label>
    <label className={styles.mengeOption}>
      <input
        type="radio"
        name="mengeOption"
        checked={!aufLager}
        onChange={() => setAufLager(false)}
      />
      Begrenzte Menge
    </label>
   
  </div>

  {!aufLager && (
    <label className={styles.mengeNumberLabel}>
      <span>Menge (kg):</span>
      <input
        type="number"
        step="0.1"
        min="0.1"
        max="99999.9"
        className={styles.mengeNumberInput}
        value={menge === 0 ? '' : menge}
        onChange={handleMengeChange}
        placeholder="z. B. 5.5"
      />
    </label>
  )}
  {warnungMenge && <p className={styles.mengeWarning}>{warnungMenge}</p>}
</fieldset>



<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.0rem' }}>
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
          'Polyurethan',
          'Polyester für Feuerverzinkung',
          'Epoxy-Polyester',
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
        required
      />
      <span>Geöffnet & Einwandfrei</span>
    </label>
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
        required
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
        required
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
        required
      />
      <span>Grobstruktur</span>
    </label>
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
        required
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
        required
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
        required
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
        required
      />
      <span>Industrie</span>
    </label>
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
<fieldset className={styles.radioGroup}>
  <legend className={styles.radioLegend}>
    Aufladung: <span style={{ color: 'red' }}>*</span>
  </legend>

  {/* Natives Pflichtfeld nur aktivieren wenn nichts ausgewählt */}
  {aufladung.length === 0 && (
    <input
      type="checkbox"
      required
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
          setAufladung((prev) =>
            checked ? [...prev, 'Corona'] : prev.filter((v) => v !== 'Corona')
          );
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
          setAufladung((prev) =>
            checked ? [...prev, 'Tribo'] : prev.filter((v) => v !== 'Tribo')
          );
        }}
      />
      <span>Tribo</span>
    </label>
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
{kategorie === 'arbeitsmittel' && (
  <>
    {/* Titel */}
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
    required
  />
  <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
</label>
    

    {/* Stückzahl */}
    { kategorie === 'arbeitsmittel' && (
  <fieldset className={styles.mengeSection}>
    <legend className={styles.mengeLegend}>
      Menge (Stück): <span style={{ color: 'red' }}>*</span>
    </legend>

    {/* Radio-Buttons nebeneinander */}
<div className={styles.mengeRadioGroup}>
  <label className={styles.mengeOption}>
    <input
      type="radio"
      name="mengeOptionArbeitsmittel"
      checked={aufLager}
      onChange={() => setAufLager(true)}
    />
    Auf Lager
  </label>
  <label className={styles.mengeOption}>
    <input
      type="radio"
      name="mengeOptionArbeitsmittel"
      checked={!aufLager}
      onChange={() => setAufLager(false)}
    />
    Begrenzte Menge
  </label>
</div>

{/* Eingabe nur wenn "Begrenzte Menge" */}
{!aufLager && (
  <label className={styles.mengeNumberLabel}>
    <span>Menge (Stück):</span>
    <input
      type="number"
      step={1}           // ❗ nur ganze Zahlen
      min={1}
      max={999999}
      className={styles.mengeNumberInput}
      value={menge === 0 ? '' : menge}
      onChange={(e) => {
        const value = e.target.value;
        // Nur ganze Zahlen erlauben
        if (value === '' || (/^\d+$/.test(value) && Number(value) <= 999999)) {
          setMenge(Number(value));
        }
      }}
      placeholder="z. B. 10"
    />
  </label>
)}

{warnungMenge && <p className={styles.mengeWarning}>{warnungMenge}</p>}
</fieldset>
)}


    {/* Stück pro Verkaufseinheit */}
      <label className={styles.label}>
  <span>
    Stück pro Verkauf: <span style={{ color: 'red' }}>*</span>
  </span>
  <input
    type="number"
    min={1}
    max={9999}
    step={1}
    className={styles.input}
    value={stueckProEinheit}
    onChange={(e) => {
      const value = e.target.value;
      if (value === '' || (Number(value) >= 1 && Number(value) <= 999)) {
        setStueckProEinheit(value);
      }
    }}
  />
</label>

      {warnungStueckProEinheit && <p className={styles.validierungsfehler}>{warnungStueckProEinheit}</p>}

    {/* Größe */}
<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Größe: <span style={{ color: 'red' }}>*</span>
  </span>
  <input
    type="text"
    className={styles.input}
    maxLength={15} // Eingabe auf 50 Zeichen begrenzen
    value={groesse}
    onChange={e => {
      const val = e.target.value.replace(/^\s+/, ''); // entfernt führende Leerzeichen
      setGroesse(val);
    }}
    placeholder="z. B. XS, S, M, L, XL oder L×B×H in cm"
    required
  />
</label>
{warnungGroesse && <p className={styles.validierungsfehler}>{warnungGroesse}</p>}


    {/* Beschreibung */}
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
    {warnungBeschreibung && <p className={styles.validierungsfehler}>{warnungBeschreibung}</p>}
  </>
)}
    </motion.div>    
  </AnimatePresence>
)} 

<fieldset className={styles.radioGroup}>
  {/* Werktage bis Lieferung */}
{/* Preis */}
<label className={styles.inputLabel}>
  Preis (€ / {kategorie === 'arbeitsmittel' ? 'Verkaufseinheit' : 'kg'})
  <input
    type="number"
    min={0}
    step={0.01}
    max={999}
    className={styles.dateInput}
    value={preis}
    onChange={(e) => {
      const value = e.target.value;
      if (value === '' || Number(value) <= 999) {
        setPreis(value);
      }
    }}
  />
</label>
{warnungPreis && <p className={styles.warnung}>{warnungPreis}</p>}


{/* Versandkosten */}
<label className={styles.inputLabel}>
  Versandkosten (€)
  <input
    type="number"
    min={0}
    step={0.01}
    max={999}
    className={styles.dateInput}
    value={versandKosten}
    onChange={(e) => {
      const value = e.target.value;
      if (value === '' || Number(value) <= 999) {
        setVersandKosten(value);
      }
    }}
  />
</label>
{warnungVersand && <p className={styles.warnung}>{warnungVersand}</p>}

{/* Werktage bis Lieferung */}
<label className={styles.inputLabel}>
  Werktage bis Lieferung
  <input
    type="number"
    min={1}
    step={1}
    max={999}
    className={styles.dateInput}
    value={lieferWerktage}
    onChange={(e) => {
      const value = e.target.value;
      if (value === '' || Number(value) <= 999) {
        setLieferWerktage(value);
      }
    }}
  />
</label>
{warnungWerktage && <p className={styles.warnung}>{warnungWerktage}</p>}


</fieldset>

{/* Bewerbung – identisch wie im Grundgerüst */}
<div
  className={styles.bewerbungPanel}
  role="region"
  aria-label="Bewerbung deiner Anzeige"
>
  <div className={styles.bewerbungHeader}>
    <span className={styles.bewerbungIcon} aria-hidden></span>
    <p className={styles.bewerbungText}>
      Erhöhe deine Sichtbarkeit und erreiche mehr passende Käufer!
    </p>
  </div>

  <div className={styles.bewerbungGruppe}>
    {promoPackages.map((p) => (
      <label key={p.id} className={styles.bewerbungOption}>
        <input
          type="checkbox"
          onChange={() => toggleBewerbung(p.id)}
          checked={bewerbungOptionen.includes(p.id)}
        />
        {p.icon}
        <span
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
          }}
        >
          <span>
            {p.title} — {formatEUR(p.priceCents)}
          </span>
          <small style={{ color: '#64748b' }}>{p.subtitle}</small>
        </span>
      </label>
    ))}

    <p className={styles.steuerHinweis}>
      Steuern werden im Checkout berechnet.
    </p>
  </div>

  <div className={styles.promoHinweis} role="note" aria-live="polite">
    <div className={styles.promoHinweisRow}>
      <span className={styles.promoScore}>
        Deine Auswahl: +{selectedPromoScore} Promo-Punkte
      </span>
      <span className={styles.promoSumme}>
        Gesamt: {formatEUR(selectedTotalCents)}
      </span>
    </div>
    <small>
      Pakete addieren sich. Die Sortierung der Anzeigen erfolgt nach dem
      Promo-Score. Eine Startseiten-Platzierung ist{' '}
      <em>nicht garantiert</em> – wenn andere zeitgleich einen höheren
      Gesamtwert haben, erscheinen deren Anzeigen zuerst.
    </small>
  </div>
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
        setAgbAccepted(e.target.checked)
        setAgbError(false)
      }}
    />
    <span>
      Ich akzeptiere die{' '}
      <a href="/agb" className={styles.nutzungsbedingungenLink}>
        Allgemeinen Geschäftsbedingungen</a>{' '}zur Gänze. Informationen zur Verarbeitung deiner Daten findest du in unserer{' '}
      <a href="/datenschutz" className={styles.agbLink}>
        Datenschutzerklärung
      </a>.
    </span>
  </motion.label>
</div>
 <button
  type="button"
  className={styles.vorschauToggle}
  onClick={() => setVorschauAktiv(!vorschauAktiv)}
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

      {/* Lack-Vorschau */}
      {(kategorie === 'nasslack' || kategorie === 'pulverlack') && (
        <>
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
          {kategorie === 'pulverlack' && (
            <p><strong>Aufladung:</strong> {aufladung.join(', ') || '–'}</p>
          )}
        </>
      )}

      {/* Arbeitsmittel-Vorschau */}
      {kategorie === 'arbeitsmittel' && (
        <>
          <p><strong>Menge (Stück):</strong> {aufLager ? 'Auf Lager' : (menge || '–')}</p>
          <p><strong>Stück pro Verkaufseinheit:</strong> {stueckProEinheit || '–'}</p>
          <p><strong>Größe:</strong> {groesse || '–'}</p>
        </>
      )}

      {/* Felder für beide Kategorien */}
      <p><strong>Werktage bis Lieferung:</strong> {lieferWerktage || '–'} Werktag{parseInt(lieferWerktage) > 1 ? 'e' : ''}</p>
      <p><strong>Preis:</strong> {preis ? `${parseFloat(preis).toFixed(2)} € / ${kategorie === 'arbeitsmittel' ? 'Verkaufseinheit' : 'kg'}` : '–'}</p>
      <p><strong>Versandkosten:</strong> {versandKosten ? `${parseFloat(versandKosten).toFixed(2)} €` : '–'}</p>
      <p><strong>Bewerbung:</strong> {bewerbungOptionen.join(', ') || 'Keine ausgewählt'}</p>
      <p><strong>Bilder:</strong> {bilder.length} Bild(er) ausgewählt</p>
      <p><strong>Dateien:</strong> {dateien.length} Datei(en) ausgewählt</p>
      <p><strong>AGB:</strong> {agbAccepted ? '✓ akzeptiert' : '✗ nicht akzeptiert'}</p>
    </motion.div>
  )}
</AnimatePresence>

 <button type="submit" className={styles.submitBtn} disabled={ladeStatus}>
  {ladeStatus ? 'Bitte warten…' : 'Artikel kostenlos einstellen'}
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
      <AnimatePresence>
  {ladeStatus && (
    <motion.div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.modalCard}
        initial={{ y: 10, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 10, scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Loader2 className={styles.modalIcon} />
        <h3 className={styles.modalTitle}>{overlayTitle}</h3>
        <p className={styles.modalText}>{overlayText}</p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

    </>
  );
}
export default ArtikelEinstellen;
