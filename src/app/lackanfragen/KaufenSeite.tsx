// ./src/app/lackanfragen/KaufenSeite.tsx
// -----------------------------------------------------
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import styles from './auftragsboerse.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelCard';

/* ===================== Filterlisten ===================== */

const kategorien = ['Nasslack', 'Pulverlack'];
const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];
const herstellerFilter = [
  'Brillux', 'Sherwin-Williams','PPG Industries','Nippon Paint', 'BASF', 'Asian Paints', 'Hempel',
  'Adler Lacke', 'Berger','Nerolac','Benjamin Moore','RPM International','IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm Pulverlacke', 
  'Akzo Nobel','Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
  'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL',
  'E-Pulverit', 'Braunsteiner', 'Ganzlin', 'Colors-Manufaktur', 'Aalbert',
  'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de', 'Pulverlacke24.de',
  'Pulverlacke.de', 'Pulverlack-pro.de',
];

/* ===================== Typen ===================== */

// Shape, wie es ArtikelCard erwartet (+ optionale Anbieter/Rating-Felder)
type CardArtikel = {
  id: string | number;
  titel: string;
  menge: number;
  lieferdatum: Date | null;
  hersteller: string;
  zustand: string;
  kategorie: string;
  ort: string;
  bilder: string[];
  gesponsert?: boolean;
  gewerblich?: boolean;
  privat?: boolean;

  // Farbinfos
  farbton?: string;
  farbcode?: string;

  // Ownership
  ownerId?: string; // <-- neu: aus API owner_id gemappt

  // optional für Anbieter/Rating (falls genutzt)
  anbieterName?: string;
  ratingAvg?: number;
  ratingCount?: number;
  user?: {
    name?: string;
    ratingAvg?: number;
    ratingCount?: number;
  };
};

// API-Item Typ (vereinfacht)
type ApiItem = {
  id: string;
  title?: string | null;
  lieferdatum?: string | null;
  delivery_at?: string | null;
  status?: string;
  published?: boolean;
  owner_id?: string | null;        // <-- neu/erwartet
  data?: Record<string, any> | null;
};

/* ===================== Fancy Loader Components ===================== */

function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className={styles.skeletonPage} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      <div className={styles.skelGrid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gap: 10 }}>
            <div className={styles.skelDrop} />
            <div className={styles.skelLine} />
            <div className={styles.skelLine} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== Helfer / Normalisierung ===================== */

function normKategorie(k?: string): string {
  const v = (k || '').toString().toLowerCase();
  if (v === 'pulverlack') return 'Pulverlack';
  if (v === 'nasslack') return 'Nasslack';
  return k || '';
}

function normZustand(z?: string): string {
  const v = (z || '').toString().toLowerCase();
  if (v.includes('neu')) return 'Neu und ungeöffnet';
  if (v.includes('geöffnet') || v.includes('geoeffnet') || v.includes('offen'))
    return 'Geöffnet und einwandfrei';
  return z || '';
}

function toDateOrNull(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function resolveLieferdatum(it: ApiItem): Date | null {
  const d: any = it.data || {};
  return toDateOrNull(it.lieferdatum || it.delivery_at || d.lieferdatum || d.delivery_at);
}

function resolveMenge(d: any): number {
  const raw = d?.menge;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function resolveBilder(d: any): string[] {
  const b = d?.bilder;
  if (Array.isArray(b) && b.length) {
    if (typeof b[0] === 'string') return b as string[];
    if (typeof b[0] === 'object' && (b[0] as any)?.url) {
      return (b as Array<{ url?: string }>).map((x) => x.url).filter(Boolean) as string[];
    }
  }
  if (typeof b === 'string' && b.trim()) {
    return b.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return ['/images/platzhalter.jpg'];
}

function resolveFarbton(d: any): string | undefined {
  const candidates = [
    d?.farbton, d?.farbtonbezeichnung, d?.farb_bezeichnung,
    d?.farbname, d?.farbe, d?.color_name, d?.color, d?.ral, d?.ncs,
  ];
  const first = candidates.find((v) => typeof v === 'string' && v.trim());
  return first ? String(first).trim() : undefined;
}

function resolveFarbcode(d: any): string | undefined {
  const candidates = [d?.farbcode, d?.color_code, d?.hex, d?.hex_code];
  const first = candidates.find((v) => typeof v === 'string' && v.trim());
  return first ? String(first).trim() : undefined;
}

function joinPlzOrt(plz?: unknown, ort?: unknown): string {
  const p = (plz ?? '').toString().trim();
  const o = (ort ?? '').toString().trim();
  return [p, o].filter(Boolean).join(' ') || o || '';
}

function extractPlzOrtFromText(s?: unknown): string {
  const text = (s ?? '').toString();
  if (!text) return '';
  const m = text.match(
    /(?:^|\b)(?:D[-\s])?(\d{4,5})\s+([A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß.\- ]{2,}?)(?=,|$)/
  );
  if (!m) return '';
  const zip = m[1].trim();
  const city = m[2].trim().replace(/\s+/g, ' ');
  return [zip, city].filter(Boolean).join(' ');
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
  const v = deepFindFirst(obj, (k) => /^(zip|zipCode|postal_code|plz)$/i.test(k));
  return (v ?? '').toString().trim();
}

function deepGetCity(obj: any): string {
  const v = deepFindFirst(obj, (k) => /^(city|ort|town)$/i.test(k));
  return (v ?? '').toString().trim();
}

function deepGetLieferort(obj: any): string {
  const v = deepFindFirst(obj, (k) => /^(lieferort|lieferOrt)$/i.test(k));
  return typeof v === 'string' ? v.trim() : '';
}

function deepGetAddressLike(obj: any): string {
  const v = deepFindFirst(obj, (k) => /adresse|address|anschrift|lieferadresse|lieferAdresse/i.test(k));
  return typeof v === 'string' ? v : '';
}

function resolveLieferort(d: any): string {
  const direct = deepGetLieferort(d);
  if (direct) return direct;
  const zip = deepGetZip(d);
  const city = deepGetCity(d);
  const joined = joinPlzOrt(zip, city);
  if (joined) return joined;
  const addrText = deepGetAddressLike(d);
  const extracted = extractPlzOrtFromText(addrText);
  if (extracted) return extracted;
  return '';
}

// robustes Bool
const toBool = (v: unknown): boolean =>
  typeof v === 'boolean' ? v
  : typeof v === 'string' ? ['1','true','yes','ja','wahr'].includes(v.toLowerCase())
  : typeof v === 'number' ? v !== 0
  : !!v;

/* ===== Menge-Utils ===== */
const MAX_MENGE = 10000;
const clamp = (n: number) => Math.max(0, Math.min(MAX_MENGE, Math.round(n)));
const stepFor = (v: number) => (v <= 100 ? 1 : v <= 1000 ? 5 : 50);

/* ===== Promo-Helpers ===== */
type PromoPackage = {
  id: string;
  name: string;
  price_total: number; // brutto
  currency: string;    // z.B. "EUR"
  description?: string | null;
};

const fmtPrice = (value: number, currency = 'EUR') =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(value);

// robuste User-ID-Erkennung über verschiedene /api/me|profil|profile-Shapes
function extractUserId(payload: any): string | null {
  const candidates = [
    payload?.id,
    payload?.user?.id,
    payload?.profile?.id,
    payload?.data?.id,
    payload?.me?.id,
    payload?.user_id,
    payload?.uid,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}

/* ===================== Seite ===================== */

export default function KaufenSeite() {
  const [suchbegriff, setSuchbegriff] = useState('');
  const [maxMenge, setMaxMenge] = useState<number>(MAX_MENGE);
  const [maxMengeInput, setMaxMengeInput] = useState<string>(String(MAX_MENGE));
  const [kategorie, setKategorie] = useState('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(50);

  // loader + liste
  const [loading, setLoading] = useState(true);
  const [liste, setListe] = useState<CardArtikel[]>([]);

  // Ich/Owner
  const [meId, setMeId] = useState<string | null>(null);

  // Promo-UI
  const [promoOpenFor, setPromoOpenFor] = useState<string | number | null>(null);
  const [promoPackages, setPromoPackages] = useState<PromoPackage[] | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);

  const seitenGroesse = 50;
  const startIndex = (page - 1) * seitenGroesse;
  const endIndex = page * seitenGroesse;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Slider -> Zahl + Feld
  const updateFromSlider = (n: number) => {
    const v = clamp(n);
    setMaxMenge(v);
    setMaxMengeInput(String(v));
  };
  const onNumInputChange = (val: string) => {
    const clean = val.replace(/[^\d]/g, '');
    setMaxMengeInput(clean);
  };
  const commitNumInput = () => {
    if (maxMengeInput.trim() === '') {
      setMaxMengeInput(String(maxMenge));
      return;
    }
    const parsed = parseInt(maxMengeInput, 10);
    const v = clamp(isNaN(parsed) ? 0 : parsed);
    setMaxMenge(v);
    setMaxMengeInput(String(v));
  };

  /* === Initialzustand einmalig aus URL übernehmen === */
  useEffect(() => {
    const arr = (s: string | null) => (s ? s.split(',').filter(Boolean) : []);
    setSuchbegriff(searchParams.get('q') || '');
    setKategorie(searchParams.get('kategorie') || '');
    setZustand(arr(searchParams.get('zustand')));
    setHersteller(arr(searchParams.get('hersteller')));
    setSortierung(searchParams.get('sort') || '');
    const initMax = Number(searchParams.get('max') || MAX_MENGE);
    const v = clamp(isNaN(initMax) ? MAX_MENGE : initMax);
    setMaxMenge(v);
    setMaxMengeInput(String(v));
    setGewerblich(searchParams.get('g') === '1');
    setPrivat(searchParams.get('p') === '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // nur einmal beim Mount

  // Eigenen User laden (robust: /api/me -> /api/profil -> /api/profile)
  useEffect(() => {
    let active = true;
    (async () => {
      const endpoints = ['/api/me', '/api/profil', '/api/profile'];
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { cache: 'no-store' });
          if (!res.ok) continue;
          const json = await res.json();
          const id = extractUserId(json);
          if (id && active) {
            setMeId(id);
            break;
          }
        } catch {
          // next endpoint
        }
      }
    })();
    return () => { active = false; };
  }, []);

  // Daten einmalig laden
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/lackanfragen', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const rawItems: ApiItem[] = json?.items || [];

        // Drafts/Unpublished ausblenden
        const items = rawItems.filter(
          (it) => it.published !== false && it.status !== 'draft' && it.status !== 'deleted'
        );

        const mapped: CardArtikel[] = items.map((it) => {
          const d = it.data || {};

          const bilder = resolveBilder(d);
          const ld = resolveLieferdatum(it);
          const farbton = resolveFarbton(d);
          const farbcode = resolveFarbcode(d);

          const istGewerblich =
            d.istGewerblich != null ? toBool(d.istGewerblich)
            : d.account_type != null ? String(d.account_type).toLowerCase() === 'business'
            : d.gewerblich != null ? toBool(d.gewerblich)
            : false;

          const anbieterName: string =
            (d.user && typeof d.user.name === 'string' && d.user.name) ||
            (typeof d.username === 'string' && d.username) ||
            (typeof d.user_name === 'string' && d.user_name) ||
            '';

          const ratingAvg: number | undefined =
            typeof d.user_rating_avg === 'number' ? d.user_rating_avg
            : (d.user && typeof d.user.ratingAvg === 'number' ? d.user.ratingAvg : undefined);

          const ratingCount: number | undefined =
            typeof d.user_rating_count === 'number' ? d.user_rating_count
            : (d.user && typeof d.user.ratingCount === 'number' ? d.user.ratingCount : undefined);

          return {
            id: it.id,
            titel: d.titel || it.title || 'Unbenannt',
            menge: resolveMenge(d),
            lieferdatum: ld,
            hersteller: (d.hersteller || '').toString(),
            zustand: normZustand(d.zustand),
            kategorie: normKategorie(d.kategorie),
            ort: resolveLieferort({ data: d, ...it }) || '—',
            bilder,
            gesponsert: Boolean(d.gesponsert ?? (it as any).gesponsert),
            gewerblich: istGewerblich,
            privat: istGewerblich === false ? true : false,

            // Farbinfos
            farbton,
            farbcode,

            // Owner (wichtig für "Bewerben")
            ownerId: (it as any).owner_id || d.owner_id || undefined,

            // Anbieter/Rating
            anbieterName,
            ratingAvg,
            ratingCount,
            user: d.user,
          };
        });

        if (active) setListe(mapped);
      } catch (e) {
        console.error('[KaufenSeite] fetch /api/lackanfragen failed', e);
        if (active) setListe([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Filter + Suche
  const gefiltert = useMemo(() => {
    let arr = [...liste];

    if (kategorie) arr = arr.filter((a) => a.kategorie === kategorie);
    if (zustand.length) arr = arr.filter((a) => zustand.includes(a.zustand));
    if (gewerblich || privat) {
      arr = arr.filter((a) => (gewerblich && a.gewerblich) || (privat && a.privat));
    }
    if (hersteller.length) arr = arr.filter((a) => hersteller.includes(a.hersteller));
    arr = arr.filter((a) => typeof a.menge === 'number' && a.menge <= maxMenge);

    if (suchbegriff.trim()) {
      const fuse = new Fuse(arr, {
        keys: [
          { name: 'titel', weight: 0.55 },
          { name: 'hersteller', weight: 0.2 },
          { name: 'farbton', weight: 0.9 },
          { name: 'farbcode', weight: 0.7 },
          { name: 'zustand', weight: 0.15 },
          { name: 'kategorie', weight: 0.15 },
          { name: 'ort', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
      });
      arr = fuse.search(suchbegriff).map((r) => r.item);
    }

    // Sortierung inkl. gesponsert zuerst
    const getTime = (x: CardArtikel) => (x.lieferdatum ? x.lieferdatum.getTime() : Number.MAX_SAFE_INTEGER);
    arr.sort((a, b) => {
      if (a.gesponsert && !b.gesponsert) return -1;
      if (!a.gesponsert && b.gesponsert) return 1;

      switch (sortierung) {
        case 'lieferdatum-auf':
          return getTime(a) - getTime(b);
        case 'lieferdatum-ab':
          return getTime(b) - getTime(a);
        case 'titel-az':
          return a.titel.localeCompare(b.titel);
        case 'titel-za':
          return b.titel.localeCompare(a.titel);
        case 'menge-auf':
          return (a.menge ?? 0) - (b.menge ?? 0);
        case 'menge-ab':
          return (b.menge ?? 0) - (a.menge ?? 0);
        default:
          return 0;
      }
    });

    return arr;
  }, [liste, kategorie, zustand, gewerblich, privat, hersteller, maxMenge, suchbegriff, sortierung]);

  // Infinite-Scroll nur auf Seite 1
  useEffect(() => {
    if (page !== 1) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAnzahlAnzeigen((prev) => Math.min(prev + 10, gefiltert.length));
        }
      },
      { rootMargin: '100px' }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [gefiltert, page]);

  // Wenn Filter ändern und wir NICHT auf Seite 1 sind → 'page' aus URL entfernen
  useEffect(() => {
    if (page !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      const query = params.toString();
      const neueUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(neueUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suchbegriff, maxMenge, kategorie, zustand, hersteller, sortierung, gewerblich, privat]);

  // Filter/Sort Zustand in URL spiegeln
  useEffect(() => {
    const params = new URLSearchParams();
    if (suchbegriff.trim()) params.set('q', suchbegriff.trim());
    if (kategorie) params.set('kategorie', kategorie);
    if (zustand.length) params.set('zustand', zustand.join(','));
    if (hersteller.length) params.set('hersteller', hersteller.join(','));
    if (sortierung) params.set('sort', sortierung);
    if (maxMenge !== MAX_MENGE) params.set('max', String(maxMenge));
    if (gewerblich) params.set('g', '1');
    if (privat) params.set('p', '1');

    const next = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [
    suchbegriff, kategorie, zustand, hersteller, sortierung,
    maxMenge, gewerblich, privat, pathname, router, searchParams
  ]);

  const totalPages = Math.max(1, Math.ceil(gefiltert.length / seitenGroesse));
  const seitenArtikel = gefiltert.slice(startIndex, endIndex);

  // Promo: Packages lazy laden (beim Öffnen)
  useEffect(() => {
    let active = true;
    if (!promoOpenFor || promoPackages) return;
    (async () => {
      setPromoLoading(true);
      setPromoError(null);
      try {
        const res = await fetch('/api/promo/packages', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const pkgs = (Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])).map((p: any) => ({
          id: p.id ?? p.package_id ?? p.slug ?? String(p.name || 'paket'),
          name: p.name ?? p.title ?? 'Paket',
          price_total: Number(p.price_total ?? p.price ?? 0),
          currency: p.currency ?? 'EUR',
          description: p.description ?? null,
        })) as PromoPackage[];
        if (active) setPromoPackages(pkgs);
      } catch (e: any) {
        if (active) setPromoError(e?.message || 'Pakete konnten nicht geladen werden');
      } finally {
        if (active) setPromoLoading(false);
      }
    })();
    return () => { active = false; };
  }, [promoOpenFor, promoPackages]);

  const startCheckout = async (requestId: string | number, packageId: string) => {
    try {
      setPromoLoading(true);
      setPromoError(null);
      const res = await fetch('/api/promo/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ request_id: String(requestId), package_id: packageId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Checkout fehlgeschlagen (HTTP ${res.status})`);
      }
      const out = await res.json();
      const url: string | undefined = out?.url || out?.session_url;
      if (url) window.location.href = url;
      else throw new Error('Keine Checkout-URL erhalten');
    } catch (e: any) {
      setPromoError(e?.message || 'Checkout fehlgeschlagen');
    } finally {
      setPromoLoading(false);
    }
  };

  // Nur während des ersten Loads → Skeleton + TopLoader
  const bootLoading = loading && liste.length === 0;

  if (bootLoading) {
    return (
      <>
        <Navbar />
        <TopLoader />
        <ListSkeleton />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Sidebar öffnen"
        aria-expanded={sidebarOpen}
      >
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar1open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar2open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar3open : ''}`} />
      </button>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <div className={styles.wrapper}>
        {/* SIDEBAR */}
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <input
            className={styles.input}
            type="text"
            placeholder="Lackanfrage finden (Titel, Farbtonbezeichnung)"
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <select className={styles.sortSelect} value={sortierung} onChange={(e) => setSortierung(e.target.value)}>
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum aufsteigend</option>
            <option value="lieferdatum-ab">Lieferdatum absteigend</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge aufsteigend</option>
            <option value="menge-ab">Menge absteigend</option>
          </select>

          {/* EIN Slider + Textfeld */}
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              className={styles.range}
              type="range"
              min={0}
              max={MAX_MENGE}
              step={stepFor(maxMenge)}
              value={maxMenge}
              onChange={(e) => updateFromSlider(Number(e.target.value))}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className={styles.mengeText}>Max. Menge:</div>
              <input
                className={styles.input}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={maxMengeInput}
                onChange={(e) => onNumInputChange(e.target.value)}
                onBlur={commitNumInput}
                onKeyDown={(e) => { if (e.key === 'Enter') commitNumInput(); }}
                style={{ width: 90 }}
                aria-label="Maximale Menge in kg"
              />
              <span>kg</span>
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Kategorie</strong>
            {kategorien.map((k) => (
              <label key={k} className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="kategorie"
                  checked={kategorie === k}
                  onChange={() => setKategorie(k)}
                />
                {k}
              </label>
            ))}
            <label className={styles.checkboxLabel}>
              <input type="radio" name="kategorie" checked={kategorie === ''} onChange={() => setKategorie('')} />
              Alle
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Zustand</strong>
            {zustandFilter.map((z) => (
              <label key={z} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={zustand.includes(z)}
                  onChange={() =>
                    setZustand((prev) =>
                      prev.includes(z) ? prev.filter((item) => item !== z) : [...prev, z]
                    )
                  }
                />
                {z}
              </label>
            ))}
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Hersteller</strong>
            {herstellerFilter.map((h) => (
              <label key={h} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hersteller.includes(h)}
                  onChange={() =>
                    setHersteller((prev) =>
                      prev.includes(h) ? prev.filter((item) => item !== h) : [...prev, h]
                    )
                  }
                />
                {h}
              </label>
            ))}
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={gewerblich} onChange={() => setGewerblich(!gewerblich)} />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={privat} onChange={() => setPrivat(!privat)} />
              Privat
            </label>
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          {loading && <TopLoader />}

          <h3 className={styles.anfrageUeberschrift}>
            {loading ? 'Lade...' : `${gefiltert.length} ${gefiltert.length === 1 ? 'offene Lackanfrage' : 'offene Lackanfragen'}`}
          </h3>

          <div className={styles.grid}>
            {(page === 1 ? gefiltert.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => {
              const isOwner = meId && a.ownerId && String(meId) === String(a.ownerId);
              const showPromote = !!isOwner && !a.gesponsert;

              return (
                <div key={a.id} style={{ position: 'relative' }}>
                  {/* Gesponsert-Pill */}
                  {a.gesponsert && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 2,
                        background: '#fde68a',
                        color: '#92400e',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 8,
                      }}
                    >
                      Gesponsert
                    </span>
                  )}

                  {/* Karte */}
                  <ArtikelCard artikel={a} />

                  {/* Bewerben-Button (nur Owner + nicht gesponsert) */}
                  {showPromote && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPromoOpenFor(a.id); }}
                      style={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        zIndex: 3,
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                      aria-label="Anfrage bewerben"
                    >
                      Anfrage bewerben
                    </button>
                  )}
                </div>
              );
            })}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>

          <div className={styles.seitenInfo}>
            Seite {page} von {totalPages}
          </div>

          {/* SSR-sichere Pagination */}
          <div className={styles.pagination}>
            {page > 1 && (() => {
              const params = new URLSearchParams(searchParams.toString());
              if (page - 1 === 1) params.delete('page'); else params.set('page', String(page - 1));
              const href = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
              return (
                <Link href={href} className={styles.pageArrow}>
                  ←
                </Link>
              );
            })()}

            {Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              const params = new URLSearchParams(searchParams.toString());
              if (pageNum === 1) params.delete('page'); else params.set('page', String(pageNum));
              const href = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
              return (
                <Link
                  key={pageNum}
                  href={href}
                  className={`${styles.pageLink} ${page === pageNum ? styles.activePage : ''}`}
                >
                  {pageNum}
                </Link>
              );
            })}

            {page < totalPages && (() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page + 1));
              const href = `${pathname}?${params.toString()}`;
              return (
                <Link href={href} className={styles.pageArrow}>
                  →
                </Link>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Promo-Overlay */}
      {promoOpenFor != null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Anfrage bewerben"
          onClick={() => setPromoOpenFor(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(680px, 92vw)', background: 'white', borderRadius: 12, padding: 20,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Anfrage bewerben</h3>
              <button
                onClick={() => setPromoOpenFor(null)}
                style={{ border:'none', background:'transparent', fontSize:18, cursor:'pointer' }}
                aria-label="Schließen"
              >×</button>
            </div>

            {promoLoading && <div style={{ padding: 12 }}>Lade Pakete…</div>}
            {promoError && <div style={{ padding: 12, color: '#b91c1c' }}>{promoError}</div>}

            {!promoLoading && !promoError && (
              <div style={{
                display:'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginTop: 8
              }}>
                {(promoPackages ?? []).map((p) => (
                  <div key={p.id} style={{
                    border:'1px solid #e5e7eb', borderRadius: 10, padding: 14,
                    display:'grid', gap: 8
                  }}>
                    <div style={{ fontWeight:700 }}>{p.name}</div>
                    {p.description ? <div style={{ fontSize:12, color:'#6b7280' }}>{p.description}</div> : null}
                    <div style={{ fontSize:16, fontWeight:800 }}>{fmtPrice(p.price_total, p.currency)}</div>
                    <button
                      onClick={() => startCheckout(promoOpenFor!, p.id)}
                      style={{
                        marginTop: 6,
                        background:'#111827', color:'white', border:'none',
                        borderRadius:8, padding:'8px 10px', fontWeight:700, cursor:'pointer'
                      }}
                    >
                      Zur Kasse
                    </button>
                  </div>
                ))}
                {(promoPackages ?? []).length === 0 && (
                  <div style={{ padding: 12 }}>Keine Pakete verfügbar.</div>
                )}
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color:'#6b7280' }}>
              Fixpreise brutto, Laufzeit nicht erforderlich.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
