'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelKarteShop';
import { supabaseBrowser } from '@/lib/supabase-browser';

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
const CAT_MAP: Record<string, 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'> = {
  nasslack: 'Nasslack',
  nasslacke: 'Nasslack',
  pulverlack: 'Pulverlack',
  pulverlacke: 'Pulverlack',
  arbeitsmittel: 'Arbeitsmittel',
  'arbeitsmittel & zubehör': 'Arbeitsmittel',
};
const normalizeKategorie = (s?: string | null) => CAT_MAP[norm(s)] ?? '';

const kategorien: Array<'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'> = ['Nasslack', 'Pulverlack', 'Arbeitsmittel'];
const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];

const herstellerFilter = [
  'Brillux',
  'Sherwin Williams',
  'PPG Industries',
  'Nippon Paint',
  'BASF',
  'Asian Paints',
  'Hempel',
  'Adler Lacke',
  'Berger',
  'Nerolac',
  'Benjamin Moore',
  'RPM International',
  'IGP',
  'Tiger',
  'Axalta',
  'Frei Lacke',
  'Grimm',
  'Akzo Nobel',
  'Teknos',
  'Pulver Kimya',
  'Kabe',
  'Wörwag',
  'Kansai',
  'Helios',
  'Pulverkönig',
  'Bentatec',
  'Pulmatech',
  'Colortech',
  'VAL',
  'E-Pulverit',
  'Braunsteiner',
  'Ganzlin',
  'Colors-Manufaktur',
  'Aalbert',
  'Motec-Pulverlack',
  'DuPont',
  'Jotun',
  'Pulvertech.de',
  'Pulverlacke24.de',
  'Pulverlacke.de',
  'Pulverlack-pro.de',
  'Pulverlackshop.de',
];

// exakt der Typ, den ArtikelKarteShop erwartet (menge & lieferdatum sind Pflicht)
type ShopArtikel = {
  id: string | number;
  titel: string;
  menge: number;
  lieferdatum: Date;
  hersteller: string;
  zustand: string;
  kategorie: string;
  preis: number;
  bilder: string[];
  gesponsert?: boolean;
  gewerblich?: boolean;
  privat?: boolean;
  einheit: 'kg' | 'stueck';
};

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isoToDate(iso: any): Date {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T00:00:00`);
  }
  return new Date();
}

// Erkennung "Gewerblich" aus user_metadata (du kannst später die Keys anpassen)
function isBusinessUserFromMetadata(meta: any): boolean {
  const raw =
    meta?.account_type ??
    meta?.kundentyp ??
    meta?.user_type ??
    meta?.type ??
    meta?.rolle ??
    '';
  return String(raw).toLowerCase().includes('gewerb');
}

export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [artikelDaten, setArtikelDaten] = useState<ShopArtikel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Viewer (um sell_to=gewerblich zu filtern)
  const [viewerIsBusiness, setViewerIsBusiness] = useState(false);
  const [viewerLoaded, setViewerLoaded] = useState(false);

  const [suchbegriff, setSuchbegriff] = useState(() => searchParams.get('search') ?? '');
  useEffect(() => {
    setSuchbegriff(searchParams.get('search') ?? '');
  }, [searchParams]);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const seitenGroesse = 50;
  const startIndex = (page - 1) * seitenGroesse;
  const endIndex = page * seitenGroesse;

  // 1) Viewer laden
  useEffect(() => {
    const supa = supabaseBrowser();
    supa.auth
      .getUser()
      .then(({ data }) => {
        const isBiz = isBusinessUserFromMetadata(data.user?.user_metadata);
        setViewerIsBusiness(isBiz);
      })
      .finally(() => setViewerLoaded(true));
  }, []);

  // 2) Artikel laden (nach Viewer-Check, damit sell_to korrekt gefiltert wird)
  useEffect(() => {
    if (!viewerLoaded) return;

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/articles?limit=200&offset=0`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? 'Fehler beim Laden der Artikel');

        const raw: any[] = Array.isArray(json?.articles) ? json.articles : [];

        // sell_to Filter: gewerblich-only nur für Business-Viewer
        const visible = raw.filter((a: any) => {
          const sellTo = (a.sell_to ?? 'beide') as 'gewerblich' | 'beide';
          if (sellTo === 'gewerblich') return viewerIsBusiness;
          return true;
        });

        const mapped: ShopArtikel[] = visible.map((a: any) => {
          const sellTo = (a.sell_to ?? 'beide') as 'gewerblich' | 'beide';

          const priceFrom = safeNumber(a.price_from, 0);

          // Einheit: aus DB (price_unit). Fallback kg.
          const unit: 'kg' | 'stueck' = a.price_unit === 'stueck' ? 'stueck' : 'kg';

          // Menge passend zur Einheit (falls DB beide hat)
          const qty =
            unit === 'stueck'
              ? a.qty_piece != null
                ? safeNumber(a.qty_piece, 0)
                : 0
              : a.qty_kg != null
              ? safeNumber(a.qty_kg, 0)
              : 0;

          const deliveryDate = isoToDate(a.delivery_date_iso);

          return {
            id: a.id,
            titel: a.title ?? '',
            hersteller: a.manufacturer ?? '—',
            // Zustand: falls API/DB noch nix liefert -> '—'
            zustand: (a.condition ?? a.zustand ?? '—') || '—',
            kategorie: a.category ?? '—',

            preis: priceFrom,
            menge: qty,
            lieferdatum: deliveryDate,

            gewerblich: sellTo === 'gewerblich' || sellTo === 'beide',
            privat: sellTo === 'beide',

            einheit: unit,
            gesponsert: safeNumber(a.promo_score, 0) > 0,
            bilder: Array.isArray(a.image_urls) ? a.image_urls : [],
          };
        });

        if (!cancelled) setArtikelDaten(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message ?? 'Unbekannter Fehler');
          setArtikelDaten([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [viewerLoaded, viewerIsBusiness]);

  const maxAvailablePrice = Math.max(0, ...artikelDaten.map((a) => safeNumber(a.preis, 0)));
  const [maxPreis, setMaxPreis] = useState(0);

  useEffect(() => {
    setMaxPreis((prev) => {
      if (prev === 0) return maxAvailablePrice;
      return Math.min(prev, maxAvailablePrice);
    });
  }, [maxAvailablePrice]);

  const [kategorie, setKategorie] = useState<'' | 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'>('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(50);

  useEffect(() => {
    const qKat = searchParams.get('kategorie');
    const normalized = normalizeKategorie(qKat);
    if (normalized) setKategorie(normalized);
    else if (!qKat) setKategorie('');
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (kategorie) params.set('kategorie', kategorie);
    else params.delete('kategorie');

    if (page !== 1) params.delete('page');

    const next = params.toString() ? `?${params.toString()}` : location.pathname;
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategorie]);

  const gefilterteArtikel = artikelDaten
    .filter((a) => {
      if (!kategorie) return true;
      return normalizeKategorie(a.kategorie) === kategorie;
    })
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand ?? ''))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller ?? ''))
    .filter((a) => safeNumber(a.preis, 0) <= maxPreis);

  const fuse = new Fuse(gefilterteArtikel, {
    keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
    threshold: 0.35,
  });
  const suchErgebnis = suchbegriff ? fuse.search(suchbegriff).map((r) => r.item) : gefilterteArtikel;

  const sortierteArtikel = (() => {
    if (!sortierung) return suchErgebnis;

    const arr = [...suchErgebnis];
    arr.sort((a, b) => {
      switch (sortierung) {
        case 'lieferdatum-auf':
          return a.lieferdatum.getTime() - b.lieferdatum.getTime();
        case 'lieferdatum-ab':
          return b.lieferdatum.getTime() - a.lieferdatum.getTime();
        case 'titel-az':
          return (a.titel ?? '').localeCompare(b.titel ?? '');
        case 'titel-za':
          return (b.titel ?? '').localeCompare(a.titel ?? '');
        case 'menge-auf':
          return (a.menge ?? 0) - (b.menge ?? 0);
        case 'menge-ab':
          return (b.menge ?? 0) - (a.menge ?? 0);
        default:
          return 0;
      }
    });
    return arr;
  })();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (page !== 1) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAnzahlAnzeigen((prev) => Math.min(prev + 10, sortierteArtikel.length));
        }
      },
      { rootMargin: '100px' }
    );
    loadMoreRef.current && observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [sortierteArtikel, page]);

  useEffect(() => {
    if (page !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      const neueUrl = params.toString() ? `${location.pathname}?${params}` : location.pathname;
      router.replace(neueUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suchbegriff, maxPreis, zustand, hersteller, sortierung, gewerblich, privat]);

  const seitenArtikel = sortierteArtikel.slice(startIndex, endIndex);

  return (
    <>
      <Navbar />

      <button className={styles.hamburger} onClick={() => setSidebarOpen((open) => !open)} aria-label="Sidebar öffnen">
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar1open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar2open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar3open : ''}`} />
      </button>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <div className={styles.wrapper}>
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <input
            className={styles.input}
            type="text"
            placeholder="Artikel finden..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <select className={styles.sortSelect} value={sortierung} onChange={(e) => setSortierung(e.target.value)}>
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum ↑</option>
            <option value="lieferdatum-ab">Lieferdatum ↓</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge ↑</option>
            <option value="menge-ab">Menge ↓</option>
          </select>

          <input
            className={styles.range}
            type="range"
            min={0}
            max={maxAvailablePrice}
            step={0.1}
            value={maxPreis}
            onChange={(e) => setMaxPreis(Number(e.target.value))}
          />
          <div className={styles.mengeText}>Max. Preis: {Number(maxPreis).toFixed(2)} €</div>

          <div className={styles.checkboxGroup}>
            <strong>Kategorie</strong>
            {kategorien.map((k) => (
              <label key={k} className={styles.checkboxLabel}>
                <input type="radio" name="kategorie" checked={kategorie === k} onChange={() => setKategorie(k)} />
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
                  onChange={() => setZustand((prev) => (prev.includes(z) ? prev.filter((i) => i !== z) : [...prev, z]))}
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
                  onChange={() => setHersteller((prev) => (prev.includes(h) ? prev.filter((i) => i !== h) : [...prev, h]))}
                />
                {h}
              </label>
            ))}
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={gewerblich} onChange={() => setGewerblich((g) => !g)} />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={privat} onChange={() => setPrivat((p) => !p)} />
              Privat
            </label>
          </div>
        </div>

        <div className={styles.content}>
          <h3 className={styles.anfrageUeberschrift}>
            {loading ? 'Lade Artikel…' : `${sortierteArtikel.length} Artikel im Shop`}
          </h3>

          {loadError && (
            <div style={{ padding: '10px 0' }}>
              <strong>Fehler:</strong> {loadError}
            </div>
          )}

          <div className={styles.grid}>
            {(page === 1 ? sortierteArtikel.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => (
              <ArtikelCard key={String(a.id)} artikel={a} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>

          <div className={styles.seitenInfo}>
            Seite {page} von {Math.max(1, Math.ceil(sortierteArtikel.length / seitenGroesse))}
          </div>

          <div className={styles.pagination}>
            {page > 1 && (
              <Link href={page - 1 === 1 ? location.pathname : `?page=${page - 1}`} className={styles.pageArrow}>
                ←
              </Link>
            )}

            {Array.from({ length: Math.max(1, Math.ceil(sortierteArtikel.length / seitenGroesse)) }, (_, i) => {
              const p = i + 1;
              const href = p === 1 ? location.pathname : `?page=${p}`;
              return (
                <Link key={p} href={href} className={`${styles.pageLink} ${page === p ? styles.activePage : ''}`}>
                  {p}
                </Link>
              );
            })}

            {page < Math.ceil(sortierteArtikel.length / seitenGroesse) && (
              <Link href={`?page=${page + 1}`} className={styles.pageArrow}>
                →
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
