'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelKarteShop';
import { supabaseBrowser } from '@/lib/supabase-browser';

// ---- Helpers: Kategorie robust normalisieren ----
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

type ShopArtikel = {
  id: string | number;
  titel: string;
  menge?: number;
  lieferdatum: Date;
  hersteller: string;
  zustand: string;
  kategorie: string;
  preis: number;
  bilder: string[];
  einheit: 'kg' | 'stueck';
  seller_account_type?: "business" | "private" | null;
  gesponsert?: boolean;
  gewerblich?: boolean;
  privat?: boolean;
  sale_type?: "gesamt" | "pro_kg" | "pro_stueck" | null;

};

type ApiArticle = {
  id: string;
  title: string;
  category?: string | null;
  manufacturer?: string | null;
  promo_score?: number | null;
  delivery_date_iso?: string | null;
  stock_status?: 'auf_lager' | 'begrenzt' | null;
  qty_kg?: number | null;
  qty_piece?: number | null;
  image_urls?: string[] | null;
  sell_to?: 'gewerblich' | 'beide' | null;
  price_from?: number | null;
  price_unit?: 'kg' | 'stueck' | null;
  condition?: string | null; // optional, falls API liefert
  zustand?: string | null;   // optional fallback
  sale_type?: "gesamt" | "pro_kg" | "pro_stueck" | null;

};

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isoToDate(iso: any): Date {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00`);
  return new Date();
}

export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewerChecked, setViewerChecked] = useState(false);
  const [viewerIsBusiness, setViewerIsBusiness] = useState(false);

  const [artikelDaten, setArtikelDaten] = useState<ShopArtikel[]>([]);

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

  // 1) Viewer Account-Type aus profiles holen (business/private)
  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      try {
        const supa = supabaseBrowser();
        const { data } = await supa.auth.getUser();
        const user = data.user;

        if (!user) {
          if (!cancelled) setViewerIsBusiness(false);
          return;
        }

        const { data: prof, error } = await supa
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          // falls RLS blockt, bleiben wir vorsichtig bei "private"
          if (!cancelled) setViewerIsBusiness(false);
          return;
        }

        if (!cancelled) setViewerIsBusiness(prof?.account_type === 'business');
      } finally {
        if (!cancelled) setViewerChecked(true);
      }
    }

    loadViewer();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Artikel aus DB laden (nach Viewer-Check, damit sell_to Filter korrekt ist)
  useEffect(() => {
    if (!viewerChecked) return;

    let cancelled = false;

    async function loadArticles() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/articles?limit=200&offset=0`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? 'Fehler beim Laden der Artikel');

        const rows = (json.articles ?? []) as ApiArticle[];

        // sell_to Filter (MVP):
        const visible = rows.filter((a) => {
          const sellTo = (a.sell_to ?? 'beide') as 'gewerblich' | 'beide';
          if (sellTo === 'gewerblich') return viewerIsBusiness;
          return true;
        });

        const mapped: ShopArtikel[] = visible.map((a) => {
          const sellTo = (a.sell_to ?? 'beide') as 'gewerblich' | 'beide';

          // Einheit aus DB, fallback: Arbeitsmittel => Stück, sonst kg
          const unit: 'kg' | 'stueck' =
            a.price_unit === 'stueck'
              ? 'stueck'
              : a.price_unit === 'kg'
              ? 'kg'
              : norm(a.category) === 'arbeitsmittel'
              ? 'stueck'
              : 'kg';

          // Menge passend zur Einheit (Fallback 0)
          // Menge passend zur Einheit:
// - begrenzt => Zahl anzeigen
// - auf_lager => undefined, damit Karte "Auf Lager" zeigen kann
            const qtyForUnit =
              unit === "stueck" ? (a.qty_piece ?? null) : (a.qty_kg ?? null);

            const displayQty =
              a.stock_status === "begrenzt"
                ? (typeof qtyForUnit === "number" ? qtyForUnit : safeNumber(qtyForUnit, 0))
                : undefined;


          return {
            id: a.id,
            titel: a.title ?? '',
            hersteller: a.manufacturer ?? '—',
            zustand: String(a.condition ?? a.zustand ?? "").trim() || "—",
            kategorie: a.category ?? '—',
            preis: safeNumber(a.price_from, 0),
            menge: displayQty,
            lieferdatum: isoToDate(a.delivery_date_iso),
            bilder: Array.isArray(a.image_urls) ? a.image_urls : [],
            seller_account_type: (a as any).seller_account_type ?? null,
            einheit: unit,
            gesponsert: safeNumber(a.promo_score, 0) > 0,
            gewerblich: sellTo === 'gewerblich' || sellTo === 'beide',
            privat: sellTo === 'beide',
            sale_type: (a.sale_type ?? null),
          };
        });

        if (!cancelled) {
          setArtikelDaten(mapped);
          setAnzahlAnzeigen(50);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message ?? 'Unbekannter Fehler');
          setArtikelDaten([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadArticles();
    return () => {
      cancelled = true;
    };
  }, [viewerChecked, viewerIsBusiness]);

  // Dynamisch höchsten Preis (wenn keine Artikel -> 0)
  const maxAvailablePrice = useMemo(() => {
    if (!artikelDaten.length) return 0;
    return Math.max(...artikelDaten.map((a) => safeNumber(a.preis, 0)));
  }, [artikelDaten]);

  const [maxPreis, setMaxPreis] = useState(0);
  useEffect(() => {
    setMaxPreis((prev) => (prev === 0 ? maxAvailablePrice : Math.min(prev, maxAvailablePrice)));
  }, [maxAvailablePrice]);

  // Artikel filtern – Kategorie robust vergleichen
  const gefilterteArtikel = artikelDaten
    .filter((a) => {
      if (!kategorie) return true;
      return normalizeKategorie(a.kategorie) === kategorie;
    })
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter((a) => safeNumber(a.preis, 0) <= maxPreis);

  // Suche
  const fuse = useMemo(
    () =>
      new Fuse(gefilterteArtikel, {
        keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
        threshold: 0.35,
      }),
    [gefilterteArtikel]
  );

  const suchErgebnis = suchbegriff ? fuse.search(suchbegriff).map((r) => r.item) : gefilterteArtikel;

  // Default: sponsored first, rest in API order (stable partition)
  const sponsoredFirst = useMemo(() => {
    const sponsored = suchErgebnis.filter((a) => a.gesponsert);
    const rest = suchErgebnis.filter((a) => !a.gesponsert);
    return [...sponsored, ...rest];
  }, [suchErgebnis]);

  // Sortierung (optional)
  const sortierteArtikel = useMemo(() => {
    if (!sortierung) return sponsoredFirst;

    const arr = [...sponsoredFirst];
    arr.sort((a, b) => {
      switch (sortierung) {
        case 'lieferdatum-auf':
          return a.lieferdatum.getTime() - b.lieferdatum.getTime();
        case 'lieferdatum-ab':
          return b.lieferdatum.getTime() - a.lieferdatum.getTime();
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
  }, [sponsoredFirst, sortierung]);

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
      <button className={styles.hamburger} onClick={() => setSidebarOpen((open) => !open)} aria-label="Sidebar öffnen">
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
            <option value="lieferdatum-auf">Lieferdatum ↑</option>
            <option value="lieferdatum-ab">Lieferdatum ↓</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge ↑</option>
            <option value="menge-ab">Menge ↓</option>
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
          />
          <div className={styles.mengeText}>Max. Preis: {maxPreis.toFixed(2)} €</div>

          {/* Kategorie */}
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

          {/* Zustand */}
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
            <div style={{ padding: '10px 0' }}>
              <strong>Fehler:</strong> {loadError}
            </div>
          )}

          {!loading && !loadError && sortierteArtikel.length === 0 && (
            <div style={{ padding: '10px 0', opacity: 0.9 }}>
              <strong>Keine Artikel sichtbar.</strong> (Wenn du private bist, können „nur Gewerblich“-Artikel verborgen sein.)
            </div>
          )}

          <div className={styles.grid}>
            {(page === 1 ? sortierteArtikel.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => (
              <ArtikelCard key={String(a.id)} artikel={a} />
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
