'use client';

import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './sonderlacke.module.css';
import { FaSprayCan, FaCloud } from 'react-icons/fa';
import Navbar from '../components/navbar/Navbar';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Dropzone from './Dropzone';
import DateiVorschau from './DateiVorschau';
import { Star, Search, Crown, Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

import {
  gemeinsameFeiertageDEAT,
  isWeekend,
  toYMD,
  todayDate,
  minSelectableDate,
} from '../../lib/dateUtils';

/* ---------------- Fancy Loader Components ---------------- */

function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}
// oben importieren:


// null/undef-sicher
function iconForPackage(code?: string | null) {
  const c = (typeof code === 'string' ? code : '').toLowerCase();
  if (c === 'homepage')     return <Star size={18} className={styles.iconStar} aria-hidden />;
  if (c === 'search_boost') return <Search size={18} className={styles.iconSearch} aria-hidden />;
  if (c === 'premium')      return <Crown size={18} className={styles.iconCrown} aria-hidden />;
  return <Star size={18} aria-hidden />; // Fallback
}


function FormSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />

      <div className={styles.skelTwoCols}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>

      <div className={styles.skelDrop} />
      <div className={styles.skelDropSmall} />

      <div className={styles.skelGrid}>
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
        <div className={styles.skelInput} />
      </div>
    </div>
  );
}

/* ---------------- Mini-Kalender (Mo–So) ---------------- */

type MiniCalendarProps = {
  month: Date;
  onMonthChange: (next: Date) => void;
  selected?: Date | null;
  onSelect: (d: Date) => void;
  isDisabled: (d: Date) => boolean;
  minDate: Date;
};

function MiniCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  isDisabled,
  minDate,
}: MiniCalendarProps) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Mo=0..So=6
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const weeks: Array<Array<Date | null>> = [];
  let week: Array<Date | null> = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(y, m, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthLabel = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(month);
  const goPrev = () => onMonthChange(new Date(y, m - 1, 1));
  const goNext = () => onMonthChange(new Date(y, m + 1, 1));

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12,
      boxShadow: '0 6px 20px rgba(0,0,0,0.08)', width: 320, zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={goPrev} aria-label="Voriger Monat" style={{ padding: '4px 8px' }}>{'‹'}</button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={goNext} aria-label="Nächster Monat" style={{ padding: '4px 8px' }}>{'›'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 12, color: '#64748b', marginBottom: 4 }}>
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map((d) => <div key={d} style={{ textAlign: 'center' }}>{d}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weeks.map((w, wi) => w.map((d, di) => {
          if (!d) return <div key={`${wi}-${di}`} />;
          const disabled = isDisabled(d) || d < minDate;
          const isSelected = !!selected && toYMD(selected) === toYMD(d);
          return (
            <button
              key={`${wi}-${di}`}
              type="button"
              onClick={() => !disabled && onSelect(d)}
              disabled={disabled}
              style={{
                padding: '8px 0',
                borderRadius: 8,
                border: '1px solid ' + (isSelected ? '#0ea5e9' : '#e2e8f0'),
                background: disabled ? '#f1f5f9' : (isSelected ? '#e0f2fe' : '#fff'),
                color: disabled ? '#94a3b8' : '#0f172a',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {d.getDate()}
            </button>
          );
        }))}
      </div>
    </div>
  );
}

/* ---------------- Hilfen/Typen ---------------- */

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
    'application/octet-stream',
    'application/zip',
    'application/x-zip-compressed',
  ];
  const erlaubteEndungen = [
  '.pdf', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
  '.dwg', '.dxf', '.step', '.stp', '.stl'
];
  const dateiname = file.name.toLowerCase();
  const hatErlaubteEndung = erlaubteEndungen.some(ext => dateiname.endsWith(ext));
  const istErlaubterTyp = erlaubteMimeTypen.includes(file.type);
  return istErlaubterTyp || hatErlaubteEndung;
}

type NutzerTyp = 'gewerblich' | 'privat' | '';

type Adresse = {
  vorname: string;
  nachname: string;
  firma: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  land: string;
};

const glanzgradListe = [
  { name: 'Stumpfmatt', value: 'Stumpfmatt' },
  { name: 'Seidenmatt', value: 'Seidenmatt' },
  { name: 'Matt', value: 'Matt' },
  { name: 'Glanz', value: 'Glanz' },
  { name: 'Seidenglanz', value: 'Seidenglanz' },
  { name: 'Hochglanz', value: 'Hochglanz' },
];

const toAddressString = (a?: Partial<Adresse>) => {
  if (!a) return '';
  const zeile1 = [a.strasse, a.hausnummer].filter(Boolean).join(' ');
  const zeile2 = [a.plz, a.ort].filter(Boolean).join(' ');
  return [zeile1, zeile2, a.land].filter(Boolean).join(', ');
};

/* ---- Promo Pakete ---- */
// Typ vorne ergänzen:
type PromoPackage = {
  id: string;                // fürs UI (wir setzen es auf den CODE)
  code?: string | null;      // optional: Backend-Code
  title: string;
  subtitle?: string | null;
  price_cents: number;
  score_delta: number;
  most_popular?: boolean | null;
  stripe_price_id?: string | null;
};




const formatEUR = (cents: number) =>
  (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

/* ---------------- Seite ---------------- */
type PreparedUpload = {
  kind: 'image' | 'document'
  path: string
  token: string
  originalName: string
  mimeType: string | null
  sizeBytes: number | null
}

async function compressImageFile(file: File): Promise<File> {
  // Nur echte Bilder komprimieren
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Kleine Bilder nicht anfassen
  const maxSizeBeforeCompression = 1.2 * 1024 * 1024
  if (file.size <= maxSizeBeforeCompression) {
    return file
  }

  const imageBitmap = await createImageBitmap(file)

  const maxWidth = 1000
  const maxHeight = 1000

  let { width, height } = imageBitmap

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    imageBitmap.close()
    return file
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height)
  imageBitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      resolve,
      'image/jpeg',
      0.6,
    )
  })

  if (!blob) {
    return file
  }

  // Falls Komprimierung aus irgendeinem Grund größer wird, Original behalten
  if (blob.size >= file.size) {
    return file
  }

  const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')

  return new File(
    [blob],
    `${originalNameWithoutExt}.jpg`,
    {
      type: 'image/jpeg',
      lastModified: Date.now(),
    },
  )
}

async function uploadPreparedFilesToSupabase(params: {
  bucket: string
  uploads: PreparedUpload[]
  photoFiles: File[]
  fileFiles: File[]
}) {
  const supabase = supabaseBrowser()

  const allFiles = [
    ...params.photoFiles.map((file) => ({
      kind: 'image' as const,
      file,
    })),
    ...params.fileFiles.map((file) => ({
      kind: 'document' as const,
      file,
    })),
  ]

  if (params.uploads.length !== allFiles.length) {
    throw new Error('Dateizuordnung fehlgeschlagen.')
  }

  const concurrency = 4
  const finishedUploads: PreparedUpload[] = []

  for (let i = 0; i < params.uploads.length; i += concurrency) {
    const batch = params.uploads.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batch.map(async (upload, batchIndex) => {
        const realIndex = i + batchIndex
        const fileItem = allFiles[realIndex]

        const { error } = await supabase.storage
          .from(params.bucket)
          .uploadToSignedUrl(upload.path, upload.token, fileItem.file, {
            contentType: fileItem.file.type || undefined,
          })

        if (error) {
          console.error('Direkter Upload zu Supabase fehlgeschlagen:', error)
          throw new Error(error.message)
        }

        return {
          ...upload,
          mimeType: fileItem.file.type || upload.mimeType,
          sizeBytes: fileItem.file.size,
          originalName: fileItem.file.name || upload.originalName,
        }
      }),
    )

    finishedUploads.push(...batchResults)
  }

  return finishedUploads
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

const MAX_DOCUMENT_TOTAL_SIZE = 25 * 1024 * 1024 // 25 MB insgesamt

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return `${Math.round(bytes / 1024)} KB`
}
function ArtikelEinstellen() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Boot-Loading (Profil)
  const [bootLoading, setBootLoading] = useState(true);
  const [showBootLoader, setShowBootLoader] = useState(false)

useEffect(() => {
  if (!bootLoading) {
    setShowBootLoader(false)
    return
  }
  const t = window.setTimeout(() => setShowBootLoader(true), 250) // <- Delay
  return () => window.clearTimeout(t)
}, [bootLoading])

  // Auswahl/Felder
  const [kategorie, setKategorie] = useState<'nasslack' | 'pulverlack' | null>(null);
  const [titel, setTitel] = useState<string>('');
  const [farbpaletteWert, setFarbpaletteWert] = useState<string>('');
  const [zustand, setZustand] = useState<string>('');
  const [anwendung, setAnwendung] = useState<string>('');
  const [farbcode, setFarbcode] = useState<string>('');
  const [glanzgrad, setGlanzgrad] = useState<string>('');
  const [qualitaet, setQualitaet] = useState<string>('');
  const [effekt, setEffekt] = useState<string[]>([]);
  const [sondereffekte, setSondereffekte] = useState<string[]>([]);
  const [zertifizierungen, setZertifizierungen] = useState<string[]>([]);
  const [oberflaeche, setOberflaeche] = useState<string>('');
  const [beschreibung, setBeschreibung] = useState<string>('');
  const [farbton, setFarbton] = useState<string>('');
  const [hersteller, setHersteller] = useState<string>('');
  const [aufladung, setAufladung] = useState<string[]>([]);
  const displayHersteller = (v?: string) => (v && v.trim() ? v : 'Alle');
  const einheitFuerKategorie = (kat: 'nasslack' | 'pulverlack' | null) =>
  kat === 'nasslack' ? 'Liter' : 'kg';

  // Adresse/Profil
  const [lieferadresseOption, setLieferadresseOption] = useState<'profil' | 'manuell'>('profil');
  const [lieferDatum, setLieferDatum] = useState<Date | null>(null);

  const [vorname, setVorname] = useState<string>('');
  const [nachname, setNachname] = useState<string>('');
  const [firma, setFirma] = useState<string>('');
  const [strasse, setStrasse] = useState<string>('');
  const [hausnummer, setHausnummer] = useState<string>('');
  const [plz, setPlz] = useState<string>('');
  const [ort, setOrt] = useState<string>('');
  const [land, setLand] = useState<string>('');

  const [profilAdresse, setProfilAdresse] = useState<Adresse>({
    vorname: '', nachname: '', firma: '', strasse: '', hausnummer: '',
    plz: '', ort: '', land: '',
  });
  const [nutzerTyp, setNutzerTyp] = useState<NutzerTyp>('');
  const [accountType, setAccountType] = useState<'business' | 'private' | ''>('');

  // Uploads
  const [bilder, setBilder] = useState<File[]>([]);
  const [dateien, setDateien] = useState<File[]>([]);
  const [bildPreviews, setBildPreviews] = useState<string[]>([]);
  const [bilderWerdenOptimiert, setBilderWerdenOptimiert] = useState(false);

  // UI/State
  const [glanzgradDropdownOffen, setGlanzgradDropdownOffen] = useState<boolean>(false);
  const [sondereffekteOffen, setSondereffekteOffen] = useState<boolean>(false);
  const [qualitaetOffen, setQualitaetOffen] = useState<boolean>(false);
  const [herstellerDropdownOffen, setHerstellerDropdownOffen] = useState<boolean>(false);
  const [farbpaletteDropdownOffen, setFarbpaletteDropdownOffen] = useState<boolean>(false);
  const [vorschauAktiv, setVorschauAktiv] = useState<boolean>(false);
  const [ladeStatus, setLadeStatus] = useState<boolean>(false);
  const [formAbgesendet, setFormAbgesendet] = useState<boolean>(false);
  const [overlayTitle, setOverlayTitle] = useState('Wir veröffentlichen deine Lackanfrage …');
  const [overlayText, setOverlayText] = useState('Wir leiten gleich weiter.');

  // Promo
  const [packages, setPackages] = useState<PromoPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);
  const [bewerbungOptionen, setBewerbungOptionen] = useState<string[]>([]); // package_ids

  // Warnungen
  const [warnungKategorie, setWarnungKategorie] = useState<string>('');
  const [warnungBilder, setWarnungBilder] = useState<string>('');
  const [warnungTitel, setWarnungTitel] = useState<string>('');
  const [warnungMenge, setWarnungMenge] = useState<string>('');
  const [warnungGlanzgrad, setWarnungGlanzgrad] = useState<string>('');
  const [warnungPalette, setWarnungPalette] = useState<string>('');
  const [WarnungOberflaeche, setWarnungOberflaeche] = useState<string>('');
  const [warnungAnwendung, setWarnungAnwendung] = useState<string>('');
  const [warnungZustand, setWarnungZustand] = useState<string>('');
  const [warnungBeschreibung, setWarnungBeschreibung] = useState<string>('');
  const [warnungFarbton, setWarnungFarbton] = useState<string>('');
  const [warnung, setWarnung] = useState<string>('');

  // Refs
  // Refs
  const herstellerRef = useRef<HTMLDivElement>(null);
  const farbpaletteRef = useRef<HTMLDivElement>(null);
  const glanzgradRef = useRef<HTMLDivElement>(null);
  const agbRef = useRef<HTMLDivElement>(null);

  const bilderRef = useRef<HTMLDivElement>(null);
  const kategorieRef = useRef<HTMLDivElement>(null);
  const titelRef = useRef<HTMLLabelElement>(null);
  const mengeRef = useRef<HTMLLabelElement>(null);
  const farbtonRef = useRef<HTMLLabelElement>(null);
  const farbpaletteFehlerRef = useRef<HTMLLabelElement>(null);
  const glanzgradFehlerRef = useRef<HTMLLabelElement>(null);
  const zustandRef = useRef<HTMLFieldSetElement>(null);
  const oberflaecheRef = useRef<HTMLFieldSetElement>(null);
  const anwendungRef = useRef<HTMLFieldSetElement>(null);
  const beschreibungRef = useRef<HTMLLabelElement>(null);
  const lieferDatumRef = useRef<HTMLFieldSetElement>(null);
  const adresseRef = useRef<HTMLDivElement>(null);
  const aufladungRef = useRef<HTMLFieldSetElement>(null);
  const scrollToBlock = (ref: React.RefObject<HTMLElement>) => {
  if (!ref.current) return;

  const y = ref.current.getBoundingClientRect().top + window.scrollY - 90;

  window.scrollTo({
    top: y,
    behavior: 'smooth',
  });
};

  // Herstellerlisten
  const herstellerListePulver = [
    'IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm Pulverlacke', 'Akzo Nobel',
    'Sherwin Williams', 'Brillux','Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
    'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL',
    'E-Pulverit', 'Braunsteiner', 'Ganzlin', 'Colors-Manufaktur', 'Aalbert',
    'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de', 'Pulverlacke24.de',
    'Pulverlacke.de', 'Pulverlack-pro.de', 'Pulverlackshop.de'
  ];
  const herstellerListeNass = [
    'Sherwin-Williams', 'Brillux','PPG Industries','Akzo Nobel','Nippon Paint','RPM International','Axalta','BASF','Kansai',
    'Asian Paints','Jotun','Hempel','Adler Lacke','Berger','Nerolac','Benjamin Moore'
  ];
  const aktuelleHerstellerListe =
    kategorie === 'nasslack'
      ? herstellerListeNass
      : kategorie === 'pulverlack'
      ? herstellerListePulver
      : [];

  // Farbpaletten
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

  // Vorauswahl Kategorie aus URL
  useEffect(() => {
    const vorausgewaehlt = searchParams.get('kategorie');
    if (vorausgewaehlt === 'nasslack' || vorausgewaehlt === 'pulverlack') {
      setKategorie(vorausgewaehlt);
    }
  }, [searchParams]);

  /* ===== Profil laden ===== */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBootLoading(true);
        const res = await fetch('/api/profile', { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        const p = data?.profile ?? {};
        const a = p?.address ?? {};
        const at = (p?.account_type ?? '').toString() as 'business' | 'private' | '';

        setAccountType(at);
        setNutzerTyp(at === 'business' ? 'gewerblich' : at === 'private' ? 'privat' : '');

        const adr: Adresse = {
          vorname:  p.firstName || '',
          nachname: p.lastName  || '',
          firma:    at === 'business' ? (p.company || '') : '',
          strasse:  a.street || '',
          hausnummer: a.houseNumber || '',
          plz:      a.zip || '',
          ort:      a.city || '',
          land:     a.country || '',
        };
        setProfilAdresse(adr);

        if (lieferadresseOption === 'manuell') {
          setVorname(adr.vorname);
          setNachname(adr.nachname);
          setFirma(adr.firma);
          setStrasse(adr.strasse);
          setHausnummer(adr.hausnummer);
          setPlz(adr.plz);
          setOrt(adr.ort);
          setLand(adr.land);
        }
      } catch (err) {
        console.error('Profil laden fehlgeschlagen', err);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [lieferadresseOption]);

  // Beim Umschalten auf "manuell" Felder aus Profil übernehmen
  useEffect(() => {
    if (lieferadresseOption === 'manuell') {
      setVorname(profilAdresse.vorname);
      setNachname(profilAdresse.nachname);
      setFirma(profilAdresse.firma);
      setStrasse(profilAdresse.strasse);
      setHausnummer(profilAdresse.hausnummer);
      setPlz(profilAdresse.plz);
      setOrt(profilAdresse.ort);
      setLand(profilAdresse.land);
    }
  }, [lieferadresseOption, profilAdresse]);

  // Dropdowns schließen bei Click außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (herstellerRef.current && !herstellerRef.current.contains(event.target as Node)) {
        setHerstellerDropdownOffen(false);
      }
      if (farbpaletteRef.current && !farbpaletteRef.current.contains(event.target as Node)) {
        setFarbpaletteDropdownOffen(false);
      }
      if (glanzgradRef.current && !glanzgradRef.current.contains(event.target as Node)) {
        setGlanzgradDropdownOffen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Bild-Previews
  useEffect(() => {
    const urls = bilder.map((file: File) => URL.createObjectURL(file));
    setBildPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [bilder]);
  const handleBilderChange: React.Dispatch<React.SetStateAction<File[]>> = (
  value,
) => {
  const rawFiles =
    typeof value === 'function' ? value(bilder) : value

  setBilderWerdenOptimiert(true)

  Promise.all(rawFiles.map((file) => compressImageFile(file)))
    .then((optimizedFiles) => {
  setBilder(optimizedFiles)

  if (optimizedFiles.length > 0) {
    setWarnungBilder('')
  }
})
    .catch((error) => {
      console.error('Bildoptimierung fehlgeschlagen:', error)
      setBilder(rawFiles)
    })
    .finally(() => {
      setBilderWerdenOptimiert(false)
    })
}

  // Menge (nur Zahl, 1 Nachkommastelle)
  const [menge, setMenge] = useState<number>(0);
  function handleMengeChange(e: React.ChangeEvent<HTMLInputElement>): void {
  const val = e.target.value.replace(',', '.');

  if (val === '') {
    setMenge(0);
    return;
  }

  if (/^\d{0,4}(\.\d{0,1})?$/.test(val)) {
    const parsed = parseFloat(val);
    setMenge(parsed);

    if (!isNaN(parsed) && parsed > 0) {
      setWarnungMenge('');
    }
  }
}

  const fadeIn = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3 },
  } as const;

  // Feiertags-/Werktag-Handling
  const today = useMemo<Date>(() => todayDate(), []);
  const minDate = useMemo<Date>(() => minSelectableDate(), []);
  const holidaysSet = useMemo<Set<string>>(() => {
    const y = today.getFullYear();
    const s1 = gemeinsameFeiertageDEAT(y);
    const s2 = gemeinsameFeiertageDEAT(y + 1);
    return new Set<string>([...s1, ...s2]);
  }, [today]);

  const isDisabledDay = (d: Date): boolean => {
    if (d < minDate) return true;
    if (isWeekend(d)) return true;
    if (holidaysSet.has(toYMD(d))) return true;
    return false;
  };

  // Fortschritt
  const berechneFortschritt = (): number => {
    let total = 0, filled = 0;
    total++; if (kategorie) filled++;
    total++; if (bilder.length > 0) filled++;
    total++; if (menge > 0) filled++;
    total++; if (titel.trim() !== '') filled++;
    total++; if (farbpaletteWert) filled++;
    total++; if (glanzgrad) filled++;
    total++; if (zustand) filled++;
    total++; if (oberflaeche) filled++;
    total++; if (farbton.trim() !== '') filled++;
    total++; if (anwendung) filled++;
    total++; if (beschreibung.trim() !== '') filled++;
    total++; if (lieferDatum) filled++;
    total++; if (lieferadresseOption) filled++;
    if (kategorie === 'pulverlack') { total++; if (aufladung.length > 0) filled++; }
    total++; if (agbAccepted) filled++;
    return Math.round((filled / total) * 100);
  };

  const resetFieldsExceptCategory = (): void => {
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

  const formularZuruecksetzen = (): void => {
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
    setZertifizierungen([]);
    setAufladung([]);
    setWarnung('');
    setWarnungKategorie('');
    setWarnungBilder('');
    setWarnungPalette('');
    setWarnungZustand('');
    setWarnungBeschreibung('');
    setWarnungFarbton('');
    setLieferDatum(null);
    setVorname('');
    setNachname('');
    setFirma('');
    setStrasse('');
    setHausnummer('');
    setPlz('');
    setOrt('');
    setLand('');
    setLieferadresseOption('profil');
    setFormAbgesendet(false);
    setAgbAccepted(false);
    setAgbError(false);
    setBewerbungOptionen([]);
  };

  /* ---------------- Promo-Pakete laden ---------------- */
  useEffect(() => {
  let alive = true;
  (async () => {
    try {
      setLoadingPackages(true);
      const res = await fetch('/api/promo/packages', { cache: 'no-store', credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();

      // Robust gegen verschiedene Response-Shapes
      const raw: any[] =
        Array.isArray(json) ? json
      : Array.isArray(json?.items) ? json.items
      : Array.isArray(json?.data)  ? json.data
      : [];

      const normalized: PromoPackage[] = raw.map((i: any) => ({
    id: String(i.id ?? i._id ?? i.code),
    code: i.code ?? null,
    title: i.title,
    subtitle: i.subtitle ?? null,
    price_cents: Number(i.price_cents ?? i.priceCents ?? 0),
    score_delta: Number(i.score_delta ?? i.scoreDelta ?? 0),
    most_popular: Boolean(i.most_popular ?? i.mostPopular ?? false),
    stripe_price_id: i.stripe_price_id ?? i.stripePriceId ?? null,
  }));


      if (alive) setPackages(normalized);
    } catch (e) {
      console.warn('Promo-Pakete konnten nicht geladen werden:', e);
      if (alive) setPackages([]);
    } finally {
      if (alive) setLoadingPackages(false);
    }
  })();
  return () => { alive = false; };
}, []);

  const selectedPackageTitles = useMemo(() => {
    const map = new Map(packages.map(p => [p.id, p.title]));
    return bewerbungOptionen.map(id => map.get(id) || id);
  }, [bewerbungOptionen, packages]);

  // ▼▼ NEU: Summen für Score und Preis der ausgewählten Pakete
  const selectedPromoScore = useMemo(() => {
    const scoreById = new Map(packages.map(p => [p.id, Number(p.score_delta || 0)]));
    return bewerbungOptionen.reduce((sum, id) => sum + (scoreById.get(id) ?? 0), 0);
  }, [bewerbungOptionen, packages]);

  const selectedTotalCents = useMemo(() => {
    const priceById = new Map(packages.map(p => [p.id, Number(p.price_cents || 0)]));
    return bewerbungOptionen.reduce((sum, id) => sum + (priceById.get(id) ?? 0), 0);
  }, [bewerbungOptionen, packages]);

  /* ---------------- Submit ---------------- */

  const [agbAccepted, setAgbAccepted] = useState<boolean>(false);
  const [agbError, setAgbError] = useState<boolean>(false);
  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
  e.preventDefault();

  if (bilderWerdenOptimiert) {
    alert('Bitte kurz warten, die Bilder werden noch optimiert.');
    return;
  }

  const dokumenteGesamtGroesse = dateien.reduce(
    (sum, file) => sum + file.size,
    0,
  );

  if (dokumenteGesamtGroesse > MAX_DOCUMENT_TOTAL_SIZE) {
    setWarnung(
      `Die Dateien sind insgesamt zu groß. Maximal erlaubt sind ${formatFileSize(
        MAX_DOCUMENT_TOTAL_SIZE,
      )}.`,
    );
    return;
  }

  setFormAbgesendet(true);

  let fehler = false;
  let firstErrorRef: React.RefObject<HTMLElement> | null = null;

const setFirstError = (ref: React.RefObject<HTMLElement>) => {
  if (!firstErrorRef) {
    firstErrorRef = ref;
  }
};

  // Pflichtfelder
 
if (!kategorie) {
  setWarnungKategorie('Bitte wähle eine Kategorie aus.');
  setFirstError(kategorieRef);
  fehler = true;
} else {
  setWarnungKategorie('');
}

if (bilder.length === 0) {
  setWarnungBilder('Bitte lade mindestens ein Bild hoch.');
  setFirstError(bilderRef);
  fehler = true;
} else {
  setWarnungBilder('');
}

if (!titel.trim()) {
  setWarnungTitel('Bitte gib einen Titel an.');
  setFirstError(titelRef);
  fehler = true;
} else {
  setWarnungTitel('');
}

if (isNaN(menge) || menge <= 0) {
  setWarnungMenge('Bitte gib eine gültige Menge an.');
  setFirstError(mengeRef);
  fehler = true;
} else {
  setWarnungMenge('');
}

if (!glanzgrad) {
  setWarnungGlanzgrad('Bitte gib den Glanzgrad an.');
  setFirstError(glanzgradFehlerRef);
  fehler = true;
} else {
  setWarnungGlanzgrad('');
}

if (!farbpaletteWert) {
  setWarnungPalette('Bitte wähle eine Farbpalette aus.');
  setFirstError(farbpaletteFehlerRef);
  fehler = true;
} else {
  setWarnungPalette('');
}

if (!oberflaeche) {
  setWarnungOberflaeche('Bitte wähle eine Oberfläche aus.');
  setFirstError(oberflaecheRef);
  fehler = true;
} else {
  setWarnungOberflaeche('');
}

if (!anwendung) {
  setWarnungAnwendung('Bitte wähle eine Anwendung aus.');
  setFirstError(anwendungRef);
  fehler = true;
} else {
  setWarnungAnwendung('');
}

if (!zustand) {
  setWarnungZustand('Bitte wähle den Zustand aus.');
  setFirstError(zustandRef);
  fehler = true;
} else {
  setWarnungZustand('');
}

if (!farbton.trim()) {
  setWarnungFarbton('Bitte gib den Farbton an.');
  setFirstError(farbtonRef);
  fehler = true;
} else {
  setWarnungFarbton('');
}

if (kategorie === 'pulverlack' && aufladung.length === 0) {
  setFirstError(aufladungRef);
  fehler = true;
}

if (!beschreibung.trim()) {
  setWarnungBeschreibung('Bitte gib eine Beschreibung ein.');
  setFirstError(beschreibungRef);
  fehler = true;
} else {
  setWarnungBeschreibung('');
}

if (!lieferDatum || isDisabledDay(lieferDatum)) {
  setWarnung('Bitte einen zulässigen Werktag wählen (nicht heute, kein Sa/So, kein gemeinsamer Feiertag in DE/AT).');
  setFirstError(lieferDatumRef);
  fehler = true;
} else {
  setWarnung('');
}

if (!agbAccepted) {
  setAgbError(true);
  setFirstError(agbRef);
  fehler = true;
} else {
  setAgbError(false);
}

if (lieferadresseOption === 'manuell') {
  if (
    !vorname.trim() ||
    !nachname.trim() ||
    !strasse.trim() ||
    !hausnummer.trim() ||
    !plz.trim() ||
    !ort.trim() ||
    !land.trim()
  ) {
    setFirstError(adresseRef);
    fehler = true;
  }
}

  if (fehler) {
  setLadeStatus(false);

  if (firstErrorRef) {
    scrollToBlock(firstErrorRef);
  }

  return;
}

  setLadeStatus(true);

  let willNavigate = false;
  let userErrorMessage =
    'Fehler beim Absenden. Deine Lackanfrage wurde möglicherweise nicht korrekt gespeichert oder die Bewerbung ist fehlgeschlagen.';

  setOverlayTitle('Wir veröffentlichen deine Lackanfrage …');
  setOverlayText('Wir leiten gleich weiter.');

  const hasPromo = bewerbungOptionen.length > 0;

  const adr: Adresse =
    lieferadresseOption === 'profil'
      ? profilAdresse
      : {
          vorname,
          nachname,
          firma,
          strasse,
          hausnummer,
          plz,
          ort,
          land,
        };

  const lieferort = [adr.plz, adr.ort].filter(Boolean).join(' ') || adr.ort || '';
  const lieferadresseString = toAddressString(adr);

  try {
    const payload = {
      kategorie,
      zertifizierungen: zertifizierungen.join(', '),
      titel,
      farbton: farbton.trim(),
      glanzgrad,
      hersteller: hersteller === 'Alle' ? '' : hersteller,
      zustand,
      farbpalette: farbpaletteWert,
      beschreibung,
      anwendung,
      oberflaeche,
      farbcode,
      effekt: effekt.join(', '),
      sondereffekte: sondereffekte.join(', '),
      qualitaet,
      menge,

      account_type: accountType,
      nutzerTyp,
      istGewerblich: accountType === 'business',
      lieferdatum: toYMD(lieferDatum!),

      vorname: adr.vorname,
      nachname: adr.nachname,
      firma: adr.firma,
      strasse: adr.strasse,
      hausnummer: adr.hausnummer,
      plz: adr.plz,
      ort: adr.ort,
      land: adr.land,

      lieferort,
      lieferadresse: lieferadresseString,
      lieferadresseOption,

      aufladung: kategorie === 'pulverlack' ? aufladung.join(', ') : '',

      bilder: bilder.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),

      dateien: dateien.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    };

    const prepareRes = await fetch('/api/lackanfrage-vorbereiten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (prepareRes.status === 401 || prepareRes.status === 403) {
      setLadeStatus(false);
      router.replace('/login?next=/sonderlacke');
      return;
    }

    if (!prepareRes.ok) {
  let payload: any = null;

  try {
    payload = await prepareRes.json();
  } catch {}

  console.error('Fehler /api/lackanfrage-vorbereiten:', {
    status: prepareRes.status,
    payload,
  });

  userErrorMessage =
    `Vorbereitung fehlgeschlagen: ${payload?.stage || payload?.error || 'unbekannte Stelle'}\n\n` +
    `${payload?.message || payload?.details || 'Keine Detailmeldung vorhanden.'}`;

  throw new Error(userErrorMessage);
}

    const prepareData = await prepareRes.json();

    const requestId = prepareData?.requestId as string | undefined;
    const bucket = prepareData?.bucket as string;
    const uploads = prepareData?.uploads as PreparedUpload[];

    if (!requestId) {
      console.error('Keine requestId im Response von /api/lackanfrage-vorbereiten', prepareData);

      userErrorMessage =
        'Die Lackanfrage konnte nicht eindeutig gespeichert werden. Bitte versuche es erneut.';

      throw new Error('Lackanfrage konnte nicht eindeutig gespeichert werden.');
    }

    setOverlayTitle('Dateien werden hochgeladen …');
    setOverlayText('Bitte Seite nicht schließen.');

    userErrorMessage =
      'Ein oder mehrere Bilder oder Dateien konnten nicht hochgeladen werden. Bitte prüfe deine Internetverbindung, entferne die betroffenen Dateien und versuche es erneut.';

    const finishedUploads = await uploadPreparedFilesToSupabase({
      bucket,
      uploads,
      photoFiles: bilder,
      fileFiles: dateien,
    });

    setOverlayTitle('Lackanfrage wird finalisiert …');
    setOverlayText('Wir veröffentlichen deine Lackanfrage.');

    const finalizeRes = await fetch('/api/lackanfrage-finalisieren', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        requestId,
        uploads: finishedUploads,
      }),
    });

    if (!finalizeRes.ok) {
      let payload: any = null;

      try {
        payload = await finalizeRes.json();
      } catch {}

      console.error('Fehler /api/lackanfrage-finalisieren:', finalizeRes.status, payload);

      if (
        payload?.error === 'uploaded_files_missing_in_storage' ||
        payload?.error === 'invalid_upload_paths'
      ) {
        userErrorMessage =
          'Ein oder mehrere Bilder oder Dateien konnten nicht vollständig hochgeladen werden. Bitte entferne die betroffenen Dateien, lade sie erneut hoch und versuche es noch einmal.';
      } else if (payload?.error === 'storage_check_failed') {
        userErrorMessage =
          'Die hochgeladenen Dateien konnten gerade nicht geprüft werden. Bitte versuche es in wenigen Minuten erneut.';
      } else {
        userErrorMessage =
          'Die Lackanfrage konnte nicht veröffentlicht werden. Bitte versuche es erneut.';
      }

      throw new Error(
        payload?.details ||
          payload?.error ||
          'Lackanfrage konnte nicht finalisiert werden.',
      );
    }

    if (hasPromo) {
      setOverlayTitle('Lackanfrage gespeichert');
      setOverlayText('Wir öffnen den Checkout …');

      try {
        const selected = bewerbungOptionen
          .map((id) => packages.find((p) => p.id === id))
          .filter(Boolean) as PromoPackage[];

        const packageCodes = selected.map((p) => (p.code || p.id).toLowerCase());

        const priceIds = selected
          .map((p) => p.stripe_price_id || null)
          .filter(Boolean) as string[];

        const checkoutRes = await fetch('/api/promo/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            request_id: requestId,
            package_ids: packageCodes,
            price_ids: priceIds,
          }),
        });

        let checkoutUrl: string | null = null;
        const ct = (checkoutRes.headers.get('content-type') || '').toLowerCase();
        let payload: any = null;

        if (ct.includes('application/json')) {
          payload = await checkoutRes.json().catch(() => null);

          if (checkoutRes.ok && payload?.url) {
            checkoutUrl = String(payload.url);
          }

          if (!checkoutRes.ok) {
            console.error('Promo checkout error (json)', {
              status: checkoutRes.status,
              payload,
            });

            userErrorMessage =
              payload?.message ||
              payload?.details ||
              payload?.error ||
              'Die Lackanfrage wurde gespeichert, aber der Checkout konnte nicht gestartet werden.';

            willNavigate = true;
            router.replace(`/konto/lackanfragen?published=1&promo=failed&requestId=${encodeURIComponent(requestId)}`);
            return;
          }
        } else {
          const loc = checkoutRes.headers.get('location');
          if (loc) checkoutUrl = loc;
        }

        if (checkoutUrl) {
          willNavigate = true;
          await nextFrame();
          window.location.assign(checkoutUrl);
          return;
        }

        console.error('Promo checkout error (no url)', {
          status: checkoutRes.status,
          headers: Object.fromEntries(checkoutRes.headers.entries()),
          payload,
        });

        userErrorMessage =
          `Checkout-Start fehlgeschlagen (keine URL; HTTP ${checkoutRes.status}).`;

        willNavigate = true;
        router.replace(`/konto/lackanfragen?published=1&promo=failed&requestId=${encodeURIComponent(requestId)}`);
        return;
      } catch (err: any) {
        console.error('Promo checkout request failed', err);

        userErrorMessage =
          err?.message ||
          'Netzwerkfehler beim Checkout.';

        willNavigate = true;
        router.replace(`/konto/lackanfragen?published=1&promo=failed&requestId=${encodeURIComponent(requestId)}`);
        return;
      }
    }

    willNavigate = true;
    await nextFrame();
    router.replace(`/konto/lackanfragen?published=1&requestId=${encodeURIComponent(requestId)}`);
    return;
  } catch (error) {
    console.error('❌ Fehler beim Absenden / Promo:', error);
    alert(userErrorMessage);
  } finally {
    if (!willNavigate) {
      setLadeStatus(false);
    }
  }
};

  const toggleBewerbung = (packageId: string): void => {
    setBewerbungOptionen(prev =>
      prev.includes(packageId) ? prev.filter(id => id !== packageId) : [...prev, packageId]
    );
  };

  /* ---------------- Kalender-Overlay Logik ---------------- */

  const [calOpen, setCalOpen] = useState<boolean>(false);
  const [calMonth, setCalMonth] = useState<Date>(() => today);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dateFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calOpen) {
      if (lieferDatum) setCalMonth(new Date(lieferDatum.getFullYear(), lieferDatum.getMonth(), 1));
      else setCalMonth(minDate);
    }
  }, [calOpen, lieferDatum, minDate]);

  useEffect(() => {
    if (!calOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const withinPopover = popoverRef.current?.contains(target);
      const withinField = dateFieldRef.current?.contains(target);
      if (!withinPopover && !withinField) {
        setCalOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCalOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [calOpen]);

  useEffect(() => {
  if (lieferDatum) {
    setCalOpen(false);
    setWarnung('');
  }
}, [lieferDatum]);

  /* ---------- Skeleton beim Initial-Load ---------- */
  const [showBootUI, setShowBootUI] = useState(false);

useEffect(() => {
  if (!bootLoading) { setShowBootUI(false); return; }
  const t = setTimeout(() => setShowBootUI(true), 250);
  return () => clearTimeout(t);
}, [bootLoading]);

if (bootLoading) {
  return (
    <>
      <Navbar />

      {showBootUI ? (
        <>
          <TopLoader />
          <div className={styles.container}>
            <FormSkeleton />
          </div>
        </>
      ) : (
        // ✅ Platzhalter hält Footer unten – kein Loader sichtbar
        <div className={styles.container} style={{ minHeight: '85vh' }} />
      )}
    </>
  );
}


  return (
    <>
      <Navbar />

      <form onSubmit={handleSubmit} className={styles.container}>
        <motion.div {...fadeIn} className={styles.infoBox} viewport={{ once: true }}>
          💡 Ab sofort ist das Einholen von Lack-Angeboten <strong>kostenlos</strong>!
          <a href="/mehr-erfahren" className={styles.infoLink}>Mehr erfahren</a>
        </motion.div>

        <h1 className={styles.heading}>Passenden Lack nicht gefunden? Kein Problem! </h1>
        <p className={styles.description}>
          Bitte lade aussagekräftige Bilder und relevante Unterlagen zu deinem Artikel hoch. Das erste Bild das du hochlädst wird dein Titelbild.
        </p>

        {/* Bilder */}
        {/* Bilder */}
        <div ref={bilderRef}>
          <Dropzone
            type="bilder"
            label="Fotos hierher ziehen oder klicken (max. 8)"
            accept="image/*"
            maxFiles={8}
            files={bilder}
            setFiles={handleBilderChange}
            setWarnung={setWarnungBilder}
            id="fotoUpload"
          />

          {bilderWerdenOptimiert && (
            <p className={styles.optimierungHinweis}>Bilder werden optimiert …</p>
          )}

          {warnungBilder && <p className={styles.validierungsfehler}>{warnungBilder}</p>}
        </div>


        {/* Vorschau Bilder */}
        <DateiVorschau
          bilder
          files={bilder}
          previews={bildPreviews}
          onRemove={(idx: number) => setBilder(prev => prev.filter((_, i) => i !== idx))}
        />

        {/* Dateien */}
        <Dropzone
          type="dateien"
          label="Dateien hierher ziehen oder klicken (max. 8)"
          accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.txt,.csv,.dwg,.dxf,.step,.stp,.stl"
          maxFiles={8}
          files={dateien}
          setFiles={setDateien}
          istGueltig={istGueltigeDatei}
          setWarnung={setWarnung}
          id="dateiUpload"
          maxDateigroesseMB={10}
        />

        {/* Vorschau Dateien */}
        <DateiVorschau
          files={dateien}
          onRemove={(idx: number) => setDateien(prev => prev.filter((_, i) => i !== idx))}
        />

        {/* Kategorie-Auswahl */}
        <div className={styles.kategorieContainer} ref={kategorieRef}>
          <h2 className={styles.centeredHeading}>Ich möchte Angebote für einen</h2>
          <div className={`${styles.iconRow} ${!kategorie && warnungKategorie ? styles.kategorieFehler : ''}`}>
            <div
              className={`${styles.iconBox} ${kategorie === 'nasslack' ? styles.activeIcon : ''}`}
              onClick={() => {
                resetFieldsExceptCategory();
                setKategorie('nasslack');
                setWarnungKategorie('');
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
                setWarnungKategorie('');
              }}
            >
              <FaCloud size={32} />
              <span>Pulverlack</span>
            </div>
          </div>
        </div>
        {!kategorie && warnungKategorie && (
          <p className={styles.validierungsfehler}>{warnungKategorie}</p>
        )}

        {/* Dynamische Felder */}
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
              {(kategorie === 'pulverlack' || kategorie === 'nasslack') && (
                <>
                  <label ref={titelRef}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    Titel für meine Anzeige: <span style={{ color: 'red' }}>*</span>
                    </span>
                    <input
                      type="text"
                      className={styles.input}
                      maxLength={60}
                      value={titel}
                      onChange={(e) => {
                      setTitel(e.target.value);
                      if (e.target.value.trim()) setWarnungTitel('');
                    }}
                    />
                    <div className={styles.counter}>{titel.length} / 60 Zeichen</div>
                  </label>
                  {warnungTitel && <p className={styles.validierungsfehler}>{warnungTitel}</p>}

                  {/* Hersteller */}
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
                            onClick={(e) => { e.stopPropagation(); setHersteller('Alle'); setHerstellerDropdownOffen(false); }}
                          >
                            Alle
                          </div>
                          {aktuelleHerstellerListe.map((option: string) => (
                            <div
                              key={option}
                              className={`${styles.optionItem} ${hersteller === option ? styles.activeOption : ''}`}
                              onClick={(e) => { e.stopPropagation(); setHersteller(option); setHerstellerDropdownOffen(false); }}
                            >
                              {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Menge */}
                    <label className={styles.labelmenge} ref={mengeRef}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        Benötigte Menge ({einheitFuerKategorie(kategorie)}):{' '}
                        <span style={{ color: 'red' }}>*</span>
                      </span>

                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="9999.9"
                        className={styles.input}
                        value={menge === 0 ? '' : menge}
                        onChange={handleMengeChange}
                        placeholder={`z. B. 5.5 ${einheitFuerKategorie(kategorie)}`}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                        }}
                      />
                    </label>
                  {warnungMenge && <p className={styles.validierungsfehler}>{warnungMenge}</p>}

                  {/* Farbpalette */}
                  <label className={styles.label} ref={farbpaletteFehlerRef}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.0rem' }}>
                      Farbpalette: <span style={{ color: 'red' }}>*</span>
                    </span>

                    <select
                      value={farbpaletteWert}
                      onChange={() => {}}
                      aria-hidden
                      tabIndex={-1}
                      style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: -1 }}
                    >
                      <option value="">Bitte wählen</option>
                      {farbpalette.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>

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
                                  setWarnungPalette('');
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
                  {warnungPalette && <p className={styles.validierungsfehler}>{warnungPalette}</p>}

                  {/* Farbton / Farbcode */}
                  <label className={styles.label} ref={farbtonRef}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      Farbtonbezeichnung: <span style={{ color: 'red' }}>*</span>
                    </span>
                    <input
                      type="text"
                      className={styles.input}
                      maxLength={20}
                      value={farbton}
                      onChange={(e) => {
                        setFarbton(e.target.value);
                        if (e.target.value.trim()) setWarnungFarbton('');
                      }}
                      placeholder="z. B. 9010 (RAL) oder S-8500 (NCS)"
                      aria-invalid={Boolean(warnungFarbton)}
                    />
                    <div className={styles.counter}>{farbton.length} / 20 Zeichen</div>
                  </label>
                  {warnungFarbton && <p className={styles.validierungsfehler}>{warnungFarbton}</p>}

                  <label className={styles.labelFarbcode}>
                    Farbcode (optional):
                    <input
                      type="text"
                      className={styles.inputFarbcode}
                      maxLength={20}
                      value={farbcode}
                      onChange={(e) => setFarbcode(e.target.value)}
                      placeholder="z. B. #00e5ff"
                    />
                    <div className={styles.counter}>{farbcode.length} / 20 Zeichen</div>
                  </label>

                  {/* Glanzgrad */}
<label className={styles.label} ref={glanzgradFehlerRef}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
    Glanzgrad: <span style={{ color: 'red' }}>*</span>
  </span>

  <select
    value={glanzgrad}
    onChange={() => {}}
    aria-hidden
    tabIndex={-1}
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

  <div
    ref={glanzgradRef}
    className={styles.customSelect}
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
              setWarnungGlanzgrad('');
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

                  {/* Qualität (optional) */}
                  {kategorie === 'pulverlack' && (
                    <label className={styles.label}>
                      Qualität (optional)
                      <div
                        className={styles.customSelect}
                        onClick={() => setQualitaetOffen(!qualitaetOffen)}
                        tabIndex={0}
                        onBlur={() => setTimeout(() => setQualitaetOffen(false), 100)}
                      >
                        <div className={styles.selectedValue}>{qualitaet || 'Bitte wählen'}</div>
                        {qualitaetOffen && (
                          <div className={styles.optionList}>
                            {['Standard','Polyester','Epoxy-Polyester','Polyurethan','Polyester für Feuerverzinkung','Thermoplast'].map((q) => (
                              <div key={q} className={styles.optionItem} onClick={() => { setQualitaet(q); setQualitaetOffen(false); }}>{q}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  )}
                  {kategorie === 'nasslack' && (
                    <label className={styles.label}>
                      Qualität (optional)
                      <div
                        className={styles.customSelect}
                        onClick={() => setQualitaetOffen(!qualitaetOffen)}
                        tabIndex={0}
                        onBlur={() => setTimeout(() => setQualitaetOffen(false), 100)}
                      >
                        <div className={styles.selectedValue}>{qualitaet || 'Bitte wählen'}</div>
                        {qualitaetOffen && (
                          <div className={styles.optionList}>
                            {['1K-Lack','2K-Lack','UV-härtender Lack'].map((q) => (
                              <div key={q} className={styles.optionItem} onClick={() => { setQualitaet(q); setQualitaetOffen(false); }}>{q}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  )}

                  {/* Zustand */}
                  <fieldset className={styles.radioGroup} ref={zustandRef}>
                    <legend className={styles.radioLegend}>
                      Zustand: <span style={{ color: 'red' }}>*</span>
                    </legend>
                    <div className={styles.radioOptionsHorizontal}>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="zustand" value="neu" checked={zustand === 'neu'} onChange={() => {
                        setZustand('neu');
                        setWarnungZustand('');
                      }} />
                        <span>Neu / ungeöffnet</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="zustand" value="geöffnet" checked={zustand === 'geöffnet'} onChange={() => {
                          setZustand('geöffnet');
                          setWarnungZustand('');
                        }} />
                        <span>Geöffnet / einwandfrei</span>
                      </label>
                      {warnungZustand && <p className={styles.validierungsfehlerradio}>{warnungZustand}</p>}
                    </div>
                  </fieldset>

                  {/* Oberfläche */}
                  <fieldset className={styles.radioGroup} ref={oberflaecheRef}>
                    <legend className={styles.radioLegend}>
                      Oberfläche: <span style={{ color: 'red' }}>*</span>
                    </legend>
                    <div className={styles.radioOptionsHorizontal}>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="oberflaeche" value="glatt" checked={oberflaeche === 'glatt'} onChange={() => {
                          setOberflaeche('glatt');
                          setWarnungOberflaeche('');
                        }} />
                        <span>Glatt</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="oberflaeche" value="feinstruktur" checked={oberflaeche === 'feinstruktur'} onChange={() => {
                          setOberflaeche('feinstruktur');
                          setWarnungOberflaeche('');
                        }} />
                        <span>Feinstruktur</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="oberflaeche" value="grobstruktur" checked={oberflaeche === 'grobstruktur'} onChange={() => {
                          setOberflaeche('grobstruktur');
                          setWarnungOberflaeche('');
                        }} />
                        <span>Grobstruktur</span>
                      </label>
                      {WarnungOberflaeche && <p className={styles.validierungsfehlerradio}>{WarnungOberflaeche}</p>}
                    </div>
                  </fieldset>

                  {/* Anwendung */}
                  <fieldset className={styles.radioGroup} ref={anwendungRef}>
                    <legend className={styles.radioLegend}>
                      Anwendung: <span style={{ color: 'red' }}>*</span>
                    </legend>
                    <div className={styles.radioOptionsHorizontal}>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="anwendung" value="universal" checked={anwendung === 'universal'} onChange={() => {
                          setAnwendung('universal');
                          setWarnungAnwendung('');
                        }} />
                        <span>Universal</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="anwendung" value="innen" checked={anwendung === 'innen'} onChange={() => {
                          setAnwendung('innen');
                          setWarnungAnwendung('');
                        }} />
                        <span>Innen</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="anwendung" value="außen" checked={anwendung === 'außen'} onChange={() => {
                          setAnwendung('außen');
                          setWarnungAnwendung('');
                        }} />
                        <span>Außen</span>
                      </label>
                      <label className={styles.radioLabel}>
                        <input type="radio" name="anwendung" value="industrie" checked={anwendung === 'industrie'} onChange={() => {
                          setAnwendung('industrie');
                          setWarnungAnwendung('');
                        }} />
                        <span>Industrie</span>
                      </label>
                      {warnungAnwendung && <p className={styles.validierungsfehlerradio}>{warnungAnwendung}</p>}
                    </div>
                  </fieldset>

                  {/* Zertifizierungen */}
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
                              setZertifizierungen(prev => checked ? [...prev, 'GSB'] : prev.filter(v => v !== 'GSB'));
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
                              setZertifizierungen(prev => checked ? [...prev, 'Qualicoat'] : prev.filter(v => v !== 'Qualicoat'));
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
                        {['GEB EMICODE','Blauer Engel','EU Ecolabel'].map((z) => (
                          <label key={z} className={styles.radioLabel}>
                            <input
                              type="checkbox"
                              name="zertifizierungen"
                              value={z}
                              checked={zertifizierungen.includes(z)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setZertifizierungen(prev => checked ? [...prev, z] : prev.filter(v => v !== z));
                              }}
                            />
                            <span>{z}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {/* Effekte */}
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
                            setEffekt(prev => checked ? [...prev, 'Metallic'] : prev.filter(v => v !== 'Metallic'));
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
                            setEffekt(prev => checked ? [...prev, 'Fluoreszierend'] : prev.filter(v => v !== 'Fluoreszierend'));
                          }}
                        />
                        <span>Fluoreszierend</span>
                      </label>
                    </div>
                  </fieldset>

                  {/* Sondereffekte */}
                  {kategorie === 'pulverlack' && (
                    <fieldset className={styles.radioGroup}>
                      <legend className={styles.toggleLegend} onClick={() => setSondereffekteOffen(!sondereffekteOffen)} style={{ cursor: 'pointer' }}>
                        Sondereffekte (Pulverlack) {sondereffekteOffen ? '▲' : '▼'}
                      </legend>
                      <AnimatePresence initial={false}>
                        {sondereffekteOffen && (
                          <motion.div className={styles.checkboxGrid} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                            {[
                              'Hochwetterfest','Ultra Hochwetterfest','Transparent','Niedrigtemp.pulver','Hochtemp.pulver','Anti-Ausgasung',
                              'Kratzresistent','Elektrisch Ableitfähig','Solar geeignet','Soft-Touch','Hammerschlag','Eisenglimmer','Perlglimmer',
                              'Selbstreinigend','Anti-Bakteriell','Anti-Grafitti','Anti-Quietsch','Anti-Rutsch',
                            ].map((eff) => (
                              <label key={eff} className={styles.radioLabel}>
                                <input
                                  type="checkbox"
                                  name="sondereffekte"
                                  value={eff}
                                  checked={sondereffekte.includes(eff)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSondereffekte(prev => checked ? [...prev, eff] : prev.filter(v => v !== eff));
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

                  {kategorie === 'nasslack' && (
                    <fieldset className={styles.radioGroup}>
                      <legend className={styles.toggleLegend} onClick={() => setSondereffekteOffen(!sondereffekteOffen)} style={{ cursor: 'pointer' }}>
                        Sondereffekte (Nasslack) {sondereffekteOffen ? '▲' : '▼'}
                      </legend>
                      <AnimatePresence initial={false}>
                        {sondereffekteOffen && (
                          <motion.div className={styles.checkboxGrid} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                            {[
                              'Hochwetterfest','Ultra Hochwetterfest','Transparent','Kratzresistent','Elektr. Ableitfähig','Solar geeignet','Soft-Touch',
                              'Hammerschlag','Eisenglimmer','Perlglimmer','Selbstreinigend','Anti-Bakteriell','Anti-Grafitti','Anti-Quietsch','Anti-Rutsch',
                            ].map((eff) => (
                              <label key={eff} className={styles.radioLabel}>
                                <input
                                  type="checkbox"
                                  name="sondereffekte"
                                  value={eff}
                                  checked={sondereffekte.includes(eff)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSondereffekte(prev => checked ? [...prev, eff] : prev.filter(v => v !== eff));
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

                  {/* Pulverlack: Aufladung */}
                  {kategorie === 'pulverlack' && (
                      <fieldset
                        ref={aufladungRef}
                        className={`${styles.radioGroup} ${formAbgesendet && aufladung.length === 0 ? styles.feldError : ''}`}
                      >
                      <legend className={styles.radioLegend}>
                        Aufladung: <span style={{ color: 'red' }}>*</span>
                      </legend>

                      {/* "Pflicht" für Screenreader/Validation */}
                      {aufladung.length === 0 && (
                        <input type="checkbox" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} tabIndex={-1} onChange={() => {}} />
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
                              setAufladung(prev =>
                                checked ? [...prev, 'Corona'] : prev.filter(v => v !== 'Corona')
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
                              setAufladung(prev =>
                                checked ? [...prev, 'Tribo'] : prev.filter(v => v !== 'Tribo')
                              );
                            }}
                          />
                          <span>Tribo</span>
                        </label>
                        {(formAbgesendet && aufladung.length === 0) && (
                          <p className={styles.validierungsfehlerradio}>Bitte wähle mindestens eine Option bei der Aufladung.</p>
                        )}
                      </div>
                    </fieldset>
                  )}

                  {/* Beschreibung */}
                  <label className={styles.label} ref={beschreibungRef}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      Beschreibung: <span style={{ color: 'red' }}>*</span>
                    </span>
                    <textarea
                      className={styles.textarea}
                      maxLength={600}
                      rows={6}
                      value={beschreibung}
                      onChange={(e) => {
                        setBeschreibung(e.target.value);
                        if (e.target.value.trim()) setWarnungBeschreibung('');
                      }}
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

        {/* Lieferdetails */}
<fieldset className={styles.radioGroupliefercontainer} ref={lieferDatumRef}>
  <legend className={styles.radioLegendlieferdetails}>
    Lieferdetails: <span style={{ color: 'red' }}>*</span>
  </legend>

  <div className={styles.lieferContainer}>
    {/* Werktags-Datepicker */}
    <label className={styles.label} style={{ position: 'relative' }}>
      Lieferdatum: <span style={{ color: 'red' }}>*</span>
      <div ref={dateFieldRef} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <input
                  type="text"
                  className={styles.input}
                  readOnly
                  value={lieferDatum ? new Intl.DateTimeFormat('de-DE').format(lieferDatum) : ''}
                  placeholder="Datum wählen"
                  onClick={() => setCalOpen(true)}
                />
                <button type="button" className={styles.zuruecksetzenButton} onClick={() => setCalOpen(true)}>
                  Datum wählen
                </button>
                {lieferDatum && (
                  <button
  type="button"
  className={styles.zuruecksetzenButton}
  onClick={() => {
    setLieferDatum(null);
    setWarnung('Bitte einen zulässigen Werktag wählen (nicht heute, kein Sa/So, kein gemeinsamer Feiertag in DE/AT).');
  }}
>
  Löschen
</button>
                )}
              </div>

              {calOpen && (
                <div
                  ref={popoverRef}
                  className={styles.calendarPopover}
                  role="dialog"
                  aria-label="Kalender"
                >
                  <MiniCalendar
  month={calMonth}
  onMonthChange={setCalMonth}
  selected={lieferDatum}
  onSelect={(d: Date) => {
    setLieferDatum(d);
    setWarnung('');
    setCalOpen(false);
  }}
  isDisabled={isDisabledDay}
  minDate={minDate}
/>
                </div>
              )}
            </label>

            {/* Lieferadresse wählen */}
            {warnung && !lieferDatum && (
  <p className={styles.validierungsfehler}>{warnung}</p>
)}
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
              <div className={styles.grid3spaltig} ref={adresseRef}>
                <label className={styles.inputLabel}>
                  Vorname
                  <input
                    type="text"
                    className={`${styles.input} ${formAbgesendet && !vorname.trim() ? styles.inputError : ''}`}
                    value={vorname}
                    maxLength={15}
                    onChange={(e) => setVorname(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß \-]/g, ''))}
                  />
                </label>

                <label className={styles.inputLabel}>
                  Nachname
                  <input
                    type="text"
                    className={`${styles.input} ${formAbgesendet && !nachname.trim() ? styles.inputError : ''}`}
                    maxLength={30}
                    value={nachname}
                    onChange={(e) => setNachname(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß \-]/g, ''))}
                  />
                </label>

                <label className={styles.inputLabel}>
                  Firma
                  <input
                    type="text"
                    className={styles.input}
                    maxLength={20}
                    value={firma}
                    onChange={(e) => setFirma(e.target.value.replace(/[^a-zA-Z0-9äöüÄÖÜß .\-&]/g, ''))}
                  />
                </label>

                <label className={styles.inputLabel}>
                  Straße
                  <input
                    type="text"
                    className={`${styles.input} ${formAbgesendet && !strasse.trim() ? styles.inputError : ''}`}
                    maxLength={40}
                    value={strasse}
                    onChange={(e) => setStrasse(e.target.value.replace(/[^a-zA-Z0-9äöüÄÖÜß .\-]/g, ''))}
                  />
                </label>

                <label className={styles.inputLabel}>
                  Hausnummer
                  <input
                    type="text"
                    className={`${styles.input} ${formAbgesendet && (!hausnummer.trim() || !/\d/.test(hausnummer)) ? styles.inputError : ''}` }
                    maxLength={4}
                    value={hausnummer}
                    onChange={(e) => setHausnummer(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  />
                </label>

                <label className={styles.inputLabel}>
                  PLZ
                  <input
                    type="text"
                    className={`${styles.input} ${formAbgesendet && !plz.trim() ? styles.inputError : ''}`}
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
                    className={`${styles.input} ${formAbgesendet && !ort.trim() ? styles.inputError : ''}`}
                    value={ort}
                    maxLength={30}
                    onChange={(e) => setOrt(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß \-]/g, ''))}
                  />
                </label>

                <label className={styles.inputLabel}>
                  Land
                  <select
                    className={`${styles.select} ${formAbgesendet && !land ? styles.selectError : ''}`}
                    value={land}
                    onChange={(e) => setLand(e.target.value)}
                  >
                    <option value="" disabled hidden>Bitte wählen</option>
                    <option value="Deutschland">Deutschland</option>
                    <option value="Österreich">Österreich</option>
                    <option value="Schweiz">Schweiz</option>
                    <option value="Liechtenstein">Liechtenstein</option>
                  </select>
                </label>
              </div>
            )}

            {lieferadresseOption === 'profil' && (
              <div className={styles.grid3spaltig}>
                <label className={styles.inputLabel}>
                  Vorname
                  <input type="text" className={styles.input} value={profilAdresse.vorname || '—'} disabled />
                </label>
                <label className={styles.inputLabel}>
                  Nachname
                  <input type="text" className={styles.input} value={profilAdresse.nachname || '—'} disabled />
                </label>
                <label className={styles.inputLabel}>
                  Firma
                  <input type="text" className={styles.input} value={profilAdresse.firma || ''} disabled />
                </label>
                <label className={styles.inputLabel}>
                  Straße
                  <input type="text" className={styles.input} value={profilAdresse.strasse || '—'} disabled />
                </label>
                <label className={styles.inputLabel}>
                  Hausnummer
                  <input type="text" className={styles.input} value={profilAdresse.hausnummer || '—'} disabled />
                </label>
                <label className={styles.inputLabel}>
                  PLZ
                  <input type="text" className={styles.input} value={profilAdresse.plz || '—'} disabled />
                </label>
                <label className={styles.inputLabel}>
                  Ort
                  <input type="text" className={styles.input} value={profilAdresse.ort || '—'} disabled />
                </label>
                <label className={styles.inputLabel}>
                  Land
                  <input type="text" className={styles.input} value={profilAdresse.land || '—'} disabled />
                </label>
              </div>
            )}
          </div>
        </fieldset>

        {/* Bewerbung – dynamisch aus /api/promo/packages */}
        <div className={styles.bewerbungPanel} role="region" aria-label="Bewerbung deiner Anfrage">
          <div className={styles.bewerbungHeader}>
            <span className={styles.bewerbungIcon} aria-hidden></span>
            <p className={styles.bewerbungText}>
              Erhöhe deine Sichtbarkeit und erhalte bessere Angebote!
            </p>
          </div>

          {loadingPackages ? (
              <div style={{ fontSize: 14, color: '#64748b' }}>Pakete werden geladen …</div>
            ) : packages.length === 0 ? (
              <div style={{ fontSize: 14, color: '#64748b' }}>Derzeit keine Promotion-Pakete verfügbar.</div>
           ) : (
  <>
    <div className={styles.bewerbungGruppe}>
      {packages.map((p) => (
        <label key={p.id} className={styles.bewerbungOption}>
          <input
            type="checkbox"
            onChange={() => toggleBewerbung(p.id)}
            checked={bewerbungOptionen.includes(p.id)}
          />
          {iconForPackage(p.code)}
          <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
            <span>
              {p.title} — {formatEUR(p.price_cents)}
              {p.most_popular ? <span style={{ marginLeft: 6, fontWeight: 600 }}>(Beliebt)</span> : null}
            </span>
            {p.subtitle ? <small style={{ color: '#64748b' }}>{p.subtitle}</small> : null}
          </span>
        </label>
      ))}
      <p className={styles.steuerHinweis}>Steuern werden im Checkout berechnet.</p>

    </div>

    {/* NEU: Info unterhalb der drei Optionen */}
    <div className={styles.promoHinweis} role="note" aria-live="polite">
      <div className={styles.promoHinweisRow}>
        <span className={styles.promoScore}>Deine Auswahl: +{selectedPromoScore} Promo-Punkte</span>
        <span className={styles.promoSumme}>Gesamt: {formatEUR(selectedTotalCents)}</span>
      </div>
      <small>
        Pakete addieren sich. Die Sortierung der Anzeigen erfolgt nach dem Promo-Score.
        Eine Startseiten-Platzierung ist <em>nicht garantiert</em> – wenn andere zeitgleich
        einen höheren Gesamtwert haben, erscheinen deren Anzeigen zuerst.
      </small>
    </div>
  </>
)}

            </div>
            


        {/* AGB */}
        <div className={styles.agbContainer} ref={agbRef}>
          <motion.label
            className={`${styles.agbLabel} ${agbError ? styles.agbError : ''}`}
            animate={agbError ? { x: [0, -4, 4, -4, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            <label
              className={`${styles.agbLabel} ${styles.checkboxLabel} ${agbError ? styles.agbError : ''}`}
              htmlFor="agbCheckbox"
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
            </label>

            <span>
              Ich akzeptiere die{' '}
              <a href="/agb" className={styles.nutzungsbedingungenLink}>Allgemeinen Geschäftsbedingungen</a>{' '}
              zur Gänze. Informationen zur Verarbeitung deiner Daten findest du in unserer{' '}
              <a href="/datenschutz" className={styles.agbLink}>Datenschutzerklärung</a>.
            </span>
          </motion.label>
          {agbError && <p className={styles.validierungsfehleragb}>Bitte akzeptiere die AGB.</p>}
        </div>

        {/* Vorschau */}
        <button type="button" onClick={() => setVorschauAktiv(prev => !prev)} className={styles.vorschauToggle}>
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
              <p><strong>Farbtonbezeichnung:</strong> {farbton || '–'}</p>
              <p><strong>Menge (kg):</strong> {menge || '–'}</p>
              <p><strong>Farbcode:</strong> {farbcode || '–'}</p>
              <p><strong>Glanzgrad:</strong> {glanzgrad || '–'}</p>
              <p><strong>Farbpalette:</strong> {farbpaletteWert || '–'}</p>
              <p><strong>Hersteller:</strong> {displayHersteller(hersteller)}</p>
              <p><strong>Oberfläche:</strong> {oberflaeche || '–'}</p>
              <p><strong>Anwendung:</strong> {anwendung || '–'}</p>
              <p><strong>Effekte:</strong> {effekt.join(', ') || '–'}</p>
              <p><strong>Sondereffekte:</strong> {sondereffekte.join(', ') || '–'}</p>
              <p><strong>Qualität:</strong> {qualitaet || '–'}</p>
              <p><strong>Zertifizierungen:</strong> {zertifizierungen.join(', ') || '–'}</p>
              {kategorie === 'pulverlack' && (
                <p><strong>Aufladung:</strong> {aufladung.join(', ') || '–'}</p>
              )}
              <p><strong>Bewerbung:</strong> {selectedPackageTitles.join(', ') || 'Keine ausgewählt'}</p>
              <p><strong>Bilder:</strong> {bilder.length} Bild(er) ausgewählt</p>
              <p><strong>Dateien:</strong> {dateien.length} Datei(en) ausgewählt</p>
              <p><strong>Lieferdatum:</strong> {lieferDatum ? lieferDatum.toLocaleDateString('de-DE') : '–'}</p>
              <p><strong>Lieferadresse:</strong>{' '}  {lieferadresseOption === 'profil'    ? toAddressString(profilAdresse)    : toAddressString({ vorname, nachname, firma, strasse, hausnummer, plz, ort, land }) || '–'}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button type="submit" className={styles.submitBtn} disabled={ladeStatus || bilderWerdenOptimiert}>
          {bilderWerdenOptimiert ? (
              'Bilder werden optimiert…'
            ) : ladeStatus ? (
              <>
                Bitte warten…
                <span className={styles.spinner}></span>
              </>
            ) : (
              'Anzeige veröffentlichen'
            )}
        </button>

        {/* Reset */}
        <div className={styles.buttonRechts}>
          <button type="button" onClick={formularZuruecksetzen} className={styles.zuruecksetzenButton} disabled={ladeStatus}>
            Alle Eingaben zurücksetzen
          </button>
        </div>

        {/* Progress */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBarWrapper}>
            <div className={styles.progressBar} style={{ width: `${berechneFortschritt()}%` }}>
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

      {/* ---------- POPUP: während des Ladens sichtbar ---------- */}
      
    </>
  );
}

export default ArtikelEinstellen;
