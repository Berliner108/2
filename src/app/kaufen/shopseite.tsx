'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import ArtikelCard from '../components/ArtikelKarteShop';
import { supabaseBrowser } from '@/lib/supabase-browser';

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

type ApiArticle = {
  id: string;
  title: string;
  category?: string | null;
  manufacturer?: string | null;
  promo_score?: number | null;
  delivery_date_iso?: string | null; // "YYYY-MM-DD"
  delivery_days?: number | null;
  stock_status?: 'auf_lager' | 'begrenzt' | null;
  qty_kg?: number | null;
  qty_piece?: number | null;
  image_urls?: string[] | null;

  // wichtig:
  sell_to?: 'gewerblich' | 'beide' | null;

  // preis ab:
  price_from?: number | null;
  price_unit?: 'kg' | 'stueck' | null;

  // zustand kann in deiner DB unterschiedlich heißen:
  condition?: string | null;
  zustand?: string | null;
};

type CardArtikel = {
  id: string;
  titel: string;
  mengeLabel: string;
  lieferdatumLabel: string;
  hersteller: string;
  zustand: string;
  kategorie: string;
  preisLabel: string;
  bilder: string[];
  gesponsert: boolean;
  gewerblich: boolean;
  privat: boolean;
  // für Filter:
  _sell_to?: 'gewerblich' | 'beide' | null;
};

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

function formatEuro(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toFixed(2)} €`;
}

export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewerIsBusiness, setViewerIsBusiness] = useState(false);

  const [artikel, setArtikel] = useState<CardArtikel[]>([]);

  // Suchfeld aus URL (?search=.)
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

  // ---- Vorselektion Kategorie aus Navbar (?kategorie=.) ----
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

  // 1) Viewer-Typ laden (privat/gewerblich)
  useEffect(() => {
    const supa = supabaseBrowser();
    supa.auth.getUser().then(({ data }) => {
      const isBiz = isBusinessUserFromMetadata(data.user?.user_metadata);
      setViewerIsBusiness(isBiz);
    });
  }, []);

  // 2) Artikel aus DB laden
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const limit = page === 1 ? 200 : 50;
        const offset = page === 1 ? 0 : (page - 1) * 50;

        const res = await fetch(`/api/articles?limit=${limit}&offset=${offset}`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? 'Fehler beim Laden');

        const rows = (json.articles ?? []) as ApiArticle[];

        // sell_to Sichtbarkeit (MVP):
        const visible = rows.filter((a) => {
          if (a.sell_to !== 'gewerblich') return true;
          return viewerIsBusiness;
        });

        const mapped: CardArtikel[] = visible.map((a) => {
          const sellTo = a.sell_to ?? 'beide';
          const gew = sellTo === 'gewerblich' || sellTo === 'beide';
          const priv = sellTo === 'beide';

          const unit = a.price_unit ?? (a.category?.toLowerCase() === 'arbeitsmittel' ? 'stueck' : 'kg');

          const mengeLabel =
            a.stock_status === 'auf_lager'
              ? 'Auf Lager'
              : unit === 'stueck'
                ? `${a.qty_piece ?? 0} Stück`
                : `${a.qty_kg ?? 0} kg`;

          const lieferdatumLabel = a.delivery_date_iso
            ? new Date(`${a.delivery_date_iso}T00:00:00`).toLocaleDateString('de-DE')
            : '—';

          const zustandSafe = (a.condition ?? a.zustand ?? '').trim() || '—';

          const preisLabel =
            a.price_from != null
              ? `Preis ab ${formatEuro(a.price_from)}${a.price_unit ? ` / ${a.price_unit === 'stueck' ? 'Stück' : 'kg'}` : ''}`
              : '';

          return {
            id: a.id,
            titel: a.title,
            mengeLabel,
            lieferdatumLabel,
            hersteller: a.manufacturer ?? '—',
            zustand: zustandSafe,
            kategorie: a.category ?? '—',
            preisLabel,
            bilder: a.image_urls ?? [],
            gesponsert: (a.promo_score ?? 0) > 0,
            gewerblich: gew && !priv ? true : sellTo === 'gewerblich',
            privat: priv && sellTo === 'beide',
            _sell_to: sellTo,
          };
        });

        if (!cancelled) {
          setArtikel(mapped);
          setAnzahlAnzeigen(50);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message ?? 'Unbekannter Fehler');
          setArtikel([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, viewerIsBusiness]);

  const maxAvailablePrice = useMemo(() => {
    const nums = artikel
      .map((a) => {
        const m = String(a.preisLabel ?? '').match(/(\d+,\d+|\d+\.\d+|\d+)/);
        if (!m) return 0;
        return Number(m[1].replace(',', '.'));
      })
      .filter((n) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) : 0;
  }, [artikel]);

  const [maxPreis, setMaxPreis] = useState(0);
  useEffect(() => setMaxPreis(maxAvailablePrice), [maxAvailablePrice]);

  // Artikel filtern
  const gefilterteArtikel = artikel
    .filter((a) => {
      if (!kategorie) return true;
      return normalizeKategorie(a.kategorie) === kategorie;
    })
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter((a) => {
      const m = String(a.preisLabel ?? '').match(/(\d+,\d+|\d+\.\d+|\d+)/);
      const p = m ? Number(m[1].replace(',', '.')) : 0;
      return p <= maxPreis;
    });

  // Suche
  const fuse = useMemo(() => new Fuse(gefilterteArtikel, {
    keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
    threshold: 0.35,
  }), [gefilterteArtikel]);

  const suchErgebnis = suchbegriff ? fuse.search(suchbegriff).map((r) => r.item) : gefilterteArtikel;

  // Sortierung: wenn leer => DB-Reihenfolge beibehalten
  const sortierteArtikel = useMemo(() => {
    if (!sortierung) return suchErgebnis;

    const arr = [...suchErgebnis];
    arr.sort((a, b) => {
      switch (sortierung) {
        case 'titel-az':
          return a.titel.localeCompare(b.titel);
        case 'titel-za':
          return b.titel.localeCompare(a.titel);
        default:
          return 0;
      }
    });
    return arr;
  }, [suchErgebnis, sortierung]);

  // Infinite-Scroll nur auf Seite 1 (wie bisher)
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

  // Seite zurücksetzen, wenn Filter ändern (außer page)
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
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <input
            className={styles.input}
            type="text"
            placeholder="Artikel finden."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <select className={styles.sortSelect} value={sortierung} onChange={(e) => setSortierung(e.target.value)}>
            <option value="">Sortieren</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
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
          <div className={styles.mengeText}>Max. Preis: {maxPreis.toFixed(2)} €</div>

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
                    setZustand((prev) => (prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]))
                  }
                />
                {z}
              </label>
            ))}
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Verkauf an</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={gewerblich} onChange={(e) => setGewerblich(e.target.checked)} />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={privat} onChange={(e) => setPrivat(e.target.checked)} />
              Privat
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Hersteller</strong>
            <input
              className={styles.input}
              type="text"
              placeholder="Hersteller filtern (Enter)…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.currentTarget.value || '').trim();
                  if (!v) return;
                  setHersteller((prev) => (prev.includes(v) ? prev : [...prev, v]));
                  e.currentTarget.value = '';
                }
              }}
            />
            {hersteller.map((h) => (
              <div key={h} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span>{h}</span>
                <button
                  type="button"
                  onClick={() => setHersteller((prev) => prev.filter((x) => x !== h))}
                  style={{ cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.content}>
          {loading && <div style={{ padding: 12 }}>Lade Artikel…</div>}
          {loadError && (
            <div style={{ padding: 12 }}>
              <strong>Fehler:</strong> {loadError}
            </div>
          )}

          <h3 style={{ marginTop: 0 }}>{sortierteArtikel.length} Artikel im Shop</h3>

          <div className={styles.grid}>
            {(page === 1 ? sortierteArtikel.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => (
              <ArtikelCard key={a.id} artikel={a} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>
        </div>
      </div>
    </>
  );
}
