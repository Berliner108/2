'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './ArtikelDetail.module.css';
import Navbar from '../../../components/navbar/Navbar';
import { FaFilePdf } from 'react-icons/fa';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Link from 'next/link';

/* ===== Fancy Loader Components (nur während loading) ===== */
function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      <div className={styles.skelTwoCols}>
        {/* linke Spalte: großes Bild */}
        <div className={styles.skelDrop} />
        {/* rechte Spalte: mehrere Felder */}
        <div className={styles.skelGrid}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>
      </div>

      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />
    </div>
  );
}

/* ===================== Typen ===================== */

type ApiItem = {
  id: string;
  title?: string | null;
  lieferdatum?: string | null;
  delivery_at?: string | null;
  status?: string | null;
  published?: boolean | null;
  data?: Record<string, any> | null;
  ort?: string;
  bilder?: string[];
  user?: string;
  user_rating?: number | null;
  user_rating_count?: number | null;
};

type DateiItem = { name: string; url: string };

type ArtikelView = {
  id: string;
  titel: string;
  bilder: string[];
  lieferdatum: Date | null;
  zustand: string;
  hersteller: string;
  menge: number | null;
  ort: string;
  kategorie: string;
  user?: string;
  user_rating?: number | null;
  user_rating_count?: number | null;
  farbcode?: string;
  effekt?: string;
  anwendung?: string;
  oberfläche?: string;
  glanzgrad?: string;
  sondereigenschaft?: string;
  beschreibung?: string;
  gesponsert?: boolean;
  gewerblich?: boolean;
  privat?: boolean;
  dateien?: DateiItem[];
  farbpalette?: string;
  farbton?: string;
  qualität?: string;
  zertifizierung?: string[];
  aufladung?: string[];
};

/* ===================== Helfer ===================== */

const toBool = (v: unknown): boolean =>
  typeof v === 'boolean' ? v
  : typeof v === 'string' ? ['1','true','yes','ja','wahr'].includes(v.toLowerCase())
  : typeof v === 'number' ? v !== 0
  : !!v;

function toDateOrNull(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function formatKg(n?: number | null): string {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  // 0–1 Nachkommastelle, deutsches Format (Komma)
  const s = n.toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return `${s} kg`;
}

function normKategorie(k?: string): string {
  const v = (k || '').toLowerCase();
  if (v === 'pulverlack') return 'Pulverlack';
  if (v === 'nasslack') return 'Nasslack';
  return k || '';
}

function normZustand(z?: string): string {
  const v = (z || '').toLowerCase();
  if (v.includes('neu')) return 'Neu und ungeöffnet';
  if (v.includes('geöffnet') || v.includes('geoeffnet') || v.includes('offen')) return 'Geöffnet und einwandfrei';
  return z || '';
}

function resolveLieferdatum(it: ApiItem): Date | null {
  // liest aus mehreren möglichen Feldern
  // @ts-ignore
  const d = it.lieferdatum || it.delivery_at || it.data?.lieferdatum || it.data?.delivery_at;
  return toDateOrNull(d);
}

function resolveMenge(d: any): number | null {
  const raw = d?.menge;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  return null;
}

function resolveBilder(d: any, fallback?: string[]): string[] {
  if (Array.isArray(fallback) && fallback.length) return fallback;
  const b = d?.bilder;
  if (Array.isArray(b) && b.length) {
    if (typeof b[0] === 'string') return b as string[];
    if (typeof b[0] === 'object' && b[0]?.url) return (b as Array<{ url: string }>).map(x => x.url).filter(Boolean);
  }
  if (typeof b === 'string' && b.trim()) return b.split(',').map(s => s.trim()).filter(Boolean);
  return ['/images/platzhalter.jpg'];
}

function getNameFromUrl(u: string): string {
  try {
    const p = new URL(u);
    const last = p.pathname.split('/').filter(Boolean).pop() || 'datei';
    return decodeURIComponent(last);
  } catch {
    const parts = u.split('/'); return decodeURIComponent(parts[parts.length - 1] || 'datei');
  }
}

function resolveDateien(d: any): DateiItem[] {
  const arr = d?.dateien;
  if (!arr) return [];
  if (Array.isArray(arr)) {
    if (!arr.length) return [];
    if (typeof arr[0] === 'string') {
      return (arr as string[]).filter(Boolean).map(url => ({ name: getNameFromUrl(url), url }));
    }
    return (arr as any[])
      .map((x) => {
        const url: string | undefined = x?.url || x?.href;
        const name: string | undefined = x?.name || x?.filename || (url ? getNameFromUrl(url) : undefined);
        return url ? { name: name || 'Datei', url } : null;
      })
      .filter(Boolean) as DateiItem[];
  }
  if (typeof arr === 'string' && arr.trim()) {
    return arr.split(',').map(s => s.trim()).filter(Boolean).map(url => ({ name: getNameFromUrl(url), url }));
  }
  return [];
}

function joinPlzOrt(plz?: any, ort?: any): string {
  const p = (plz ?? '').toString().trim();
  const o = (ort ?? '').toString().trim();
  return [p, o].filter(Boolean).join(' ') || o || '';
}

function deepFindFirst(obj: any, keyPred: (k: string) => boolean): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (keyPred(k)) return v;
    if (v && typeof v === 'object') {
      const inner = deepFindFirst(v, keyPred);
      if (inner !== undefined) return inner;
    }
  }
  return undefined;
}
function deepGetZip(obj: any): string {
  const v = deepFindFirst(obj, (k) => /^(zip|zipCode|postal_code|postalCode|plz|postleitzahl)$/i.test(k));
  return (v ?? '').toString().trim();
}
function deepGetCity(obj: any): string {
  const v = deepFindFirst(obj, (k) => /^(city|ort|town|stadt)$/i.test(k));
  return (v ?? '').toString().trim();
}
function extractPlzOrtFromText(s?: unknown): string {
  const text = (s ?? '').toString();
  if (!text) return '';
  const m = text.match(/(?:^|\b)(?:D[-\s])?(\d{4,5})\s+([A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß.\-\s]{2,}?)(?=,|$|\n)/);
  if (!m) return '';
  const zip = m[1].trim();
  const city = m[2].trim().replace(/\s+/g, ' ');
  return [zip, city].filter(Boolean).join(' ');
}
function deepGetLieferort(obj: any): string {
  const v = deepFindFirst(obj, (k) => /^(lieferort|lieferOrt)$/i.test(k));
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object') {
    const zip = deepGetZip(v);
    const city = deepGetCity(v);
    const joined = joinPlzOrt(zip, city);
    if (joined) return joined;
    const cand = (v as any).label || (v as any).value || '';
    if (typeof cand === 'string') {
      const fromLabel = extractPlzOrtFromText(cand);
      if (fromLabel) return fromLabel;
    }
    const fromJson = extractPlzOrtFromText(JSON.stringify(v));
    if (fromJson) return fromJson;
  }
  return '';
}
function deepGetAddressLike(obj: any): string {
  const v = deepFindFirst(obj, (k) => /adresse|address(Line)?|anschrift|lieferadresse|lieferAdresse|addr/i.test(k));
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  if (v && typeof v === 'object') {
    const zip = deepGetZip(v);
    const city = deepGetCity(v);
    const joined = joinPlzOrt(zip, city);
    if (joined) return joined;
    return JSON.stringify(v);
  }
  return '';
}
function resolveLieferort(obj: any): string {
  const direct = deepGetLieferort(obj);
  if (direct) return direct;
  const zip = deepGetZip(obj);
  const city = deepGetCity(obj);
  const joined = joinPlzOrt(zip, city);
  if (joined) return joined;
  const addrText = deepGetAddressLike(obj);
  const extracted = extractPlzOrtFromText(addrText);
  if (extracted) return extracted;
  return '';
}
function resolveGewerblich(d: any): boolean | undefined {
  return d?.istGewerblich != null ? toBool(d.istGewerblich)
    : d?.account_type != null ? String(d.account_type).toLowerCase() === 'business'
    : d?.gewerblich != null ? toBool(d.gewerblich)
    : undefined;
}
function clampRating(n: unknown): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : (typeof n === 'number' ? n : NaN);
  if (!isFinite(v)) return null;
  return Math.max(0, Math.min(5, v));
}
function intOrNull(n: unknown): number | null {
  const v = typeof n === 'string' ? parseInt(n, 10) : (typeof n === 'number' ? Math.round(n) : NaN);
  return isFinite(v) && v >= 0 ? v : null;
}
function resolveUserName(d: any): string | undefined {
  if (typeof d?.user === 'string' && d.user.trim()) return d.user.trim();
  const fullName = [d?.profile?.firstName, d?.profile?.lastName].filter(Boolean).join(' ').trim() || undefined;
  const candidates = [d?.user?.name, d?.account_name, d?.profile?.company, fullName, d?.username, d?.user_name]
    .filter((x) => typeof x === 'string' && x.trim()) as string[];
  return candidates[0];
}
function resolveUserRatingAvg(d: any): number | null {
  return clampRating(d?.user_rating_avg) ?? clampRating(d?.user_rating) ?? clampRating(d?.user?.ratingAvg) ?? clampRating(d?.user?.rating) ?? null;
}
function resolveUserRatingCount(d: any): number | null {
  return intOrNull(d?.user_rating_count) ?? intOrNull(d?.user?.ratingCount) ?? null;
}

/* === Anzeige-Helper (Variante 1): 'Alle' zeigen, wenn leer === */
const displayHersteller = (v?: string) => (v && v.trim() ? v : 'Alle');

/* === Neu: Robuster Listen-zu-Text Converter === */
function listToText(v: unknown): string {
  if (Array.isArray(v)) return (v as unknown[]).map(String).map(s => s.trim()).filter(Boolean).join(', ');
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean).join(', ');
  return '';
}

/* === Neu: Labels & Pretty-Helper für Anwendung/Oberfläche === */
const ANWENDUNG_LABELS: Record<string, string> = {
  innen: 'Innen',
  außen: 'Außen',
  aussen: 'Außen',
  industrie: 'Industrie',
  universal: 'Universal',
};

const OBERFLAECHE_LABELS: Record<string, string> = {
  glatt: 'Glatt',
  feinstruktur: 'Feinstruktur',
  grobstruktur: 'Grobstruktur',
};

function prettyLabel(val: unknown, labels: Record<string, string>) {
  const s = (val ?? '').toString().trim();
  if (!s) return '';
  const key = s.normalize('NFKC').toLowerCase();
  return labels[key] ?? (s.charAt(0).toUpperCase() + s.slice(1));
}
// === Resttage-Badge für "Lieferdatum bis" ===
function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ date }: { date: Date | null }) {
  if (!date) return null;

  const d = daysUntil(date);
  let text = '';
  if (d < 0) {
    text = `überfällig seit ${Math.abs(d)} Tag${Math.abs(d) === 1 ? '' : 'en'}`;
  } else if (d === 0) {
    text = 'heute';
  } else if (d === 1) {
    text = 'morgen';
  } else {
    text = `in ${d} Tagen`;
  }

  const variant =
    d < 0 ? styles.badgeDanger : d <= 3 ? styles.badgeWarn : styles.badgeOk;

  return (
    <span
      className={`${styles.badge} ${styles.deadline} ${variant}`}
      title={`Lieferfrist: ${date.toLocaleDateString('de-DE')}`}
      aria-label={`Lieferfrist ${text}`}
    >
      {text}
    </span>
  );
}


/* ===================== Mapping ===================== */

function mapItem(it: ApiItem): ArtikelView {
  const d = it.data || {};
  const bilder = resolveBilder(d, it.bilder);
  const lieferdatum = resolveLieferdatum(it);

  const sondereigenschaft =
    listToText(d.sondereffekte) || listToText(d.sondereigenschaft);

  const effekt = listToText(d.effekt);

  const istGewerblich = resolveGewerblich(d);
  const ort = (typeof it.ort === 'string' && it.ort.trim()) ? it.ort.trim() : resolveLieferort({ data: d, ...it });

  return {
    id: it.id,
    titel: d.titel || it.title || 'Unbenannt',
    bilder,
    lieferdatum,
    zustand: normZustand(d.zustand),
    hersteller: d.hersteller || '',
    menge: resolveMenge(d),
    ort,
    kategorie: normKategorie(d.kategorie),
    user: it.user || resolveUserName(d) || undefined,
    user_rating: typeof it.user_rating === 'number' ? clampRating(it.user_rating) : resolveUserRatingAvg(d),
    user_rating_count: typeof it.user_rating_count === 'number' ? intOrNull(it.user_rating_count) : resolveUserRatingCount(d),
    farbcode: d.farbcode || '',
    effekt,
    anwendung: prettyLabel(d.anwendung, ANWENDUNG_LABELS),
    oberfläche: prettyLabel(d.oberfläche ?? d.oberflaeche, OBERFLAECHE_LABELS),
    glanzgrad: d.glanzgrad || '',
    sondereigenschaft,
    beschreibung: d.beschreibung || '',
    gesponsert: Boolean(d.gesponsert),
    gewerblich: istGewerblich,
    privat: istGewerblich === false ? true : false,
    dateien: resolveDateien(d),
    farbpalette: d.farbpalette || '',
    farbton: d.farbton || '',
    qualität: d.qualität || d.qualitaet || '',
    zertifizierung: Array.isArray(d.zertifizierungen) ? d.zertifizierungen : [],
    aufladung: Array.isArray(d.aufladung) ? d.aufladung : [],
  };
}

/* ===================== Seite ===================== */

export default function ArtikelDetailPage() {
  const params = useParams() as { id?: string };
  const [artikel, setArtikel] = useState<ArtikelView | null>(null);
  const [loading, setLoading] = useState(true);
  const [preis, setPreis] = useState('');
  const [extraPreisVisible] = useState(false);
  const [extraPreis, setExtraPreis] = useState('');
  const [showFarbcodeHint, setShowFarbcodeHint] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const raw = params?.id;
    const id = raw ? decodeURIComponent(String(raw)) : '';
    if (!id) { setLoading(false); return; }

    (async () => {
      try {
        let view: ArtikelView | null = null;

        // Detail
        try {
          const res = await fetch(`/api/lackanfragen/${encodeURIComponent(id)}`, { cache: 'no-store' });
          if (res.ok) {
            const j = await res.json();
            const a = j?.artikel;
            if (a) {
              const sondereffekteText =
                listToText(a.sondereffekte) || listToText(a.sondereigenschaft);

              view = {
                id: a.id ?? id,
                titel: a.titel || a.title || 'Unbenannt',
                bilder: Array.isArray(a.bilder) ? a.bilder : [],
                lieferdatum: typeof a.lieferdatum === 'string' ? toDateOrNull(a.lieferdatum) : (a.lieferdatum ?? null),
                zustand: normZustand(a.zustand || ''),
                hersteller: a.hersteller || '',
                menge: typeof a.menge === 'number' ? a.menge : (a.menge ?? null),
                ort: typeof a.ort === 'string' ? a.ort : '',
                kategorie: a.kategorie || '',
                user: a.user || undefined,
                user_rating: a.user_rating ?? null,
                user_rating_count: a.user_rating_count ?? null,
                farbcode: a.farbcode || '',
                effekt: listToText(a.effekt),
                anwendung: prettyLabel(a.anwendung, ANWENDUNG_LABELS),
                oberfläche: prettyLabel(a.oberfläche ?? a.oberflaeche, OBERFLAECHE_LABELS),
                glanzgrad: a.glanzgrad || '',
                sondereigenschaft: sondereffekteText,
                beschreibung: a.beschreibung || '',
                gesponsert: !!a.gesponsert,
                gewerblich: !!a.gewerblich,
                privat: !!a.privat,
                dateien: Array.isArray(a.dateien) ? a.dateien : [],
                farbpalette: a.farbpalette || '',
                farbton: a.farbton || '',
                qualität: a.qualität || a.qualitaet || '',
                zertifizierung: Array.isArray(a.zertifizierung) ? a.zertifizierung : [],
                aufladung: Array.isArray(a.aufladung) ? a.aufladung : [],
              };
            }
          }
        } catch {}

        // Liste zum Auffüllen
        try {
          const resList = await fetch('/api/lackanfragen?limit=200', { cache: 'no-store' });
          if (resList.ok) {
            const json = await resList.json();
            const items: ApiItem[] = json?.items || [];
            const found = items.find((x) => String(x.id) === id);
            if (found) {
              const mapped = mapItem(found);
              if (view) {
                if (!view.user) view.user = mapped.user;
                if (view.user_rating == null) view.user_rating = mapped.user_rating;
                if (view.user_rating_count == null) view.user_rating_count = mapped.user_rating_count;
                if (!view.ort) view.ort = mapped.ort;
                if (!view.bilder?.length) view.bilder = mapped.bilder;
                if (!view.sondereigenschaft) view.sondereigenschaft = mapped.sondereigenschaft;
                if (!view.effekt) view.effekt = mapped.effekt;
                if (!view.anwendung) view.anwendung = mapped.anwendung;
                if (!view.oberfläche) view.oberfläche = mapped.oberfläche;
              } else {
                view = mapped;
              }
            }
          }
        } catch {}

        if (active) setArtikel(view);
      } catch {
        if (active) setArtikel(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [params?.id]);

  const slides = useMemo(
    () => (artikel?.bilder || []).map((src: string) => ({ src })),
    [artikel?.bilder]
  );

  // ===== Loading-Zustand: nur TopLoader + Skeleton unter der Navbar
  if (loading) {
    return (
      <>
        <Navbar />
        <TopLoader />
        <div className={styles.container}>
          <DetailSkeleton />
        </div>
      </>
    );
  }

  if (!artikel) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <h1>Keine Lackanfrage gefunden</h1>
          <p>Die angeforderte Anfrage existiert nicht (mehr) oder ist nicht veröffentlicht.</p>
          <Link href="/lackanfragen" className={styles.kontaktLink}>
            Zurück zur Börse
          </Link>
        </div>
      </>
    );
  }

  const ratingValue = typeof artikel.user_rating === 'number' ? artikel.user_rating : 0;
  const ratingCount = typeof artikel.user_rating_count === 'number' ? artikel.user_rating_count : 0;

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Linke Spalte: Bilder */}
          <div className={styles.leftColumn}>
            <img
              src={artikel.bilder?.[photoIndex] || '/images/platzhalter.jpg'}
              alt={artikel.titel}
              className={styles.image}
              onClick={() => setLightboxOpen(true)}
              style={{ cursor: 'pointer' }}
            />
            <div className={styles.thumbnails}>
              {(artikel.bilder || []).map((bild, i) => (
                <img
                  key={i}
                  src={bild}
                  alt={`Bild ${i + 1}`}
                  className={`${styles.thumbnail} ${i === photoIndex ? styles.activeThumbnail : ''}`}
                  onClick={() => setPhotoIndex(i)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>

          {/* Rechte Spalte: Infos */}
          <div className={styles.rightColumn}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{artikel.titel}</h1>
              {artikel.gesponsert && (
                <span className={`${styles.badge} ${styles.gesponsert}`}>Gesponsert</span>
              )}
            </div>

            {/* === META-GRID === */}
            <div className={styles.meta}>
              
              <div className={styles.metaItem1}>
                <span className={styles.label}>Lieferdatum bis:</span>
                <span className={styles.value}>
                  {artikel.lieferdatum ? artikel.lieferdatum.toLocaleDateString('de-DE') : '—'}
                </span>
                <DeadlineBadge date={artikel.lieferdatum} />
              </div>

              {typeof artikel.menge === 'number' && (
                <div className={styles.metaItem1}>
                  <span className={styles.label}>Benötigte Menge:</span>
                  <span className={styles.value}>{formatKg(artikel.menge)}</span>
                  {/* oder ganz simpel: <span className={styles.value}>{artikel.menge} kg</span> */}
                </div>
              )}


              {artikel.kategorie && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Kategorie:</span>
                  <span className={styles.value}>{artikel.kategorie}</span>
                </div>
              )}

              {artikel.farbpalette && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Farbpalette:</span>
                  <span className={styles.value}>{artikel.farbpalette}</span>
                </div>
              )}
              {artikel.farbton && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Farbtonbez.:</span>
                  <span className={styles.value}>{artikel.farbton}</span>
                </div>
              )}
              {artikel.oberfläche && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Oberfläche:</span>
                  <span className={styles.value}>{artikel.oberfläche}</span>
                </div>
              )}

              {artikel.glanzgrad && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Glanzgrad:</span>
                  <span className={styles.value}>{artikel.glanzgrad}</span>
                </div>
              )}
              {artikel.anwendung && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Anwendung:</span>
                  <span className={styles.value}>{artikel.anwendung}</span>
                </div>
              )}
              <div className={styles.metaItem}>
                <span className={styles.label}>Hersteller:</span>
                <span className={styles.value}>{displayHersteller(artikel.hersteller)}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.label}>Farbcode:</span>
                <span className={styles.value}>{artikel.farbcode || '—'}</span>

                
              </div>
              {artikel.qualität && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Qualität:</span>
                  <span className={styles.value}>{artikel.qualität}</span>
                </div>
              )}

              {artikel.zertifizierung && artikel.zertifizierung.length > 0 && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Zertifizierung:</span>
                  <span className={styles.value}>{artikel.zertifizierung.join(', ')}</span>
                </div>
              )}

              {artikel.aufladung && artikel.aufladung.length > 0 && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Aufladung:</span>
                  <span className={styles.value}>{artikel.aufladung.join(', ')}</span>
                </div>
              )}

              {artikel.user && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>User:</span>
                  <span className={styles.value}>{artikel.user}</span>

                  <div className={styles.userRating} style={{ marginTop: 6 }}>
                    {ratingCount > 0
                      ? <>Bewertung: {ratingValue.toFixed(1)}/5 · {ratingCount} Bewertung{ratingCount === 1 ? '' : 'en'}</>
                      : <>Bewertung: Noch keine Bewertungen</>}
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <Link
                      href={`/messages?empfaenger=${encodeURIComponent(artikel.user)}`}
                      className={styles.kontaktLink}
                    >
                      User kontaktieren
                    </Link>
                  </div>
                </div>
              )}
              <div className={styles.metaItem1}>
                <span className={styles.label}>Lieferort:</span>
                <span className={styles.value}>{artikel.ort || '—'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.label}>Benötigter Zustand:</span>
                <span className={styles.value}>{artikel.zustand || '—'}</span>
              </div>
              

              {artikel.effekt && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Effekt:</span>
                  <span className={styles.value}>{artikel.effekt}</span>
                </div>
              )}

              {artikel.sondereigenschaft && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Sondereffekte:</span>
                  <span className={styles.value}>{artikel.sondereigenschaft}</span>
                </div>
              )}
              {artikel.dateien && artikel.dateien.length > 0 && (
                <div className={styles.metaItem}>
                  <span className={styles.label}>Downloads:</span>
                  <ul className={styles.downloadList}>
                    {artikel.dateien.map((file, i) => (
                      <li key={i} className={styles.downloadItem}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.downloadLink}
                        >
                          <FaFilePdf style={{ color: 'red', marginRight: '0.4rem' }} />
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* === /META-GRID === */}

            {/* Beschreibung */}
            {artikel.beschreibung && (
                <div className={styles.beschreibung}>
                  <h2>Beschreibung zur Anfrage:</h2>
                  <p className={styles.preserveNewlines}>{artikel.beschreibung}</p>
                </div>
              )}


            <div className={styles.badges}>
              {artikel.gewerblich && (
                <span className={`${styles.badge} ${styles.gewerblich}`}>Gewerblich</span>
              )}
              {artikel.privat && (
                <span className={`${styles.badge} ${styles.privat}`}>Privat</span>
              )}
            </div>

            <div className={styles.offerBox}>
              <div className={styles.inputGroup}>
                Preis inkl. Versand:
                <input
                  type="number"
                  value={preis}
                  onChange={(e) => setPreis(e.target.value)}
                  className={styles.priceField}
                  placeholder="Preis (€)"
                />

                {extraPreisVisible && (
                  <input
                    type="number"
                    value={extraPreis}
                    onChange={(e) => setExtraPreis(e.target.value)}
                    className={styles.altPriceField}
                    placeholder="Preis inkl. Versand (€)"
                  />
                )}
              </div>

              <button className={styles.submitOfferButton}>Lack verbindlich anbieten</button>
              <p className={styles.offerNote}>
                Mit der Angebotsabgabe bestätigst du, die Anforderungen zur Gänze erfüllen zu können. Dein Angebot ist 72h gültig. Halte nach dem Versand bitte unbedingt stets einen Zustellnachweis bereit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {slides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={slides}
          index={photoIndex}
          plugins={[Thumbnails]}
          thumbnails={{ vignette: true }}
          on={{ view: ({ index }) => setPhotoIndex(index) }}
        />
      )}
    </>
  );
}
