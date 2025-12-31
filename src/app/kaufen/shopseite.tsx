'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelKarteShop';

// ---- Helpers: Kategorie robust normalisieren ----
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
const CAT_MAP: Record<string, 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'> = {
  'nasslack': 'Nasslack',
  'nasslacke': 'Nasslack',
  'pulverlack': 'Pulverlack',
  'pulverlacke': 'Pulverlack',
  'arbeitsmittel': 'Arbeitsmittel',
  'arbeitsmittel & zubehör': 'Arbeitsmittel',
};
const normalizeKategorie = (s?: string | null) => CAT_MAP[norm(s)] ?? '';

const kategorien: Array<'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'> = [
  'Nasslack',
  'Pulverlack',
  'Arbeitsmittel',
];

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

// Shape, wie deine Artikelkarte es aktuell erwartet
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
};

export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [artikelDatenState, setArtikelDatenState] = useState<ShopArtikel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Suchfeld aus URL (?search=...)
  const [suchbegriff, setSuchbegriff] = useState(() => searchParams.get('search') ?? '');
  useEffect(() => {
    setSuchbegriff(searchParams.get('search') ?? '');
  }, [searchParams]);

  // Filter-States
  const [kategorie, setKategorie] = useState<'' | 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'>('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(50);

  // Pagination aus URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const seitenGroesse = 50;
  const startIndex = (page - 1) * seitenGroesse;
  const endIndex = page * seitenGroesse;

  // ---- Vorselektion Kategorie aus Navbar (?kategorie=...) ----
  useEffect(() => {
    const qKat = searchParams.get('kategorie');
    const normalized = normalizeKategorie(qKat);
    if (normalized) setKategorie(normalized);
    else if (!qKat) setKategorie('');
  }, [searchParams]);

  // ---- URL mit der gewählten Kategorie synchron halten ----
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (kategorie) params.set('kategorie', kategorie);
    else params.delete('kategorie');

    if (page !== 1) params.delete('page');

    const next = params.toString() ? `?${params.toString()}` : location.pathname;
    router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kategorie]);

  // -------------------------
  // DB Load (live)
  // -------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/articles?limit=200&offset=0`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`API Fehler: ${res.status}`);

        const json = await res.json();
        const rows = (json?.articles ?? []) as any[];

        const mapped: ShopArtikel[] = rows.map((a) => {
          const displayKat = normalizeKategorie(a.category) || a.category || '';

          const sellTo = (a.sell_to ?? '') as 'gewerblich' | 'beide' | '';
          const canBusiness = sellTo === 'gewerblich' || sellTo === 'beide';
          const canPrivate = sellTo === 'beide';

          const qty =
            typeof a.qty_kg === 'number'
              ? a.qty_kg
              : typeof a.qty_piece === 'number'
              ? a.qty_piece
              : Number(a.qty_kg ?? a.qty_piece ?? 0);

          const priceFrom =
            typeof a.price_from === 'number' ? a.price_from : Number(a.price_from ?? 0);

          const iso = a.delivery_date_iso as string | undefined;
          const lieferdatum = iso ? new Date(`${iso}T00:00:00`) : new Date();

          const imgs = Array.isArray(a.image_urls) ? a.image_urls : [];

          return {
            id: a.id,
            titel: a.title ?? '',
            menge: qty || 0,
            lieferdatum,
            hersteller: a.manufacturer ?? '',
            // Zustand kommt aus DB später sauber; damit Filter nicht alles killt, setzen wir Default
            zustand: a.condition ?? 'Neu und ungeöffnet',
            kategorie: displayKat,
            preis: priceFrom || 0, // aktuell: price_from (Brutto) -> Karte zeigt später "Preis ab"
            bilder: imgs,
            gesponsert: (a.promo_score ?? 0) > 0,
            gewerblich: canBusiness,
            privat: canPrivate,
          };
        });

        if (!cancelled) {
          setArtikelDatenState(mapped);
          setAnzahlAnzeigen(50);
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? 'Unbekannter Fehler');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamisch höchsten Preis (jetzt aus DB: price_from)
  const maxAvailablePrice = useMemo(() => {
    const max = artikelDatenState.reduce((m, a) => (a.preis > m ? a.preis : m), 0);
    return Number.isFinite(max) ? max : 0;
  }, [artikelDatenState]);

  const [maxPreis, setMaxPreis] = useState(0);
  useEffect(() => {
    setMaxPreis(maxAvailablePrice);
  }, [maxAvailablePrice]);

  // Artikel filtern – Kategorie robust vergleichen
  const gefilterteArtikel = artikelDatenState
    .filter((a) => {
      if (!kategorie) return true;
      return normalizeKategorie(a.kategorie) === kategorie;
    })
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter((a) => a.preis <= maxPreis);

  // Suche
  const fuse = new Fuse(gefilterteArtikel, {
    keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
    threshold: 0.35,
  });
  const suchErgebnis = suchbegriff ? fuse.search(suchbegriff).map((r) => r.item) : gefilterteArtikel;

  // Sortierung:
  // IMPORTANT: default KEINE Sortierung -> DB-Reihenfolge bleibt (promo + random kommt aus API)
  const sortierteArtikel = useMemo(() => {
    if (!sortierung) return [...suchErgebnis];

    const arr = [...suchErgebnis];
    switch (sortierung) {
      case 'titel-az':
        return arr.sort((a, b) => a.titel.localeCompare(b.titel));
      case 'titel-za':
        return arr.sort((a, b) => b.titel.localeCompare(a.titel));
      case 'menge-auf':
        return arr.sort((a, b) => (a.menge ?? 0) - (b.menge ?? 0));
      case 'menge-ab':
        return arr.sort((a, b) => (b.menge ?? 0) - (a.menge ?? 0));
      // lieferdatum-Optionen lassen wir drin, sortieren aber nur, wenn du sie bewusst auswählst
      case 'lieferdatum-auf':
        return arr.sort((a, b) => new Date(a.lieferdatum).getTime() - new Date(b.lieferdatum).getTime());
      case 'lieferdatum-ab':
        return arr.sort((a, b) => new Date(b.lieferdatum).getTime() - new Date(a.lieferdatum).getTime());
      default:
        return arr;
    }
  }, [suchErgebnis, sortierung]);

  // Infinite-Scroll
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

  // Seite zurücksetzen, wenn andere Filter ändern (außer page)
  useEffect(() => {
    if (page !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      const neueUrl = params.toString() ? `${location.pathname}?${params}` : location.pathname;
      router.replace(neueUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suchbegriff, maxPreis, zustand, hersteller, sortierung, gewerblich, privat]);

  // für Pagination
  const seitenArtikel = sortierteArtikel.slice(startIndex, endIndex);

  return (
    <>
      <Navbar />

      {/* Hamburger / Sidebar toggle */}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label="Sidebar öffnen"
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
            placeholder="Artikel finden..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          {/* Sortierung */}
          <select className={styles.sortSelect} value={sortierung} onChange={(e) => setSortierung(e.target.value)}>
            <option value="">Sortieren</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge ↑</option>
            <option value="menge-ab">Menge ↓</option>
            <option value="lieferdatum-auf">Lieferdatum ↑</option>
            <option value="lieferdatum-ab">Lieferdatum ↓</option>
          </select>

          {/* Preis-Slider */}
          <input
            className={styles.range}
            type="range"
            min={0}
            max={maxAvailablePrice}
            step={0.1}
            value={maxPreis}
            onChange={(e) => setMaxPreis(Number(e.target.value))}
            disabled={maxAvailablePrice === 0}
          />
          <div className={styles.mengeText}>Max. Preis: {maxPreis.toFixed(2)} €</div>

          {/* Kategorie */}
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

          {/* Zustand */}
          <div className={styles.checkboxGroup}>
            <strong>Zustand</strong>
            {zustandFilter.map((z) => (
              <label key={z} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={zustand.includes(z)}
                  onChange={() =>
                    setZustand((prev) => (prev.includes(z) ? prev.filter((i) => i !== z) : [...prev, z]))
                  }
                />
                {z}
              </label>
            ))}
          </div>

          {/* Hersteller */}
          <div className={styles.checkboxGroup}>
            <strong>Hersteller</strong>
            {herstellerFilter.map((h) => (
              <label key={h} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hersteller.includes(h)}
                  onChange={() =>
                    setHersteller((prev) => (prev.includes(h) ? prev.filter((i) => i !== h) : [...prev, h]))
                  }
                />
                {h}
              </label>
            ))}
          </div>

          {/* Verkaufstyp */}
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

        {/* CONTENT */}
        <div className={styles.content}>
          <h3 className={styles.anfrageUeberschrift}>
            {loading ? 'Lade Artikel…' : `${sortierteArtikel.length} Artikel im Shop`}
          </h3>

          {loadError && (
            <div style={{ padding: '12px 0', color: '#b00020', fontWeight: 600 }}>
              Fehler beim Laden: {loadError}
            </div>
          )}

          <div className={styles.grid}>
            {(page === 1 ? sortierteArtikel.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => (
              <ArtikelCard key={a.id} artikel={a as any} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>

          {/* Pagination */}
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
