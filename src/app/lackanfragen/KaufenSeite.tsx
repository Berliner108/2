// ./src/app/lackanfragen/KaufenSeite.tsx
// -----------------------------------------------------
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './auftragsboerse.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelCard';
import BoerseLoading from '../components/loading/BoerseLoading';

/* ===================== Filterlisten ===================== */

const kategorien = ['Nasslack', 'Pulverlack'];

const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];

const herstellerFilter = [
  'Brillux', 'Sherwin-Williams', 'PPG Industries', 'Nippon Paint', 'BASF', 'Asian Paints', 'Hempel',
  'Adler Lacke', 'Berger', 'Nerolac', 'Benjamin Moore', 'RPM International', 'IGP', 'Tiger', 'Axalta',
  'Frei Lacke', 'Grimm Pulverlacke', 'Akzo Nobel', 'Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
  'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL', 'E-Pulverit', 'Braunsteiner',
  'Ganzlin', 'Colors-Manufaktur', 'Aalbert', 'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de',
  'Pulverlacke24.de', 'Pulverlacke.de', 'Pulverlack-pro.de',
];

/* ===================== Konstanten ===================== */

const MAX_MENGE = 10000;
const SEITEN_GROESSE = 50;

const clamp = (n: number) => Math.max(0, Math.min(MAX_MENGE, Math.round(n)));
const stepFor = (v: number) => (v <= 100 ? 1 : v <= 1000 ? 5 : 50);

/* ===================== Typen ===================== */

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
  promoScore?: number;
  gewerblich?: boolean;
  privat?: boolean;

  farbton?: string;
  farbcode?: string;

  anbieterName?: string;
  ratingAvg?: number;
  ratingCount?: number;
  user?: {
    name?: string;
    ratingAvg?: number;
    ratingCount?: number;
  };
};

type ApiItem = {
  id: string;
  title?: string | null;
  lieferdatum?: string | null;
  delivery_at?: string | null;
  status?: string;
  published?: boolean;
  data?: Record<string, any> | null;
  promoScore?: number;
  promo_score?: number;
  gesponsert?: boolean;
  menge_numeric?: number | null;
};

/* ===================== Helfer ===================== */

function normKategorie(k?: string): string {
  const v = (k || '').toString().toLowerCase();
  if (v === 'pulverlack') return 'Pulverlack';
  if (v === 'nasslack') return 'Nasslack';
  return k || '';
}

function normZustand(z?: string): string {
  const v = (z || '').toString().toLowerCase();

  if (v.includes('neu')) return 'Neu und ungeöffnet';

  if (v.includes('geöffnet') || v.includes('geoeffnet') || v.includes('offen')) {
    return 'Geöffnet und einwandfrei';
  }

  return z || '';
}

function toDateOrNull(s?: string | null): Date | null {
  if (!s) return null;

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function resolveLieferdatum(it: ApiItem): Date | null {
  const d: any = it.data || {};

  return toDateOrNull(
    it.lieferdatum ||
      it.delivery_at ||
      d.lieferdatum ||
      d.delivery_at
  );
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
      return (b as Array<{ url?: string }>)
        .map((x) => x.url)
        .filter(Boolean) as string[];
    }
  }

  if (typeof b === 'string' && b.trim()) {
    return b
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return ['/images/platzhalter.jpg'];
}

function resolveFarbton(d: any): string | undefined {
  const candidates = [
    d?.farbton,
    d?.farbtonbezeichnung,
    d?.farb_bezeichnung,
    d?.farbname,
    d?.farbe,
    d?.color_name,
    d?.color,
    d?.ral,
    d?.ncs,
  ];

  const first = candidates.find((v) => typeof v === 'string' && v.trim());
  return first ? String(first).trim() : undefined;
}

function resolveFarbcode(d: any): string | undefined {
  const candidates = [
    d?.farbcode,
    d?.color_code,
    d?.hex,
    d?.hex_code,
  ];

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
  const v = deepFindFirst(
    obj,
    (k) => /adresse|address|anschrift|lieferadresse|lieferAdresse/i.test(k)
  );

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

const toBool = (v: unknown): boolean =>
  typeof v === 'boolean'
    ? v
    : typeof v === 'string'
      ? ['1', 'true', 'yes', 'ja', 'wahr'].includes(v.toLowerCase())
      : typeof v === 'number'
        ? v !== 0
        : !!v;

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

  const [loading, setLoading] = useState(true);
  const [liste, setListe] = useState<CardArtikel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [urlReady, setUrlReady] = useState(false);

  const didSkipFirstUrlSync = useRef(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

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

    setUrlReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* === Filter/Sortierzustand in URL spiegeln === */
  useEffect(() => {
    if (!urlReady) return;

    // ersten Lauf nach Initialisierung überspringen,
    // damit /lackanfragen?page=2 nicht sofort auf Seite 1 zurückgesetzt wird
    if (!didSkipFirstUrlSync.current) {
      didSkipFirstUrlSync.current = true;
      return;
    }

    const params = new URLSearchParams();

    if (suchbegriff.trim()) params.set('q', suchbegriff.trim());
    if (kategorie) params.set('kategorie', kategorie);
    if (zustand.length) params.set('zustand', zustand.join(','));
    if (hersteller.length) params.set('hersteller', hersteller.join(','));
    if (sortierung) params.set('sort', sortierung);
    if (maxMenge !== MAX_MENGE) params.set('max', String(maxMenge));
    if (gewerblich) params.set('g', '1');
    if (privat) params.set('p', '1');

    // page bewusst nicht übernehmen:
    // Filteränderung soll immer auf Seite 1 springen
    const next = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    const current = `${pathname}${window.location.search}`;

    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [
    urlReady,
    suchbegriff,
    kategorie,
    zustand,
    hersteller,
    sortierung,
    maxMenge,
    gewerblich,
    privat,
    pathname,
    router,
  ]);

  /* === Daten laden: Pagination + Filter laufen über API === */
  useEffect(() => {
    if (!urlReady) return;

    let active = true;

    (async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams();

        params.set('sort', 'promo');
        params.set('order', 'desc');
        params.set('page', String(page));
        params.set('limit', String(SEITEN_GROESSE));

        if (suchbegriff.trim()) params.set('q', suchbegriff.trim());
        if (kategorie) params.set('kategorie', kategorie);
        if (zustand.length) params.set('zustand', zustand.join(','));
        if (hersteller.length) params.set('hersteller', hersteller.join(','));
        if (maxMenge !== MAX_MENGE) params.set('max', String(maxMenge));
        if (gewerblich) params.set('g', '1');
        if (privat) params.set('p', '1');

        const res = await fetch(`/api/lackanfragen?${params.toString()}`, {
          cache: 'no-store',
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        const rawItems: ApiItem[] = json?.items || [];
        const nextTotal = Number(json?.total ?? 0);

        const mapped: CardArtikel[] = rawItems.map((it) => {
          const d = it.data || {};

          const bilder = resolveBilder(d);
          const ld = resolveLieferdatum(it);
          const farbton = resolveFarbton(d);
          const farbcode = resolveFarbcode(d);

          const istGewerblich =
            d.istGewerblich != null
              ? toBool(d.istGewerblich)
              : d.account_type != null
                ? String(d.account_type).toLowerCase() === 'business'
                : d.gewerblich != null
                  ? toBool(d.gewerblich)
                  : false;

          const anbieterName: string =
            (d.user && typeof d.user.name === 'string' && d.user.name) ||
            (typeof d.username === 'string' && d.username) ||
            (typeof d.user_name === 'string' && d.user_name) ||
            '';

          const ratingAvg: number | undefined =
            typeof d.user_rating_avg === 'number'
              ? d.user_rating_avg
              : d.user && typeof d.user.ratingAvg === 'number'
                ? d.user.ratingAvg
                : undefined;

          const ratingCount: number | undefined =
            typeof d.user_rating_count === 'number'
              ? d.user_rating_count
              : d.user && typeof d.user.ratingCount === 'number'
                ? d.user.ratingCount
                : undefined;

          return {
            id: it.id,
            titel: d.titel || it.title || 'Unbenannt',
            menge: Number(it.menge_numeric ?? resolveMenge(d)),
            lieferdatum: ld,
            hersteller: (d.hersteller || '').toString(),
            zustand: normZustand(d.zustand),
            kategorie: normKategorie(d.kategorie),
            ort: resolveLieferort({ data: d, ...it }) || '—',
            bilder,
            gesponsert: Boolean(d.gesponsert ?? it.gesponsert),
            promoScore: Number(it.promoScore ?? it.promo_score ?? 0),
            gewerblich: istGewerblich,
            privat: istGewerblich === false,
            farbton,
            farbcode,
            anbieterName,
            ratingAvg,
            ratingCount,
            user: d.user,
          };
        });

        if (active) {
          setListe(mapped);
          setTotalCount(nextTotal);
        }
      } catch (e) {
        console.error('[KaufenSeite] fetch /api/lackanfragen failed', e);

        if (active) {
          setListe([]);
          setTotalCount(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    urlReady,
    page,
    suchbegriff,
    kategorie,
    zustand,
    hersteller,
    maxMenge,
    gewerblich,
    privat,
  ]);

  /* === Nur noch lokale Sortierung der geladenen API-Ergebnisse === */
  const angezeigteArtikel = useMemo(() => {
    const arr = [...liste];

    const getTime = (x: CardArtikel) =>
      x.lieferdatum ? x.lieferdatum.getTime() : Number.MAX_SAFE_INTEGER;

    arr.sort((a, b) => {
      if (!sortierung) {
        const promoA = Number(a.promoScore ?? 0);
        const promoB = Number(b.promoScore ?? 0);

        if (promoA !== promoB) return promoB - promoA;
      }

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
  }, [liste, sortierung]);

  const totalPages = Math.max(1, Math.ceil(totalCount / SEITEN_GROESSE));

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

  const bootLoading = loading && liste.length === 0;

  if (bootLoading) {
    return <BoerseLoading />;
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

      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={styles.wrapper}>
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <input
            className={styles.input}
            type="text"
            placeholder="Lackanfrage finden (Titel, Farbtonbezeichnung)"
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <select
            className={styles.sortSelect}
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
          >
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum aufsteigend</option>
            <option value="lieferdatum-ab">Lieferdatum absteigend</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge aufsteigend</option>
            <option value="menge-ab">Menge absteigend</option>
          </select>

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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNumInput();
                }}
                style={{ width: 90 }}
                aria-label="Maximale Menge"
              />

              <span style={{ whiteSpace: 'nowrap' }}>
                {kategorie === 'Nasslack' ? 'l' : kategorie === 'Pulverlack' ? 'kg' : 'kg/l'}
              </span>
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
              <input
                type="radio"
                name="kategorie"
                checked={kategorie === ''}
                onChange={() => setKategorie('')}
              />
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
                      prev.includes(z)
                        ? prev.filter((item) => item !== z)
                        : [...prev, z]
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
                      prev.includes(h)
                        ? prev.filter((item) => item !== h)
                        : [...prev, h]
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
              <input
                type="checkbox"
                checked={gewerblich}
                onChange={() => setGewerblich(!gewerblich)}
              />
              Gewerblich
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={privat}
                onChange={() => setPrivat(!privat)}
              />
              Privat
            </label>
          </div>
        </div>

        <div className={styles.content}>
          <h3 className={styles.anfrageUeberschrift}>
            {loading
              ? 'Lade...'
              : `${totalCount} ${totalCount === 1 ? 'offene Lackanfrage' : 'offene Lackanfragen'}`}
          </h3>

          <div className={styles.grid}>
            {angezeigteArtikel.map((a) => (
              <ArtikelCard key={a.id} artikel={a} />
            ))}
          </div>

          <div className={styles.seitenInfo}>
            Seite {page} von {totalPages}
          </div>

          <div className={styles.pagination}>
            {page > 1 && (() => {
              const params = new URLSearchParams(searchParams.toString());

              if (page - 1 === 1) {
                params.delete('page');
              } else {
                params.set('page', String(page - 1));
              }

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

              if (pageNum === 1) {
                params.delete('page');
              } else {
                params.set('page', String(pageNum));
              }

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
    </>
  );
}