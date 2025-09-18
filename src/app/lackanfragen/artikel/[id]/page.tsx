'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './ArtikelDetail.module.css';
import Navbar from '../../../components/navbar/Navbar';
import { FaFilePdf } from 'react-icons/fa';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { LocalToastProvider, useLocalToast } from '../../../components/ui/local-toast';

/* ===================== Typen ===================== */
type ApiItem = {
  id: string;
  title?: string | null;
  lieferdatum?: string | null;
  delivery_at?: string | null;
  status?: string | null;
  published?: boolean | string | number | null;
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

  /* === NEU (optional, rückwärtskompatibel) === */
  user_handle?: string | null;
};

type ConnectStatus = { ready: boolean; reason?: string | null; mode?: 'test' | 'live' };

/* ===================== Loader / Skeleton ===================== */
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
        <div className={styles.skelDrop} />
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

/* ===================== Helfer ===================== */
const toBool = (v: unknown): boolean =>
  typeof v === 'boolean'
    ? v
    : typeof v === 'string'
    ? ['1', 'true', 'yes', 'ja', 'wahr'].includes(v.toLowerCase())
    : typeof v === 'number'
    ? v !== 0
    : !!v;

function toDateOrNull(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function formatKg(n?: number | null): string {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
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
  if (v.includes('geöffnet') || v.includes('geoeffnet') || v.includes('offen'))
    return 'Geöffnet und einwandfrei';
  return z || '';
}
function resolveLieferdatum(it: ApiItem): Date | null {
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
    if (typeof b[0] === 'object' && (b[0] as any)?.url)
      return (b as Array<{ url: string }>).map((x) => x.url).filter(Boolean);
  }
  if (typeof b === 'string' && b.trim()) return b.split(',').map((s) => s.trim()).filter(Boolean);
  return ['/images/platzhalter.jpg'];
}
function getNameFromUrl(u: string): string {
  try {
    const p = new URL(u);
    const last = p.pathname.split('/').filter(Boolean).pop() || 'datei';
    return decodeURIComponent(last);
  } catch {
    const parts = u.split('/');
    return decodeURIComponent(parts[parts.length - 1] || 'datei');
  }
}
function resolveDateien(d: any): DateiItem[] {
  const arr = d?.dateien;
  if (!arr) return [];
  if (Array.isArray(arr)) {
    if (!arr.length) return [];
    if (typeof arr[0] === 'string') {
      return (arr as string[]).filter(Boolean).map((url) => ({ name: getNameFromUrl(url), url }));
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
    return arr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url) => ({ name: getNameFromUrl(url), url }));
  }
  return [];
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
function joinPlzOrt(plz?: any, ort?: any): string {
  const p = (plz ?? '').toString().trim();
  const o = (ort ?? '').toString().trim();
  return [p, o].filter(Boolean).join(' ') || o || '';
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
  return d?.istGewerblich != null
    ? toBool(d.istGewerblich)
    : d?.account_type != null
    ? String(d.account_type).toLowerCase() === 'business'
    : d?.gewerblich != null
    ? toBool(d.gewerblich)
    : undefined;
}
function clampRating(n: unknown): number | null {
  const v = typeof n === 'string' ? parseFloat(n) : typeof n === 'number' ? n : NaN;
  if (!isFinite(v)) return null;
  return Math.max(0, Math.min(5, v));
}
function intOrNull(n: unknown): number | null {
  const v = typeof n === 'string' ? parseInt(n, 10) : typeof n === 'number' ? Math.round(n) : NaN;
  return isFinite(v) && v >= 0 ? v : null;
}
function resolveUserName(d: any): string | undefined {
  if (typeof d?.user === 'string' && d.user.trim()) return d.user.trim();
  const fullName = [d?.profile?.firstName, d?.profile?.lastName].filter(Boolean).join(' ').trim() || undefined;
  const candidates = [d?.user?.name, d?.account_name, d?.profile?.company, fullName, d?.username, d?.user_name]
    .filter((x) => typeof x === 'string' && x.trim()) as string[];
  return candidates[0];
}
function listToText(v: unknown): string {
  if (Array.isArray(v)) return (v as unknown[]).map(String).map((s) => s.trim()).filter(Boolean).join(', ');
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean).join(', ');
  return '';
}
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
function daysUntil(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime()) - (today.getTime())) / (1000 * 60 * 60 * 24);
}
function DeadlineBadge({ date }: { date: Date | null }) {
  if (!date) return null;
  const d = daysUntil(date);
  let text = '';
  if (d < 0) text = `abgeschlossen seit ${Math.abs(d)} Tag${Math.abs(d) === 1 ? '' : 'en'}`;
  else if (d === 0) text = 'heute';
  else if (d === 1) text = 'morgen';
  else text = `in ${d} Tagen`;
  const variant = d < 0 ? styles.badgeDanger : d <= 3 ? styles.badgeWarn : styles.badgeOk;
  return (
    <span
      className={`${styles.badge} ${styles.deadline} ${variant}`}
      title={`Lieferfrist: ${date?.toLocaleDateString('de-DE')}`}
      aria-label={`Lieferfrist ${text}`}
    >
      {text}
    </span>
  );
}

/* === Preis-/Eingabe-Helper === */
function limitMoneyInput(raw: string): string {
  let v = (raw || '').replace(/[^\d.,]/g, '');
  const firstSep = v.search(/[.,]/);
  if (firstSep === -1) {
    return v.replace(/\D/g, '').slice(0, 5);
  }
  const sepChar = v[firstSep];
  const intPart = v.slice(0, firstSep).replace(/\D/g, '').slice(0, 5);
  const fracDigits = v.slice(firstSep + 1).replace(/\D/g, '').slice(0, 2);
  return `${intPart}${sepChar}${fracDigits}`;
}
// erlaubt 1-5 Stellen vor dem Komma und 0-2 Nachkommastellen (ganze Zahlen OK)
const MONEY_REGEX_FINAL = /^\d{1,5}([.,]\d{0,2})?$/;

// Versandkosten max. 50% vom Artikelpreis
const MAX_SHIP_RATIO = 0.5;

function toNum(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? 0 : n;
}
function formatEUR(n: number): string {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

/* ===== Fehlermeldungen hübsch machen ===== */
function friendlyErr(raw: unknown): string {
  const txt = String(raw || '').trim();
  if (!txt) return 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.';
  const lc = txt.toLowerCase();
  if (/[äöüß]/i.test(txt) || /anfrage|angebot|du kannst|nicht|bereits|fehl(er)?/i.test(txt)) return txt;
  if (lc.includes('already_offered') || lc.includes('already offered')) return 'Du hast zu dieser Anfrage bereits ein Angebot abgegeben.';
  if (lc.includes('not authenticated')) return 'Bitte melde dich an.';
  if (lc.includes('anfrage nicht gefunden') || lc.includes('request not found')) return 'Anfrage nicht gefunden.';
  if (lc.includes('anfrage ist nicht verfügbar') || lc.includes('request status')) return 'Diese Anfrage ist nicht mehr verfügbar.';
  if (lc.includes('itemamountcents invalid') || lc.includes('item_amount_cents')) return 'Bitte einen gültigen Artikelpreis angeben.';
  if (lc.includes('shippingcents invalid') || lc.includes('shipping_cents')) return 'Bitte gültige Versandkosten angeben (oder 0).';
  if (lc.includes('shipping_too_high') || lc.includes('shipping too high')) return 'Versandkosten dürfen max. 50% des Artikelpreises betragen.';
  return txt;
}

/* ===== (NEU) Handle/Reviews-Helper ===== */
const HANDLE_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,30}[A-Za-z0-9])?$/; // 2–32 Zeichen, start/end alnum
const looksLikeHandle = (s?: string | null) => !!(s && HANDLE_RE.test(s.trim()));

function resolveUserHandle(d: any, it?: ApiItem): string | null {
  const cand: Array<unknown> = [
    d?.user?.handle,
    d?.user?.username,
    d?.user?.nick,
    d?.user?.slug,
    d?.owner?.handle,
    d?.owner?.username,
    d?.owner?.slug,
    d?.anbieter?.handle,
    d?.anbieter?.username,
    d?.vendor?.handle,
    d?.vendor?.username,
    d?.account?.handle,
    it?.user, // falls it.user bereits ein Handle ist
    d?.username,
    d?.user_name,
  ];
  for (const c of cand) {
    const s = typeof c === 'string' ? c.trim() : '';
    if (looksLikeHandle(s)) return s;
  }
  return null;
}

function profileReviewsHrefFromView(a: { user?: string; user_handle?: string | null } | null): string | undefined {
  if (!a) return undefined;
  if (looksLikeHandle(a.user_handle || '')) return `/u/${a.user_handle}/reviews`;
  if (looksLikeHandle(a.user)) return `/u/${a.user}/reviews`;
  return undefined;
}

/* ===== Detail -> ApiItem normalisieren ===== */
function toApiItemFromDetail(a: any, id: string): ApiItem {
  return {
    id: a?.id ?? id,
    title: a?.titel || a?.title || null,
    lieferdatum: typeof a?.lieferdatum === 'string' ? a.lieferdatum : (typeof a?.delivery_at === 'string' ? a.delivery_at : null),
    delivery_at: typeof a?.delivery_at === 'string' ? a.delivery_at : null,
    published: a?.published ?? a?.is_published ?? null,
    data: a?.data ?? a ?? {},
    ort: typeof a?.ort === 'string' ? a.ort : undefined,
    bilder: Array.isArray(a?.bilder) ? a.bilder : undefined,
    user: typeof a?.user === 'string' ? a.user : undefined,
    user_rating: typeof a?.user_rating === 'number' ? a.user_rating : null,
    user_rating_count: typeof a?.user_rating_count === 'number' ? a.user_rating_count : null,
    status: typeof a?.status === 'string' ? a.status : null,
  };
}

/* ===== List-Fallback ===== */
async function findByIdViaList(id: string): Promise<ApiItem | null> {
  const directCandidates = [
    `/api/lackanfragen?id=${encodeURIComponent(id)}&includeUnpublished=1`,
    `/api/lackanfragen?ids=${encodeURIComponent(id)}&includeUnpublished=1`,
    `/api/lackanfragen?q=${encodeURIComponent(id)}&includeUnpublished=1`,
    `/api/lackanfragen?search=${encodeURIComponent(id)}&includeUnpublished=1`,
  ];
  for (const url of directCandidates) {
    try {
      const r = await fetch(url, { cache: 'no-store', credentials: 'include' });
      if (!r.ok) continue;
      const json = await r.json().catch(() => ({}));
      const items: any = json?.items ?? json;
      const arr: ApiItem[] = Array.isArray(items) ? items : [];
      const found = arr.find((x) => String(x.id) === id);
      if (found) return found;
    } catch {}
  }

  const LIMIT = 200;
  const MAX = 1200;
  const pagers = ['offset', 'page', 'skip', 'start'] as const;

  for (const pager of pagers) {
    for (let i = 0; i < MAX; i += LIMIT) {
      const value = pager === 'page' ? i / LIMIT + 1 : i;
      const url = `/api/lackanfragen?limit=${LIMIT}&${pager}=${value}&includeUnpublished=1`;
      try {
        const r = await fetch(url, { cache: 'no-store', credentials: 'include' });
        if (!r.ok) break;
        const json = await r.json().catch(() => ({}));
        const items: any = json?.items ?? json;
        const arr: ApiItem[] = Array.isArray(items) ? items : [];
        if (!arr.length) break;
        const found = arr.find((x) => String(x.id) === id);
        if (found) return found;
        if (arr.length < LIMIT) break;
      } catch {
        break;
      }
    }
  }

  try {
    const r = await fetch(`/api/lackanfragen?limit=10000&includeUnpublished=1`, { cache: 'no-store', credentials: 'include' });
    if (r.ok) {
      const json = await r.json().catch(() => ({}));
      const items: any = json?.items ?? json;
      const arr: ApiItem[] = Array.isArray(items) ? items : [];
      const found = arr.find((x) => String(x.id) === id);
      if (found) return found;
    }
  } catch {}

  return null;
}

/* ===================== Seite ===================== */
function PageBody() {
  const { id: rawParam } = useParams<{ id?: string }>();
  const [artikel, setArtikel] = useState<ArtikelView | null>(null);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useLocalToast();

  // Preis-States
  const [basisPreis, setBasisPreis] = useState('');
  const [versandPreis, setVersandPreis] = useState('');
  const [buyerPaysReturn, setBuyerPaysReturn] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [vermittelt, setVermittelt] = useState(false);

  // Connect (Stripe) Status
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectLoaded, setConnectLoaded] = useState(false);

  const requestId = rawParam ? decodeURIComponent(String(rawParam)) : '';

  useEffect(() => {
    let active = true;

    const id = requestId;
    if (!id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        let view: ArtikelView | null = null;
        let vermitteltFlag = false;

        // Detail laden (inkl. unveröffentlicht)
        try {
          const res = await fetch(`/api/lackanfragen/${encodeURIComponent(id)}?includeUnpublished=1`, {
            cache: 'no-store',
            credentials: 'include',
          });
          if (res.ok) {
            const j = await res.json().catch(() => null as any);
            const a = j?.artikel ?? j?.request ?? j?.item ?? j;
            if (a && (a.id || a.data)) {
              const apiItem = toApiItemFromDetail(a, id);
              vermitteltFlag = apiItem.published != null ? !toBool(apiItem.published) : false;
              view = mapItem(apiItem);
            }
          }
        } catch {}

        // Fallback: Liste durchsuchen
        if (!view) {
          const found = await findByIdViaList(id);
          if (found) {
            vermitteltFlag = found.published != null ? !toBool(found.published) : false;
            view = mapItem(found);
          }
        }

        if (active) {
          setArtikel(view);
          setVermittelt(vermitteltFlag);
        }
      } catch (e: any) {
        if (active) {
          setArtikel(null);
          const msg = friendlyErr(e?.message);
          if (msg) toastError(msg);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [requestId, toastError]);

  // Connect-Status laden (stabil, ohne Flackern)
  const fetchConnect = useCallback(async () => {
    try {
      const r = await fetch('/api/connect/status', { cache: 'no-store', credentials: 'include' });
      const j: ConnectStatus = await r.json().catch(() => ({ ready: false }));
      setConnect(r.ok ? j : { ready: false });
    } finally {
      setConnectLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchConnect();
  }, [fetchConnect]);

  // Beim Zurückkehren/Focus Status erneut prüfen (Banner bleibt sichtbar während des Fetch)
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

  const slides = useMemo(() => (artikel?.bilder || []).map((src: string) => ({ src })), [artikel?.bilder]);
  const gesamtPreis = useMemo(() => {
    const p = (basisPreis || '').replace(/\s/g, '');
    const s = (versandPreis || '').replace(/\s/g, '');
    return toNum(p) + toNum(s || '0');
  }, [basisPreis, versandPreis]);

  // --- 50%-Regel (live) ---
  const shippingCap = useMemo(() => {
    const base = toNum((basisPreis || '').replace(/\s/g, ''));
    return Math.max(0, base * MAX_SHIP_RATIO);
  }, [basisPreis]);

  const shippingTooHigh = useMemo(() => {
    const ship = toNum((versandPreis || '').replace(/\s/g, ''));
    return ship > shippingCap + 1e-9;
  }, [versandPreis, shippingCap]);

  // Onboarding starten – ohne Auswahl privat/gewerblich
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
      toastError(friendlyErr(e?.message));
    }
  }, [toastError]);

  async function handleSubmitOffer() {
    if (submitting) return;

    const baseStr = (basisPreis || '').replace(/\s/g, '');
    const shipStr = (versandPreis || '').replace(/\s/g, '');

    if (!MONEY_REGEX_FINAL.test(baseStr)) {
      toastError('Bitte einen gültigen Artikelpreis eingeben (bis 5 Stellen vor dem Komma und max. 2 Nachkommastellen).');
      return;
    }
    if (shipStr && !MONEY_REGEX_FINAL.test(shipStr)) {
      toastError('Bitte gültige Versandkosten eingeben (oder 0).');
      return;
    }
    if (!artikel?.id) {
      toastError('Artikel-/Request-ID fehlt.');
      return;
    }

    const priceBase = toNum(baseStr);
    const shipping = shipStr ? toNum(shipStr) : 0;

    if (priceBase <= 0) {
      toastError('Artikelpreis muss größer 0 sein.');
      return;
    }
    const maxShip = priceBase * MAX_SHIP_RATIO;
    if (shipping > maxShip + 1e-9) {
      toastError(
        `Versandkosten (${formatEUR(shipping)}) dürfen max. 50% des Artikelpreises (${formatEUR(priceBase)}) sein – ` +
          `maximal erlaubt: ${formatEUR(maxShip)}.`
      );
      return;
    }

    // Connect-Ready prüfen
    try {
      const stRes = await fetch('/api/connect/status', { cache: 'no-store', credentials: 'include' });
      const st: ConnectStatus = await stRes.json().catch(() => ({ ready: false }));
      if (!stRes.ok) {
        toastError('Dein Anbieter-Status konnte nicht geprüft werden. Bitte erneut versuchen.');
        return;
      }
      if (!st.ready) {
        await goToStripeOnboarding();
        return;
      }
    } catch {
      toastError('Dein Anbieter-Status konnte nicht geprüft werden.');
      return;
    }

    const itemCents = Math.round(priceBase * 100);
    const shipCents = Math.round(shipping * 100);
    const total = priceBase + shipping;

    const description =
      `Artikelpreis: ${formatEUR(priceBase)}; ` +
      `Versand: ${formatEUR(shipping)}; ` +
      `Gesamt: ${formatEUR(total)}; ` +
      `Rückversand zahlt ${buyerPaysReturn ? 'Käufer' : 'Verkäufer'}.`;

    // Payload kompatibel zu alter/neuer Route
    const payload = {
      itemAmountCents: itemCents,
      shippingCents: shipCents,
      item_amount_cents: itemCents,
      shipping_cents: shipCents,
      currency: 'eur',
      message: description,
      buyerPaysReturn,
    };

    setSubmitting(true);
    try {
      const res = await fetch(`/api/lack/requests/${encodeURIComponent(String(artikel.id))}/offer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        const field = (j?.field || j?.error_field || '').toString().toLowerCase();
        if (field.includes('item') && field.includes('cent')) throw new Error('Bitte einen gültigen Artikelpreis angeben.');
        if (field.includes('shipping') && field.includes('cent')) {
          if ((j?.error || '').toString().toUpperCase().includes('SHIPPING_TOO_HIGH')) {
            throw new Error('Versandkosten dürfen max. 50% des Artikelpreises betragen.');
          }
          throw new Error('Bitte gültige Versandkosten angeben (oder 0).');
        }
        const raw = j?.error || j?.message || '';
        throw new Error(friendlyErr(raw || 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.'));
      }

      success('Angebot gesendet.');
      setBasisPreis('');
      setVersandPreis('');
      setBuyerPaysReturn(true);
    } catch (e: any) {
      console.debug('[offer] failed', e?.message);
      toastError(friendlyErr(e?.message));
    } finally {
      setSubmitting(false);
    }
  }

  // ===== Loading
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
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'block',
              marginTop: 16,
              padding: '16px 20px',
              border: '2px solid #d9d9d9',
              background: '#fafafa',
              color: '#444',
              fontWeight: 600,
              textAlign: 'center',
              borderRadius: 12,
            }}
          >
            Details konnten nicht geladen werden.
          </div>
          <Link href="/lackanfragen" className={styles.kontaktLink} style={{ marginTop: 12, display: 'inline-block' }}>
            Zurück zur Börse
          </Link>
        </div>
      </>
    );
  }

  const ratingValue = typeof artikel.user_rating === 'number' ? artikel.user_rating : 0;
  const ratingCount = typeof artikel.user_rating_count === 'number' ? artikel.user_rating_count : 0;

  /* === NEU: Reviews-/Kontakt-Links berechnen (UI-only) === */
  const reviewsHref = profileReviewsHrefFromView(artikel);
  const messageTarget = encodeURIComponent(artikel.user_handle || artikel.user || '');

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
              {artikel.gesponsert && <span className={`${styles.badge} ${styles.gesponsert}`}>Gesponsert</span>}
            </div>

            {/* Hinweis Onboarding – stabil sichtbar wenn not ready */}
            {connectLoaded && connect?.ready === false && (
              <div className={styles.connectNotice} role="status" aria-live="polite">
                <p>Um Auszahlungen empfangen zu können, musst du ein Auszahlungsprofil bei Stripe anlegen.</p>

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
                <span className={styles.value}>{(artikel.hersteller && artikel.hersteller.trim()) || 'Alle'}</span>
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
                  <span className={styles.value}>
                    {reviewsHref ? (
                      <Link href={reviewsHref} className={styles.kontaktLink} title="Zu den Bewertungen">
                        {artikel.user}
                      </Link>
                    ) : (
                      artikel.user
                    )}
                  </span>

                  <div className={styles.userRating} style={{ marginTop: 6 }}>
                    {ratingCount > 0 ? (
                      <>
                        Bewertung: {ratingValue.toFixed(1)}/5 · {ratingCount} Bewertung{ratingCount === 1 ? '' : 'en'}
                      </>
                    ) : (
                      <>Bewertung: Noch keine Bewertungen</>
                    )}
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <Link href={`/messages?empfaenger=${messageTarget}`} className={styles.kontaktLink}>
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
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.downloadLink}>
                          <FaFilePdf style={{ marginRight: '0.4rem' }} />
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
              {artikel.gewerblich && <span className={`${styles.badge} ${styles.gewerblich}`}>Gewerblich</span>}
              {artikel.privat && <span className={`${styles.badge} ${styles.privat}`}>Privat</span>}
            </div>

            {/* === Angebotsbereich === */}
            {vermittelt ? (
              <div
                className={styles.patchVermittelt}
                role="status"
                aria-live="polite"
                style={{
                  display: 'block',
                  marginTop: 16,
                  padding: '16px 20px',
                  border: '3px solid #52c41a',
                  background: '#f6ffed',
                  color: '#135200',
                  fontWeight: 700,
                  textAlign: 'center',
                  borderRadius: 14,
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,.06)',
                }}
              >
                <strong>Anfrage erfolgreich vermittelt</strong>
              </div>
            ) : (
              <div className={styles.offerBox}>
                <div className={styles.inputGroup}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Artikelpreis in € (ohne Versand)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^\d{1,5}([.,]\d{1,2})?$"
                    maxLength={8}
                    value={basisPreis}
                    onChange={(e) => setBasisPreis(limitMoneyInput(e.target.value))}
                    className={styles.priceField}
                    placeholder="z. B. 120,00"
                    aria-label="Artikelpreis ohne Versand"
                  />
                </div>

                <div className={styles.inputGroup} style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                    Versandkosten in € (separat)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^\d{1,5}([.,]\d{1,2})?$"
                    maxLength={8}
                    value={versandPreis}
                    onChange={(e) => setVersandPreis(limitMoneyInput(e.target.value))}
                    className={styles.altPriceField}
                    placeholder="z. B. 6,90"
                    aria-label="Versandkosten separat"
                  />
                  <div className={styles.offerNote} style={{ marginTop: 6 }}>
                    Versandkosten werden separat ausgewiesen. Falls Versandkosten anfallen, muss der Käufer ggf. für den
                    Rückversand aufkommen.
                  </div>
                  <div className={styles.offerNote} style={{ marginTop: 6 }}>
                    Maximal zulässig: <strong>{formatEUR(shippingCap)}</strong> (50% des Artikelpreises).
                    {shippingTooHigh && (
                      <span
                        role="alert"
                        aria-live="polite"
                        style={{ marginLeft: 8, color: '#d4380d', fontWeight: 600 }}
                      >
                        Überschreitung!
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.totalRow} style={{ marginTop: 12, fontWeight: 700 }}>
                  Gesamt (inkl. Versand): {formatEUR(gesamtPreis)}
                </div>

                <button
                  className={styles.submitOfferButton}
                  onClick={handleSubmitOffer}
                  disabled={submitting || shippingTooHigh}
                  aria-busy={submitting}
                  title={shippingTooHigh ? 'Versandkosten überschreiten 50% des Artikelpreises' : 'Lack verbindlich anbieten'}
                >
                  {submitting ? 'Wird gesendet…' : 'Lack verbindlich anbieten'}
                </button>

                <p className={styles.offerNote}>
                  Mit der Angebotsabgabe bestätigst du, die Anforderungen zur Gänze erfüllen zu können. Dein Angebot ist
                  72&nbsp;h gültig. Halte nach dem Versand bitte unbedingt stets einen Zustellnachweis bereit.
                </p>

                <p className={styles.offerNote} style={{ marginTop: 6 }}>
                  <strong>Wichtig:</strong> Die Versandkosten sind separat ausgewiesen. Im Falle einer Rückabwicklung
                  trägt der Käufer ggf. die Kosten für den Rückversand.
                </p>
              </div>
            )}
            {/* === /Angebotsbereich === */}
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

export default function Page() {
  return (
    <LocalToastProvider>
      <PageBody />
    </LocalToastProvider>
  );
}

/* ===================== Mapper (unten, damit oben lesbarer) ===================== */
function mapItem(it: ApiItem): ArtikelView {
  const d = it.data || {};
  const bilder = resolveBilder(d, it.bilder);
  const lieferdatum = resolveLieferdatum(it);
  const sondereigenschaft = listToText(d.sondereffekte) || listToText(d.sondereigenschaft);
  const effekt = listToText(d.effekt);
  const istGewerblich = resolveGewerblich(d);
  const ort = (typeof it.ort === 'string' && it.ort.trim()) ? it.ort.trim() : resolveLieferort({ data: d, ...it });

  /* === NEU: Handle zusätzlich ermitteln (ohne bestehende Logik zu ändern) === */
  const user_handle = resolveUserHandle(d, it);

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
    user_rating: typeof it.user_rating === 'number' ? clampRating(it.user_rating) : clampRating(d?.user_rating ?? d?.user?.rating),
    user_rating_count: typeof it.user_rating_count === 'number' ? intOrNull(it.user_rating_count) : intOrNull(d?.user?.ratingCount),
    farbcode: d.farbcode || '',
    effekt,
    anwendung: prettyLabel(d.anwendung, ANWENDUNG_LABELS),
    oberfläche: prettyLabel(d.oberfläche ?? (d as any).oberflaeche, OBERFLAECHE_LABELS),
    glanzgrad: d.glanzgrad || '',
    sondereigenschaft,
    beschreibung: d.beschreibung || '',
    gesponsert: Boolean(d.gesponsert),
    gewerblich: istGewerblich,
    privat: istGewerblich === false ? true : false,
    dateien: resolveDateien(d),
    farbpalette: d.farbpalette || '',
    farbton: d.farbton || '',
    qualität: (d as any).qualität || (d as any).qualitaet || '',
    zertifizierung: Array.isArray(d.zertifizierungen) ? d.zertifizierungen : [],
    aufladung: Array.isArray(d.aufladung) ? d.aufladung : [],

    /* === NEU: nur Zusatzfeld, rest unverändert === */
    user_handle,
  };
}
