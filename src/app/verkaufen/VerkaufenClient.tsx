'use client'; 

import type React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './verkaufsseite.module.css';
import { FaSprayCan, FaCloud, FaTools } from 'react-icons/fa';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Dropzone from './Dropzone';
import DateiVorschau from './DateiVorschau';
import { Star, Search, Crown, Loader2 } from 'lucide-react';
import { supabaseBrowser } from "@/lib/supabase-browser";

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
// Fiktive Promo-Pakete (nur Frontend – 1:1 wie Grundgerüst)
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
] as const

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

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
type Staffelzeile = {
  minMenge: string;   // "ab"
  maxMenge: string;   // "bis" (optional)
  preis: string;      // Preis pro kg / Stück
  versand: string;    // Versandkosten für diese Staffel
};
const MAX_STAFFELN = 3;

const STAFFEL_HARD_MAX = 99999;     // Ab/Bis max 99 999
const MONEY_HARD_MAX   = 99999.99;  // Preis/Versand max 99 999.99

type ConnectStatus = { ready: boolean; reason?: string | null; mode?: 'test' | 'live' };

function ArtikelEinstellen() {
  const router = useRouter()
const [overlayTitle, setOverlayTitle] = useState('Wir stellen deinen Artikel ein …')
const [overlayText, setOverlayText] = useState('Wir leiten gleich weiter.')
  const searchParams = useSearchParams(); // <-- HIER
  const [kategorie, setKategorie] = useState<'nasslack' | 'pulverlack' | 'arbeitsmittel' | null>(null);
  const [titel, setTitel] = useState('');
  const [farbpaletteWert, setFarbpaletteWert] = useState('');
  const herstellerRef = useRef<HTMLDivElement>(null);
  const [zustand, setZustand] = useState('');
  const [warnungKategorie, setWarnungKategorie] = useState('');
  const [warnungBilder, setWarnungBilder] = useState('');
  const [warnungTitel, setWarnungTitel] = useState('');
  const [warnungPalette, setWarnungPalette] = useState('');
  const [warnungGlanzgrad, setWarnungGlanzgrad] = useState(''); // ⬅️ NEU
  const [warnungZustand, setWarnungZustand] = useState('');
  const [warnungAnwendung, setWarnungAnwendung] = useState('');
  const [warnungOberflaeche, setWarnungOberflaeche] = useState('');
  const [anwendung, setAnwendung] = useState('');
  const [farbcode, setFarbcode] = useState('');
    const [herstellerDropdownOffen, setHerstellerDropdownOffen] = useState(false);
  const [verkaufAn, setVerkaufAn] = useState('');
const [warnungVerkaufAn, setWarnungVerkaufAn] = useState('');
const [verkaufsArt, setVerkaufsArt] = useState<
  '' | 'gesamt' | 'pro_kg' | 'pro_stueck'
>('');

const [warnungVerkaufsArt, setWarnungVerkaufsArt] = useState('');


const [staffeln, setStaffeln] = useState<Staffelzeile[]>([
  { minMenge: '1', maxMenge: '', preis: '', versand: '' },
]);

  const [glanzgradDropdownOffen, setGlanzgradDropdownOffen] = useState(false);
  const glanzgradRef = useRef<HTMLDivElement>(null);
  const [sondereffekte, setSondereffekte] = useState<string[]>([]);
  const [sondereffekteOffen, setSondereffekteOffen] = useState(false);
  const [effekt, setEffekt] = useState<string[]>([]);
  const [qualitaet, setQualitaet] = useState('');
  const [qualitaetOffen, setQualitaetOffen] = useState(false);
  const [lieferdatum, setLieferdatum] = useState('');
  const [ladeStatus, setLadeStatus] = useState(false);
  const [bewerbungOptionen, setBewerbungOptionen] = useState<string[]>([]);


const formatEUR = (cents: number) =>
  (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
const toggleBewerbung = (option: string) => {
  setBewerbungOptionen(prev =>
    prev.includes(option)
      ? prev.filter(o => o !== option)
      : [...prev, option]
  )
}

// ⬇️ NEU: Promo-Score + Gesamtpreis wie im Grundgerüst
const selectedPromoScore = useMemo(() => {
  return promoPackages
    .filter((p) => bewerbungOptionen.includes(p.id))
    .reduce((sum, p) => sum + p.score, 0)
}, [bewerbungOptionen])

const selectedTotalCents = useMemo(() => {
  return promoPackages
    .filter((p) => bewerbungOptionen.includes(p.id))
    .reduce((sum, p) => sum + p.priceCents, 0)
}, [bewerbungOptionen])

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
const [warnungStaffeln, setWarnungStaffeln] = useState('');

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
const [warnungHersteller, setWarnungHersteller] = useState('');


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
    if (aufLager || mengeStueck >= 1) filled++;

    // 4. Titel
    total++;
    if (titel.trim() !== '') filled++;


 // 5. Stück pro Verkaufseinheit
total++;
if (parseInt(stueckProEinheit) > 0) filled++;
// Hersteller (Pflicht)
total++;
if (hersteller.trim() !== '') filled++;


    // 6. Größe
    total++;
    if (groesse.trim() !== '') filled++;

    // 7. Beschreibung
    total++;
    if (beschreibung.trim() !== '') filled++;

    // 8. Werktage bis Lieferung
// Werktage bleiben Pflicht
total++;
if (parseInt(lieferWerktage) >= 1) filled++;

// Verkaufsart + Preislogik abhängig von Verkaufsart
total++;
if (verkaufsArt) filled++;

if (verkaufsArt === 'gesamt') {
  total++; // Preis
  if (parseFloat(preis) > 0) filled++;

  total++; // Versand
  if (versandKosten !== '' && parseFloat(versandKosten) >= 0) filled++;
} else if (verkaufsArt === 'pro_stueck') {
  total++; // Staffeln
  if (staffelnSindGueltig(staffeln)) filled++;

}

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
if (aufLager || menge >= 1) filled++;

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
// Werktage bleiben Pflicht
total++;
if (parseInt(lieferWerktage) >= 1) filled++;

// Verkaufsart + Preislogik abhängig von Verkaufsart
total++;
if (verkaufsArt) filled++;

if (verkaufsArt === 'gesamt') {
  total++; // Preis
  if (parseFloat(preis) > 0) filled++;

  total++; // Versand
  if (versandKosten !== '' && parseFloat(versandKosten) >= 0) filled++;
} else if (verkaufsArt === 'pro_kg') {
  total++; // Staffeln
  if (staffelnSindGueltig(staffeln)) filled++;

}



    // Pulverlack-spezifisch: Aufladung
    if (kategorie === 'pulverlack') {
      total++;
      if (aufladung.length > 0) filled++;
    }
  }
   total++;
  if (agbAccepted) filled++;
  total++;
  if (verkaufAn) filled++;


  return Math.round((filled / total) * 100);
};



const formularZuruecksetzen = () => {
  setKategorie(null);
  setTitel('');
  setFarbton('');
  setGlanzgrad('');
  setFarbcode('');
  setHersteller('');
  setHerstellerAndere('');
  setBeschreibung('');
  setMenge(0);
  setMengeStueck(0);
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
  setWarnungGlanzgrad(''); // ⬅️ NEU
  setWarnungZustand('');
  setWarnungOberflaeche('');
  setWarnungAnwendung('');
  setWarnungBeschreibung('');
  setWarnungPreis('');
  setWarnungWerktage('');
  setWarnungVersand('');
  setVerkaufAn('');
  setWarnungHersteller('');
  setWarnungVerkaufAn('');
    setVerkaufsArt('');
  setWarnungVerkaufsArt('');
  setStaffeln([{ minMenge: '1', maxMenge: '', preis: '', versand: '' }]);

  setWarnungStaffeln('');

  };

  const [aufladung, setAufladung] = useState<string[]>([]);
  const [oberflaeche, setOberflaeche] = useState('');

const [warnungAufladung, setWarnungAufladung] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
const [warnungBeschreibung, setWarnungBeschreibung] = useState('');
const resetFieldsExceptCategory = () => {
  setTitel('');
  setHersteller('');
  setHerstellerAndere('');
  setWarnungHersteller('');

  // ✅ Menge nur einmal setzen
  setMenge(0);
  setMengeStueck(0);
  setAufLager(false);
  setWarnungMenge('');

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
  setLieferWerktage('');
  setVersandKosten('');

  // ✅ Warnungen leeren
  setWarnungPreis('');
  setWarnungWerktage('');
  setWarnungVersand('');
};

 
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
  if (aufLager && verkaufsArt === "gesamt") {
    setVerkaufsArt("");
  }
}, [aufLager, verkaufsArt]);

useEffect(() => {
  if (!(verkaufsArt === "pro_kg" || verkaufsArt === "pro_stueck")) return;

  setStaffeln((prev) => {
    const copy = prev.map((r) => ({ ...r }));
    const limit = getStaffelLimit();
    const isLimited = limit !== null && limit > 0;

    if (isLimited) {
      // max auf limit begrenzen
      for (const r of copy) {
        const max = toInt(r.maxMenge);
        if (max !== null && max > limit) r.maxMenge = String(limit);
      }

      // wenn letzte offen war (von Auf Lager) -> jetzt schließen
      const last = copy[copy.length - 1];
      if (last && last.maxMenge.trim() === "") {
        const min = toInt(last.minMenge) ?? 1;
        last.maxMenge = String(Math.min(limit, min + 1));
      }
    }

    return normalizeFromIndex(copy, 0);
  });
}, [aufLager, menge, mengeStueck, verkaufsArt]);


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
useEffect(() => {
  if (!kategorie) return;

  // Verkaufsart & Staffel-Logik hart zurücksetzen bei Kategorie-Wechsel
  setVerkaufsArt('');
  setWarnungVerkaufsArt('');
  setStaffeln([{ minMenge: '1', maxMenge: '', preis: '', versand: '' }]);
  setWarnungStaffeln('');

  // klassische Preisfelder ebenfalls leeren
  setPreis('');
  setVersandKosten('');

  // optional: Verkauf an auch leeren, wenn du es pro Kategorie neu wählen willst
  // setVerkaufAn('');
  // setWarnungVerkaufAn('');
}, [kategorie]);

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
  const HERSTELLER_ANDERE_VALUE = '__ANDERE__';
  const [herstellerAndere, setHerstellerAndere] = useState('');


const limit = getStaffelLimit();

const lastMaxEmpty =
  staffeln.length > 0 && staffeln[staffeln.length - 1].maxMenge.trim() === '';

const lastMaxNum =
  staffeln.length > 0 && staffeln[staffeln.length - 1].maxMenge.trim() !== ''
    ? parseInt(staffeln[staffeln.length - 1].maxMenge, 10)
    : null;

const reachedLimit =
  limit !== null && limit >= 1 && lastMaxNum !== null && lastMaxNum >= limit;

const staffelAddDisabled =
  lastMaxEmpty || staffeln.length >= MAX_STAFFELN || reachedLimit;


// 2. In deinem JSX-Dropdown wählst du die Liste dynamisch aus:
const aktuelleHerstellerListe =
  kategorie === 'nasslack'
    ? [...herstellerListeNass, 'Andere…']
    : kategorie === 'pulverlack'
    ? [...herstellerListePulver, 'Andere…']
    : [];



const [farbpaletteDropdownOffen, setFarbpaletteDropdownOffen] = useState(false);
const farbpaletteRef = useRef<HTMLDivElement>(null);

useOnClickOutside(herstellerRef, () => setHerstellerDropdownOffen(false));
useOnClickOutside(glanzgradRef, () => setGlanzgradDropdownOffen(false));
useOnClickOutside(farbpaletteRef, () => setFarbpaletteDropdownOffen(false));


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
    const urls = bilder.map(file => URL.createObjectURL(file));
    setBildPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [bilder]);
  

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (submitDisabled) return;
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
   // ✅ NEU: Menge prüfen (nur wenn nicht "Auf Lager")
  if (!aufLager && menge < 1) {
    setWarnungMenge('Bitte gib mindestens 1 kg an.');
    fehler = true;
  } else {
    setWarnungMenge('');
  }
  // Hersteller Pflicht bei Nasslack/Pulverlack
const finalHerstellerLack =
  hersteller === HERSTELLER_ANDERE_VALUE ? herstellerAndere.trim() : hersteller.trim();

if (!finalHerstellerLack) {
  setWarnungHersteller('Bitte wähle einen Hersteller aus.');
  fehler = true;
} else {
  setWarnungHersteller('');
}

  if (!farbpaletteWert) {
    setWarnungPalette('Bitte wähle eine Farbpalette aus.');
    fehler = true;
  } else {
    setWarnungPalette('');
  }
    // ⬇️ NEU: Glanzgrad prüfen
  if (!glanzgrad) {
    setWarnungGlanzgrad('Bitte wähle einen Glanzgrad aus.');
    fehler = true;
  } else {
    setWarnungGlanzgrad('');
  }
if (!oberflaeche) {
    setWarnungOberflaeche('Bitte wähle die Oberfläche aus.');
    fehler = true;
  } else {
    setWarnungOberflaeche('');
  }

  if (!anwendung) {
    setWarnungAnwendung('Bitte wähle die Anwendung aus.');
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
    }
  }
}
if (kategorie === 'arbeitsmittel') {
  // Menge prüfen (nur wenn nicht "Auf Lager")
  if (!aufLager && mengeStueck < 1) {
    setWarnungMenge('Bitte gib mindestens 1 Stück an.');
    fehler = true;
  } else {
    setWarnungMenge('');
  }
if (!hersteller.trim()) {
  setWarnungHersteller('Bitte gib den Hersteller an.');
  fehler = true;
} else {
  setWarnungHersteller('');
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



// Beschreibung bleibt Pflicht
if (!beschreibung.trim()) {
  setWarnungBeschreibung('Bitte gib eine Beschreibung ein.');
  fehler = true;
} else {
  setWarnungBeschreibung('');
}

// Verkaufsart prüfen
if (!verkaufsArt) {
  setWarnungVerkaufsArt('Bitte wähle die Verkaufsart.');
  fehler = true;
} else {
  setWarnungVerkaufsArt('');
}

// Preis / Versand vs. Staffeln prüfen (NUR beim Submit!)
if (verkaufsArt === 'pro_kg' || verkaufsArt === 'pro_stueck') {
  const aktive = staffeln.filter((s) =>
    [s.minMenge, s.maxMenge, s.preis, s.versand].some((x) => (x ?? '').trim() !== '')
  );

  if (aktive.length === 0) {
    setWarnungStaffeln('Bitte gib mindestens eine Staffel an.');
    fehler = true;
  } else {
    const komplett = aktive.every((s) =>
      s.minMenge.trim() !== '' &&
      s.maxMenge.trim() !== '' &&
      s.preis.trim() !== ''
      // Versand darf leer sein (= 0)
    );

    if (!komplett) {
      setWarnungStaffeln(
        'Bitte fülle jede Staffelzeile vollständig aus (Ab, Bis, Preis). Versand kann kostenlos sein.'
      );
      fehler = true;
    } else if (!staffelnSindGueltig(staffeln)) {
      setWarnungStaffeln('Staffel ungültig – bitte prüfe Ab/Bis/Preis/Versand und die Reihenfolge.');
      fehler = true;
    } else {
      setWarnungStaffeln('');
    }
  }

  // bei Staffel: Einzelpreis-Warnungen leeren
  setWarnungPreis('');
  setWarnungVersand('');
}

else if (verkaufsArt === 'gesamt') {
  // klassische Einzelpreis-Variante NUR bei "gesamt"
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

  // bei gesamt: Staffelwarnung leeren
  setWarnungStaffeln('');
}


// Werktage bleiben Pflicht
if (
  !lieferWerktage.trim() ||
  isNaN(parseInt(lieferWerktage)) ||
  parseInt(lieferWerktage) < 1
) {
  setWarnungWerktage('Bitte mach eine gültige Angabe.');
  fehler = true;
} else {
  setWarnungWerktage('');
}




if (!verkaufAn) {
  setWarnungVerkaufAn('Bitte wähle, an wen du verkaufst.');
  fehler = true;
} else {
  setWarnungVerkaufAn('');
}


if (fehler) {
  // 🔽 zum obersten Fehler scrollen
  setTimeout(() => {
    const selector = [
      `.${styles.validierungsfehler}`,
      `.${styles.warnung}`,
      `.${styles.mengeWarning}`,
      `.${styles.radioGroupError}`,
      `.${styles.mengeSectionError}`,
      `.${styles.selectError}`,
      `.${styles.inputError}`,  
    ].join(', ');

    const firstError = document.querySelector(selector);
    if (firstError instanceof HTMLElement) {
      firstError.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, 0);

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
const zustandForSubmit =
  kategorie === "arbeitsmittel" ? "Neu & Ungeöffnet" : zustand;

const formData = new FormData();

// immer
formData.append('kategorie', kategorie!);
formData.append('verkaufAn', verkaufAn);
formData.append('titel', titel);

const finalHersteller =
  hersteller === HERSTELLER_ANDERE_VALUE ? herstellerAndere.trim() : hersteller.trim();
formData.append('hersteller', finalHersteller);

formData.append('beschreibung', beschreibung);
formData.append("zustand", zustandForSubmit);


formData.append('bewerbung', JSON.stringify(bewerbungOptionen));

// menge (einheitlich)
formData.append('mengeStatus', aufLager ? 'auf_lager' : 'begrenzt');

if (!aufLager) {
  if (kategorie === 'arbeitsmittel') {
    formData.append('mengeStueck', String(mengeStueck)); // ✅
  } else {
    formData.append('mengeKg', String(menge)); // ✅ (kg)
  }
}


// kategorie-spezifisch
if (kategorie === 'arbeitsmittel') {
  formData.append('stueckProEinheit', String(stueckProEinheit));
  formData.append('groesse', groesse);
} else {
  formData.append('farbpalette', farbpaletteWert);
  formData.append('glanzgrad', glanzgrad);
  formData.append('zustand', zustand);
  formData.append('anwendung', anwendung);
  formData.append('oberflaeche', oberflaeche);
  formData.append('farbton', farbton);
  formData.append('farbcode', farbcode);
  formData.append('qualitaet', qualitaet);

  formData.append('effekt', JSON.stringify(effekt));
  formData.append('sondereffekte', JSON.stringify(sondereffekte));
  formData.append('zertifizierungen', JSON.stringify(zertifizierungen));

  if (kategorie === 'pulverlack') {
    formData.append('aufladung', JSON.stringify(aufladung));
  }
}

async function uploadPublicFilesBrowser(bucket: string, basePath: string, files: File[]) {
  const supa = supabaseBrowser();
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    // Optional: Limit im Frontend (z.B. 25 MB)
    const MAX = 25 * 1024 * 1024;
    if (f.size > MAX) {
      throw new Error(`Datei zu groß: ${f.name} (max. 25 MB)`);
    }

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${basePath}/${String(i + 1).padStart(2, "0")}-${Date.now()}-${safeName}`;

    const { error } = await supa.storage.from(bucket).upload(path, f, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });

    if (error) throw new Error(error.message);

    const { data } = supa.storage.from(bucket).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}


formData.append('verkaufsArt', verkaufsArt);

if (verkaufsArt === 'pro_kg' || verkaufsArt === 'pro_stueck') {
 const aktiveStaffeln = staffeln
  .filter((s) => [s.minMenge, s.maxMenge, s.preis, s.versand].some(x => (x ?? '').trim() !== ''))
  .map((s) => ({
    ...s,
    versand: (s.versand ?? '').trim() === '' ? '0' : s.versand, // ✅ kostenlos möglich
  }));

formData.append('preisStaffeln', JSON.stringify(aktiveStaffeln));

} else {
  formData.append('preis', (parseFloat(preis) || 0).toString());
  formData.append('versandKosten', (parseFloat(versandKosten) || 0).toString());
}

formData.append('lieferWerktage', (parseInt(lieferWerktage) || 0).toString());

const folder = `uploads/${crypto.randomUUID()}`;

const imageUrls = await uploadPublicFilesBrowser("articles", `${folder}/images`, bilder);
const fileUrls  = await uploadPublicFilesBrowser("articles", `${folder}/files`, dateien);

// Statt Dateien -> URLs schicken:
formData.append("imageUrls", JSON.stringify(imageUrls));
formData.append("fileUrls", JSON.stringify(fileUrls));

try {
  const res = await fetch('/api/verkaufen', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  // ✅ Immer JSON lesen, damit du im Erfolg die articleId bekommst
  const data = await res.json().catch(() => ({} as any));

  // ❌ Fehlerfall: "Fehler beim Hochladen" bleibt drin
  if (!res.ok) {
    const msg = data?.error || 'Fehler beim Hochladen';
    alert(msg);
    return;
  }

  const articleId = data?.id as string | undefined;
  if (!articleId) {
    alert('Artikel gespeichert, aber keine ID vom Server erhalten.');
    return;
  }

  // ✅ Wenn Promo ausgewählt wurde -> NICHT nach /kaufen, sondern Stripe Checkout starten
  if (selectedTotalCents > 0 && bewerbungOptionen.length > 0) {
    setOverlayTitle('Artikel gespeichert');
    setOverlayText('Weiterleitung zur Zahlung …');
    willNavigate = true;

    await nextFrame();

    const r2 = await fetch('/api/shop/checkout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article_id: articleId,
        promo_codes: bewerbungOptionen, // z.B. ["homepage","premium"]
      }),
    });

    const j2 = await r2.json().catch(() => ({} as any));
    if (!r2.ok || !j2?.url) {
      alert(j2?.error || 'Checkout konnte nicht gestartet werden.');
      willNavigate = false;
      setLadeStatus(false);
      return;
    }

    // ✅ Redirect zu Stripe
    window.location.assign(j2.url);
    return;
  }

  // ✅ KEINE Promo -> so wie bisher: Resets + Weiterleitung zu /kaufen
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
  setWarnungHersteller('');
  setWarnungMengeStueck('');
  setWarnungGroesse('');
  setStueckProEinheit('');
  setWarnungStueckProEinheit('');
  setVerkaufAn('');
  setWarnungVerkaufAn('');
  setVerkaufsArt('');
  setWarnungVerkaufsArt('');
  setStaffeln([{ minMenge: '1', maxMenge: '', preis: '', versand: '' }]);
  setWarnungStaffeln('');

  setOverlayTitle('Artikel gespeichert');
  setOverlayText('Wir leiten gleich weiter.');
  willNavigate = true;

  await nextFrame();
  router.replace('/kaufen');
  return;
} catch (error) {
  console.error(error);
  alert('Serverfehler');
} finally {
  if (!willNavigate) setLadeStatus(false);
}

};
const staffelnSindGueltig = (rows: Staffelzeile[]) => {
  const aktive = rows.filter((s) =>
    [s.minMenge, s.maxMenge, s.preis, s.versand].some((x) => (x ?? '').trim() !== '')
  );
  if (aktive.length === 0) return false;

  // 🔥 Begrenzte Menge => letzte Staffel MUSS bis exakt Menge gehen
const limit = getStaffelLimit();


  if (limit !== null) {
    if (!limit || limit < 1) return false;
  }

  for (let i = 0; i < aktive.length; i++) {
    const s = aktive[i];

    const min = toInt(s.minMenge);
    const max = toInt(s.maxMenge);

    const maxAllowed = (limit !== null && limit > 0) ? limit : STAFFEL_HARD_MAX;

if (min !== null && min > maxAllowed) return false;
if (max !== null && max > maxAllowed) return false;


    if (min === null || min < 1) return false;
    if (i === 0 && min !== 1) return false;

   const preisNum = Number((s.preis || '').replace(',', '.'));
if (!s.preis || Number.isNaN(preisNum) || preisNum <= 0) return false;
if (preisNum > MONEY_HARD_MAX) return false;

const versandNum = s.versand === '' ? 0 : Number((s.versand || '').replace(',', '.'));
if (Number.isNaN(versandNum) || versandNum < 0) return false;
if (versandNum > MONEY_HARD_MAX) return false;


    // Bis-Regeln
    if (max === null) {
      // bei begrenzter Menge NIE erlaubt
      if (limit !== null) return false;

      // bei Auf Lager: nur letzte darf offen sein
      if (i !== aktive.length - 1) return false;
    } else {
      if (max <= min) return false; // Bis muss > Ab

      // bei begrenzter Menge darf kein max > limit sein
      if (limit !== null && max > limit) return false;
    }

    // Keine Lücken / Reihenfolge
    if (i > 0) {
      const prevMax = toInt(aktive[i - 1].maxMenge);
      if (prevMax === null) return false; // vorher offen => darf nichts mehr kommen
      if (min !== prevMax + 1) return false;
    }
  }

  // Finale Pflicht: letzte Staffel endet exakt bei limit
  if (limit !== null) {
    const lastMax = toInt(aktive[aktive.length - 1].maxMenge);
    if (lastMax === null) return false;
    if (lastMax !== limit) return false;
  }

  return true;
};

function cleanInt(v: string) {
  return v.replace(/\D/g, '').slice(0, 5); // max 5 Stellen
}

function toInt(v: string) {
  return v === '' ? null : parseInt(v, 10);
}

function getStaffelLimit() {
  if (aufLager) return null;
  if (kategorie === 'arbeitsmittel') return Number(mengeStueck) || 0;
  return Math.floor(Number(menge) || 0);
}

const normalizeFromIndex = (rows: Staffelzeile[], startIndex: number) => {
  // ✅ Staffel 1 muss immer bei 1 beginnen
  if (rows.length > 0) rows[0].minMenge = '1';

  // sorgt ab startIndex für fortlaufende Ab-Werte und gültige Bis-Werte
  for (let i = startIndex; i < rows.length; i++) {
    // Ab für i>0 ist immer prev.max + 1
    if (i > 0) {
      const prevMax = toInt(rows[i - 1].maxMenge);
      if (prevMax === null) {
        rows.splice(i);
        break;
      }
      rows[i].minMenge = String(prevMax + 1);
    }

    const min = toInt(rows[i].minMenge);
    const max = toInt(rows[i].maxMenge);

    // Wenn min fehlt aber max gesetzt wurde -> min = 1 (nur bei erster Zeile sinnvoll)
    if (i === 0 && min === null && max !== null) {
      rows[i].minMenge = '1';
    }

    // ❌ WICHTIG: diesen Block NICHT mehr drin lassen,
    // sonst springt "Bis" beim Tippen.
    /*
    const min2 = toInt(rows[i].minMenge);
    const max2 = toInt(rows[i].maxMenge);
    if (min2 !== null && max2 !== null && max2 <= min2) {
      rows[i].maxMenge = String(min2 + 1);
    }
    */

    // Wenn Bis leer ist -> offen -> danach keine weiteren Reihen
    const maxFinal = toInt(rows[i].maxMenge);
    if (maxFinal === null && i < rows.length - 1) {
      rows.splice(i + 1);
      break;
    }
  }

  return rows;
};
const fixStaffelMaxOnBlur = (index: number) => {
  setStaffeln((prev) => {
    const copy = prev.map((r) => ({ ...r }));
    const row = copy[index];

    const min = toInt(row.minMenge);
    const limit = getStaffelLimit();                 // ✅ direkt am Anfang
    const isLimited = limit !== null && limit > 0;   // ✅ begrenzte Menge aktiv?

    // wenn min fehlt -> abbrechen
    if (min === null) return copy;

    // ✅ FALL 1: Bis ist leer
    if (row.maxMenge.trim() === "") {
      // Auf Lager: leer lassen erlaubt (offen)
      if (!isLimited) {
        setWarnungStaffeln("");
        return normalizeFromIndex(copy, index);
      }

      // Begrenzte Menge: leer NICHT erlaubt -> automatisch setzen
      // Standard: min+1, aber niemals > limit
      const proposed = Math.min(limit!, min + 1);
      row.maxMenge = String(proposed);

      const normalized = normalizeFromIndex(copy, index);

      // Hinweis falls letzte Staffel nicht exakt bis limit geht
      const aktive = normalized.filter((s) =>
        [s.minMenge, s.maxMenge, s.preis, s.versand].some((x) => (x ?? "").trim() !== "")
      );

      if (aktive.length > 0) {
        const lastMax = toInt(aktive[aktive.length - 1].maxMenge);
        if (lastMax !== null && lastMax !== limit) {
          setWarnungStaffeln(`Letzte Staffel muss bei „Begrenzte Menge“ exakt bis ${limit} gehen.`);
        } else {
          setWarnungStaffeln("");
        }
      }

      return normalized;
    }

    // ✅ FALL 2: Bis ist gesetzt -> normal fixen
    let max = toInt(row.maxMenge);

    // Bis muss > Ab
    if (max === null || max <= min) max = min + 1;

    // Limit beachten
    if (isLimited && max > limit!) max = limit!;

    row.maxMenge = String(max);

    const normalized = normalizeFromIndex(copy, index);

    // Hinweis falls letzte Staffel nicht exakt bis limit geht
    if (isLimited) {
      const aktive = normalized.filter((s) =>
        [s.minMenge, s.maxMenge, s.preis, s.versand].some((x) => (x ?? "").trim() !== "")
      );

      if (aktive.length > 0) {
        const lastMax = toInt(aktive[aktive.length - 1].maxMenge);
        if (lastMax !== null && lastMax !== limit) {
          setWarnungStaffeln(`Letzte Staffel muss bei „Begrenzte Menge“ exakt bis ${limit} gehen.`);
        } else {
          setWarnungStaffeln("");
        }
      }
    } else {
      setWarnungStaffeln("");
    }

    return normalized;
  });
};


const updateStaffelRange = (
  index: number,
  field: 'minMenge' | 'maxMenge',
  raw: string
) => {
  const cleaned = cleanInt(raw);

  setStaffeln((prev) => {
    const copy = prev.map((r) => ({ ...r }));

    // minMenge ab Zeile 2 bleibt readOnly
    if (field === 'minMenge' && index > 0) return prev;

    copy[index][field] = cleaned;
    return normalizeFromIndex(copy, index);
  });
};



const addStaffel = () => {
  setStaffeln((prev) => {
    const last = prev[prev.length - 1];
    const lastMax = toInt(last.maxMenge);
    // ✅ HIER NACH "prev.length >= MAX_STAFFELN"
const limit = getStaffelLimit();
if (limit !== null) {
  const last = prev[prev.length - 1];
  const lastMax = toInt(last.maxMenge);

  if (!limit || limit < 1) {
    setWarnungStaffeln('Bitte zuerst eine gültige begrenzte Menge eingeben.');
    return prev;
  }

  if (lastMax !== null && lastMax >= limit) {
    setWarnungStaffeln(`Weitere Staffeln nicht möglich: letzte Staffel endet bereits bei ${limit}.`);
    return prev;
  }
}



    // Ohne "Bis" in der letzten Reihe macht eine neue Staffel keinen Sinn
    if (lastMax === null) {
      setWarnungStaffeln('Bitte zuerst bei der letzten Staffel ein "Bis" angeben – sonst ist sie offen und die letzte.');
      return prev;
    }

    const nextMin = String(lastMax + 1);
    const copy = [...prev, { minMenge: nextMin, maxMenge: '', preis: '', versand: '' }];
    setWarnungStaffeln('');
    return copy;
  });
};

const removeStaffel = (index: number) => {
  setStaffeln((prev) => {
    const copy = prev.filter((_, i) => i !== index);

    // mindestens eine Reihe behalten
    if (copy.length === 0) return [{ minMenge: '', maxMenge: '', preis: '', versand: '' }];

    // nach dem Löschen: alles ab der gelöschten Stelle neu normalisieren
    const start = Math.max(0, index - 1);
    return normalizeFromIndex(copy.map((r) => ({ ...r })), start);
  });
};const cleanMoney = (v: string) => {
  // erlaubt: 0-99999.99 (max 5 Stellen + max 2 Nachkommastellen)
  let raw = (v ?? '').replace(',', '.').trim();

  if (raw === '') return '';

  // nur Ziffern + max 1 Punkt
  raw = raw.replace(/[^0-9.]/g, '');
  const firstDot = raw.indexOf('.');
  if (firstDot !== -1) {
    raw =
      raw.slice(0, firstDot + 1) +
      raw.slice(firstDot + 1).replace(/\./g, '');
  }

  // max 5 Stellen vor dem Punkt
  const [intPartRaw, decPartRaw = ''] = raw.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '').slice(0, 5) || '0';

  // max 2 Nachkommastellen
  const decPart = decPartRaw.slice(0, 2);

  const normalized = decPart.length > 0 ? `${intPart}.${decPart}` : intPart;

  // harte Obergrenze
  const num = Number(normalized);
  if (!Number.isNaN(num) && num > MONEY_HARD_MAX) {
    return String(MONEY_HARD_MAX);
  }

  return normalized;
};
const formatMoneyOnBlur = (v: string) => {
  const cleaned = cleanMoney(v);
  if (cleaned === '') return '';
  const n = Number(cleaned);
  if (Number.isNaN(n)) return '';
  return Math.min(n, MONEY_HARD_MAX).toFixed(2);
};

const updateStaffel = (index: number, patch: Partial<Staffelzeile>) => {
  setStaffeln((prev) => {
    const copy = prev.map((r) => ({ ...r }));
    const next = { ...copy[index], ...patch };

    if (patch.preis !== undefined) next.preis = cleanMoney(patch.preis);
    if (patch.versand !== undefined) next.versand = cleanMoney(patch.versand);

    copy[index] = next;
    return copy;
  });
};

const blurStaffelMoney = (index: number, field: 'preis' | 'versand') => {
  setStaffeln((prev) => {
    const copy = prev.map((r) => ({ ...r }));
    copy[index][field] = formatMoneyOnBlur(copy[index][field]);
    return copy;
  });
};


  const progress = berechneFortschritt();
  const stripeReady = connectLoaded && connect?.ready === true;
const submitDisabled = ladeStatus || !stripeReady;


  return (
    <>

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

{warnung && (
  <p className={styles.validierungsfehler}>{warnung}</p>
)}

        {/* Vorschau Dateien */}
        <DateiVorschau
          files={dateien}
          onRemove={(idx) => setDateien(prev => prev.filter((_, i) => i !== idx))}
        />       

        {/* Kategorie-Auswahl */}
        <div className={styles.kategorieContainer}>
            <h2 className={styles.centeredHeading}>Ich verkaufe</h2>
            <div className={`${styles.iconRow} ${!kategorie && warnungKategorie ? styles.kategorieFehler : ''}`}>

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
            {kategorie && (
  <fieldset className={`${styles.radioGroup} ${warnungVerkaufAn ? styles.radioGroupError : ''}`}>
    <legend className={styles.radioLegend}>
      Verkauf an: <span style={{ color: 'red' }}>*</span>
    </legend>
    <div className={styles.radioOptionsHorizontal}>
      <label className={styles.radioLabel}>
        <input
          type="radio"
          name="verkaufAn"
          value="gewerblich"
          checked={verkaufAn === 'gewerblich'}
          onChange={() => setVerkaufAn('gewerblich')}
        />
        <span>Nur gewerbliche Käufer</span>
      </label>

      <label className={styles.radioLabel}>
        <input
          type="radio"
          name="verkaufAn"
          value="beide"
          checked={verkaufAn === 'beide'}
          onChange={() => setVerkaufAn('beide')}
        />
        <span>Privat & gewerblich</span>
      </label>
    </div>

    {warnungVerkaufAn && (
      <p className={styles.validierungsfehler}>{warnungVerkaufAn}</p>
    )}
  </fieldset>
)}

                        
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
    className={`${styles.input} ${warnungTitel ? styles.inputError : ''}`}
    maxLength={60}
    value={titel}
    onChange={(e) => setTitel(e.target.value)}
  />
  <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
</label>

{/* ⬇️ NEU */}
{warnungTitel && (
  <p className={styles.validierungsfehler}>{warnungTitel}</p>
)}


<label className={styles.label1}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Hersteller: <span style={{ color: 'red' }}>*</span>
  </span>
  <div
    ref={herstellerRef}
    className={styles.customSelect}
    onClick={() => setHerstellerDropdownOffen(prev => !prev)}
  >
    <div className={styles.selectedValue}>
  {hersteller === HERSTELLER_ANDERE_VALUE
    ? (herstellerAndere ? `Andere: ${herstellerAndere}` : 'Andere…')
    : (hersteller || 'Alle')}
</div>

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

  if (option === 'Andere…') {
    setHersteller(HERSTELLER_ANDERE_VALUE);
    setHerstellerDropdownOffen(false);
    return;
  }

  setHersteller(option);
  setHerstellerAndere(''); // Freitext leeren wenn normal gewählt
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
{hersteller === HERSTELLER_ANDERE_VALUE && (
  <label className={styles.label2}>
    Hersteller (Andere):
    <input
      type="text"
      className={styles.input}
      maxLength={30}
      value={herstellerAndere}
      onChange={(e) => setHerstellerAndere(e.target.value)}
      placeholder="Hersteller eingeben…"
    />
    <div className={styles.counter}>{herstellerAndere.length} / 30 Zeichen</div>
    {warnungHersteller && (
  <p className={styles.validierungsfehler}>{warnungHersteller}</p>
)}
  </label>
)}


<fieldset className={`${styles.mengeSection} ${warnungMenge ? styles.mengeSectionError : ''}`}>

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
  step={1}
  min={1}
  max={999999}
  className={styles.mengeNumberInput}
  value={menge === 0 ? '' : menge}
  onChange={(e) => {
    const v = e.target.value;
    if (v === '' || (/^\d+$/.test(v) && Number(v) <= 999999)) {
      setMenge(v === '' ? 0 : Number(v));
    }
  }}
  placeholder="z. B. 10"
/>

    </label>
  )}
  {warnungMenge && <p className={styles.mengeWarning}>{warnungMenge}</p>}
</fieldset>






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
{/* Dropdown: Farbpalette (Pflicht) */}
<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Farbpalette: <span style={{ color: 'red' }}>*</span>
  </span>

  {/* Unsichtbares echtes Select (optional, aber gut für Accessibility) */}
  <select
    value={farbpaletteWert}
    onChange={(e) => setFarbpaletteWert(e.target.value)}
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
    {farbpalette.map((p) => (
      <option key={p.value} value={p.value}>
        {p.name}
      </option>
    ))}
  </select>

  <div
    ref={farbpaletteRef}
    className={`${styles.customSelect} ${warnungPalette ? styles.selectError : ''}`}
    onClick={() => setFarbpaletteDropdownOffen((prev) => !prev)}
  >
    <div className={styles.selectedValue}>
      {farbpalette.find((p) => p.value === farbpaletteWert)?.name || 'Bitte wählen'}
    </div>

    {farbpaletteDropdownOffen && (
      <div className={styles.optionList}>
        {farbpalette.map((p) => (
          <div
            key={p.value}
            className={`${styles.optionItem} ${
              farbpaletteWert === p.value ? styles.activeOption : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setFarbpaletteWert(p.value);
              setFarbpaletteDropdownOffen(false);
              setWarnungPalette('');
            }}
          >
            {p.name}
          </div>
        ))}
      </div>
    )}
  </div>
</label>

{warnungPalette && <p className={styles.validierungsfehler}>{warnungPalette}</p>}

<label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Glanzgrad: <span style={{ color: 'red' }}>*</span>
  </span>

  {/* Unsichtbares echtes Select für Pflicht/Keyboard/Screenreader */}
<select
  value={glanzgrad}
  onChange={(e) => setGlanzgrad(e.target.value)}
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
    {glanzgradListe.map((g) => (
      <option key={g.value} value={g.value}>
        {g.name}
      </option>
    ))}
  </select>

  {/* EIN benutzerdefiniertes Dropdown */}
  <div
    ref={glanzgradRef}
    className={`${styles.customSelect} ${warnungGlanzgrad ? styles.selectError : ''}`}
    onClick={() => setGlanzgradDropdownOffen(!glanzgradDropdownOffen)}
  >
    <div className={styles.selectedValue}>
      {glanzgradListe.find((g) => g.value === glanzgrad)?.name || 'Bitte wählen'}
    </div>
    {glanzgradDropdownOffen && (
      <div className={styles.optionList}>
        {glanzgradListe.map((g) => (
          <div
            key={g.value}
            className={`${styles.optionItem} ${
              glanzgrad === g.value ? styles.activeOption : ''
            }`}
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
<fieldset className={`${styles.radioGroup} ${warnungZustand ? styles.radioGroupError : ''}`}>
  <legend className={styles.radioLegend}>Zustand: <span style={{ color: 'red' }}>*</span></legend>
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
      />
      <span>Geöffnet und einwandfrei</span>
    </label>
  </div>
</fieldset>  
{warnungZustand && (
     <p className={styles.validierungsfehler}>{warnungZustand}</p>
 )}

 <fieldset className={`${styles.radioGroup} ${warnungOberflaeche ? styles.radioGroupError : ''}`}>
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
  </div>
</fieldset>
{warnungOberflaeche && (
   <p className={styles.validierungsfehler}>{warnungOberflaeche}</p>
 )}
<fieldset className={`${styles.radioGroup} ${warnungAnwendung ? styles.radioGroupError : ''}`}>
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
  </div>
</fieldset>
{warnungAnwendung && (
   <p className={styles.validierungsfehler}>{warnungAnwendung}</p>
 )}
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
            'Niedrigtemp.-pulver',
            'Hochtemp.-pulver',
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
<fieldset className={`${styles.radioGroup} ${warnungAufladung ? styles.radioGroupError : ''}`}>
  <legend className={styles.radioLegend}>
    Aufladung: <span style={{ color: 'red' }}>*</span>
  </legend>

  {/* Natives Pflichtfeld nur aktivieren wenn nichts ausgewählt */}
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
  className={`${styles.textarea} ${warnungBeschreibung ? styles.textareaError : ''}`}
  maxLength={1200}
  rows={6}
  value={beschreibung}
  onChange={(e) => setBeschreibung(e.target.value)}
  placeholder="Beschreibe deinen Artikel oder besondere Hinweise..."
/>
  <div className={styles.counter}>{beschreibung.length} / 1200 Zeichen</div>
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
    className={`${styles.input} ${warnungTitel ? styles.inputError : ''}`}
    maxLength={60}
    value={titel}
    onChange={(e) => setTitel(e.target.value)}
  />
  <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
</label>

{/* ⬇️ NEU */}
{warnungTitel && (
  <p className={styles.validierungsfehler}>{warnungTitel}</p>
)}
<label>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Hersteller: <span style={{ color: 'red' }}>*</span>
  </span>

  <input
    type="text"
    className={`${styles.input} ${warnungHersteller ? styles.inputError : ''}`}
    maxLength={30}
    value={hersteller}
    onChange={(e) => setHersteller(e.target.value)}
    placeholder="z. B. Bosch, Makita, …"
  />

  <div className={styles.counter}>{hersteller.length} / 30 Zeichen</div>
</label>

{warnungHersteller && (
  <p className={styles.validierungsfehler}>{warnungHersteller}</p>
)}

   {/* Stückzahl */}
    { kategorie === 'arbeitsmittel' && (
  <fieldset className={`${styles.mengeSection} ${warnungMenge ? styles.mengeSectionError : ''}`}>
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
      value={mengeStueck === 0 ? '' : mengeStueck}
onChange={(e) => {
  const value = e.target.value;
  if (value === '' || (/^\d+$/.test(value) && Number(value) <= 999999)) {
    setMengeStueck(value === '' ? 0 : Number(value));
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
  />
</label>
{warnungGroesse && <p className={styles.validierungsfehler}>{warnungGroesse}</p>}


    {/* Beschreibung */}
    <label className={styles.label}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
  Beschreibung: <span style={{ color: 'red' }}>*</span>
</span>
  <textarea
  className={`${styles.textarea} ${warnungBeschreibung ? styles.textareaError : ''}`}
  maxLength={1200}
  rows={6}
  value={beschreibung}
  onChange={(e) => setBeschreibung(e.target.value)}
/>
  <div className={styles.counter}>{beschreibung.length} / 1200 Zeichen</div>
</label>
    {warnungBeschreibung && <p className={styles.validierungsfehler}>{warnungBeschreibung}</p>}
  </>
)}
    </motion.div>    
  </AnimatePresence>
)} 
{kategorie && (
  <fieldset
    className={`${styles.radioGroup} ${
      warnungVerkaufsArt ? styles.radioGroupError : ''
    }`}
  >
    <legend className={styles.radioLegend}>
      Verkaufsart: <span style={{ color: 'red' }}>*</span>
    </legend>

    <div className={styles.radioOptionsHorizontal}>
      <label
        className={styles.radioLabel}
        style={aufLager ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        title={aufLager ? 'Bei "Auf Lager" ist "Nur als Gesamtmenge" deaktiviert.' : undefined}
      >
        <input
          type="radio"
          name="verkaufsArt"
          value="gesamt"
          checked={verkaufsArt === 'gesamt'}
          onChange={() => setVerkaufsArt('gesamt')}
          disabled={aufLager}
        />
        <span>Nur als Gesamtmenge</span>
      </label>


      {(kategorie === 'nasslack' || kategorie === 'pulverlack') && (
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="verkaufsArt"
            value="pro_kg"
            checked={verkaufsArt === 'pro_kg'}
            onChange={() => setVerkaufsArt('pro_kg')}
          />
          <span>Verkauf mit gestaffelten Preisen</span>
        </label>
      )}

      {kategorie === 'arbeitsmittel' && (
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="verkaufsArt"
            value="pro_stueck"
            checked={verkaufsArt === 'pro_stueck'}
            onChange={() => setVerkaufsArt('pro_stueck')}
          />
          <span>Verkauf pro Stück</span>
        </label>
      )}
    </div>

    {warnungVerkaufsArt && (
      <p className={styles.validierungsfehler}>{warnungVerkaufsArt}</p>
    )}
  </fieldset>
)}
{(verkaufsArt === 'pro_kg' || verkaufsArt === 'pro_stueck') && (
  <div className={styles.staffelContainer}>
    <div className={styles.staffelHeaderRow}>
      <h3 className={styles.staffelHeading}>
        Preis- & Versandstaffel ({verkaufsArt === 'pro_kg' ? 'pro kg' : 'pro Stück'})
      </h3>

      

<button
  type="button"
  className={styles.staffelAddBtn}
  onClick={addStaffel}
  disabled={staffelAddDisabled}
  aria-disabled={staffelAddDisabled}

>
  + Staffel hinzufügen
</button>


    </div>

    {/* Kopfzeile nur am Desktop */}
    <div className={styles.staffelTableHead} aria-hidden>
      <div>Ab</div>
      <div>Bis (optional)</div>
      <div>Preis {verkaufsArt === 'pro_kg' ? '€/kg' : '€/Stück'}</div>
      <div>Versand (€)</div>
      <div></div>
    </div>

    {staffeln.map((row, index) => (
      <div key={index} className={styles.staffelTableRow}>
        {/* Ab */}
        <div className={styles.staffelCell}>
          <span className={styles.staffelMobileLabel}>Ab</span>
          <input
  type="text"
  inputMode="numeric"
  className={styles.staffelInput}
  value={row.minMenge}
  readOnly={index > 0}
  onChange={(e) => updateStaffelRange(index, 'minMenge', e.target.value)}
  placeholder="z. B. 1"
/>

        </div>

        {/* Bis */}
        <div className={styles.staffelCell}>
          <span className={styles.staffelMobileLabel}>Bis</span>
          <input
            type="text"
            inputMode="numeric"
            className={styles.staffelInput}
            value={row.maxMenge}
            onChange={(e) => updateStaffelRange(index, 'maxMenge', e.target.value)}
            onBlur={() => fixStaffelMaxOnBlur(index)}   // ✅ NEU
            placeholder="z. B. 10"
          />


        </div>

        {/* Preis */}
        <div className={styles.staffelCell}>
          <span className={styles.staffelMobileLabel}>Preis</span>
          <input
  type="text"
  inputMode="decimal"
  className={styles.staffelInput}
  value={row.preis}
  onChange={(e) => updateStaffel(index, { preis: e.target.value })}
  onBlur={() => blurStaffelMoney(index, 'preis')}
  placeholder="z. B. 12,90"
/>


        </div>

        {/* Versand */}
        <div className={styles.staffelCell}>
          <span className={styles.staffelMobileLabel}>Versand</span>
          <input
  type="text"
  inputMode="decimal"
  className={styles.staffelInput}
  value={row.versand}
  onChange={(e) => updateStaffel(index, { versand: e.target.value })}
  onBlur={() => blurStaffelMoney(index, 'versand')}
  placeholder="z. B. 0,00"
/>


        </div>

        {/* Remove */}
        <div className={styles.staffelCellEnd}>
          {staffeln.length > 1 && (
            <button
              type="button"
              className={styles.staffelRemoveBtn}
              onClick={() => removeStaffel(index)}
              aria-label={`Staffel ${index + 1} entfernen`}
            >
              Entfernen
            </button>
          )}
        </div>
      </div>
    ))}

    {warnungStaffeln && (
      <p className={styles.validierungsfehler}>{warnungStaffeln}</p>
    )}

    <p className={styles.staffelHinweis}>
  Hinweis: Bei „Auf Lager“ darf die letzte Staffel offen sein (Bis leer). Bei „Begrenzte Menge“ ist „Bis“ Pflicht und die letzte Staffel muss exakt bis zur Menge gehen.
</p>

  </div>
)}

{kategorie && (
  <div className={styles.preisVersandContainer}>
    <label className={styles.inputLabel}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
    Werktage bis Lieferung <span style={{ color: 'red' }}>*</span>
  </span>
      <input
        type="number"
        className={`${styles.dateInput} ${
          warnungWerktage ? styles.numberInputError : ''
        }`}
        min={1}
        step={1}
        max={999}
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
  </div>
)}

{verkaufsArt === 'gesamt' && (
  <div className={styles.preisVersandContainer}>
    <label className={styles.inputLabel}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        Gesamtpreis (€) <span style={{ color: 'red' }}>*</span>
      </span>
      <input
        type="number"
        className={`${styles.dateInput} ${warnungPreis ? styles.numberInputError : ''}`}
        min={1}
        step={0.01}
        max={99999.99}
        value={preis}
        onChange={(e) => {
          const value = e.target.value;
          if (value === '' || Number(value) <= 99999.99) setPreis(value);
        }}
      />
    </label>
    {warnungPreis && <p className={styles.warnung}>{warnungPreis}</p>}

    <label className={styles.inputLabel}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        Versandkosten (€) <span style={{ color: 'red' }}>*</span>
      </span>
      <input
        type="number"
        className={`${styles.dateInput} ${warnungVersand ? styles.numberInputError : ''}`}
        min={0}
        step={0.01}
        max={99999.99}
        value={versandKosten}
        onChange={(e) => {
          const value = e.target.value;
          if (value === '' || Number(value) <= 99999.99) setVersandKosten(value);
        }}
      />
    </label>
    {warnungVersand && <p className={styles.warnung}>{warnungVersand}</p>}
  </div>
)}



{/* Bewerbung – identisch wie im Grundgerüst */}
<div
  className={styles.bewerbungPanel}
  role="region"
  aria-label="Bewerbung deiner Anzeige"
>
  <div className={styles.bewerbungHeader}>
    <span className={styles.bewerbungIcon} aria-hidden></span>
    <p className={styles.bewerbungText}>
              Erhöhe deine Sichtbarkeit und steigere deine Verkäufe!
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
      <p><strong>Verkauf an:</strong> {verkaufAn || '–'}</p>

      {/* Lack-Vorschau */}
      {(kategorie === 'nasslack' || kategorie === 'pulverlack') && (
        <>
          <p><strong>Farbton:</strong> {farbton || '–'}</p>
          <p><strong>Farbcode:</strong> {farbcode || '–'}</p>
          <p><strong>Glanzgrad:</strong> {glanzgrad || '–'}</p>
          <p><strong>Farbpalette:</strong> {farbpaletteWert || '–'}</p>
          <p><strong>Hersteller:</strong> {
  hersteller === HERSTELLER_ANDERE_VALUE
    ? (herstellerAndere || '–')
    : (hersteller || '–')
}</p>

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
          <p><strong>Menge (Stück):</strong> {aufLager ? 'Auf Lager' : (mengeStueck || '–')}</p>
          <p><strong>Stück pro Verkaufseinheit:</strong> {stueckProEinheit || '–'}</p>
          <p><strong>Größe:</strong> {groesse || '–'}</p>
          <p><strong>Hersteller:</strong> {hersteller || '–'}</p>

        </>
      )}

      {/* Felder für beide Kategorien */}
      <p><strong>Werktage bis Lieferung:</strong> {lieferWerktage || '–'} Werktag{parseInt(lieferWerktage) > 1 ? 'e' : ''}</p>
      <p><strong>Verkaufsart:</strong> {
  verkaufsArt === 'gesamt'
    ? 'Nur als Gesamtmenge'
    : verkaufsArt === 'pro_kg'
    ? 'Gestaffelte Preise (pro kg)'
    : verkaufsArt === 'pro_stueck'
    ? 'Verkauf pro Stück (Staffeln)'
    : '–'
}</p>

{/* Menge in der Vorschau sauber */}
{(kategorie === 'nasslack' || kategorie === 'pulverlack') && (
  <p><strong>Menge:</strong> {aufLager ? 'Auf Lager' : `${menge || '–'} kg`}</p>
)}

{kategorie === 'arbeitsmittel' && (
  <p><strong>Menge:</strong> {aufLager ? 'Auf Lager' : `${mengeStueck || '–'} Stück`}</p>
)}

{/* Preisblock nach Verkaufsart */}
{verkaufsArt === 'gesamt' ? (
  <>
    <p><strong>Gesamtpreis:</strong> {preis ? `${parseFloat(preis).toFixed(2)} €` : '–'}</p>
    <p><strong>Versandkosten:</strong> {versandKosten !== '' ? `${parseFloat(versandKosten).toFixed(2)} €` : '–'}</p>
  </>
) : (verkaufsArt === 'pro_kg' || verkaufsArt === 'pro_stueck') ? (
  <>
    <p><strong>Preisstaffeln ({verkaufsArt === 'pro_kg' ? '€/kg' : '€/Stück'}):</strong></p>
    <ul>
      {staffeln
        .filter(s => [s.minMenge, s.maxMenge, s.preis, s.versand].some(x => (x ?? '').trim() !== ''))
        .map((s, i) => (
          <li key={i}>
            Ab {s.minMenge || '-'} bis {s.maxMenge || 'offen'}: {s.preis || '-'} €, Versand {s.versand?.trim() ? s.versand : '0'} €
          </li>
        ))}
    </ul>
  </>
) : null}

      <p><strong>Bilder:</strong> {bilder.length} Bild(er) ausgewählt</p>
      <p><strong>Dateien:</strong> {dateien.length} Datei(en) ausgewählt</p>
      <p><strong>AGB:</strong> {agbAccepted ? '✓ akzeptiert' : '✗ nicht akzeptiert'}</p>
    </motion.div>
  )}
</AnimatePresence>

<button type="submit" className={styles.submitBtn} disabled={submitDisabled}>
  {ladeStatus
  ? 'Bitte warten…'
  : !connectLoaded
  ? 'Stripe-Status wird geprüft…'
  : !stripeReady
  ? 'Stripe-Verifizierung erforderlich'
  : 'Artikel kostenlos einstellen'}

</button>

{connectLoaded && connect?.ready === false && (
  <p className={styles.validierungsfehler}>
    Bitte zuerst bei Stripe verifizieren – danach kannst du den Artikel einstellen.
  </p>
)}

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
      style={{ width: `${progress}%` }}
    >
      <span className={styles.progressValue}>{progress}%</span>
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
