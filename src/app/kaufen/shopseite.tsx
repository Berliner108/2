'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelKarteShop';

// ---- Helpers: Kategorie robust normalisieren ----
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
const CAT_MAP: Record<string, 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'> = {
  // Nasslack(e)
  nasslack: 'Nasslack',
  nasslacke: 'Nasslack',
  // Pulverlack(e)
  pulverlack: 'Pulverlack',
  pulverlacke: 'Pulverlack',
  // Arbeitsmittel
  arbeitsmittel: 'Arbeitsmittel',
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

// Shape, den deine Artikelkarte aktuell erwartet (Dummy-kompatibel)
type ShopArtikel = {
  id: string;
  titel: string;
  hersteller?: string;
  zustand?: string;
  kategorie?: string;

  // Für Preisfilter + Anzeige (wir mappen DB price_from -> preis)
  preis: number;

  // Anzeige-Lieferdatum (aus API berechnet: delivery_date_iso)
  lieferdatum?: string;

  // Menge (dummy: menge; wir mappen qty_kg/qty_piece -> menge)
  menge?: number;

  // Verkaufstyp-Filter
  gewerblich?: boolean;
  privat?: boolean;

  // Sponsor-Badge (dummy: gesponsert)
  gesponsert?: boolean;

  // Bilder (dummy: bilder[])
  bilder?: string[];
};

export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [artikelDaten, setArtikelDaten] = useState<ShopArtikel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Suchfeld aus URL (?search=...)
  const [suchbegriff, setSuchbegriff] = useState(() => searchParams.get('search') ?? '');
  useEffect(() => {
    setSuchbegriff(searchParams.get('search') ?? '');
  }, [searchParams]);

  // Pagination aus URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const seitenGroesse = 50;
  const startIndex = (page - 1) * seitenGroesse;
  const endIndex = page * seitenGroesse;

  // Daten aus DB laden (über deine API)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/articles?limit=200&offset=0`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error ?? 'Fehler beim Laden der Artikel');
        }

        const mapped: ShopArtikel[] = (json?.articles ?? []).map((a: any) => {
          const sellTo = a.sell_to as 'gewerblich' | 'beide' | undefined;

          // Preis "ab" (Brutto) kommt aus API als price_from
          const priceFrom =
            typeof a.price_from === 'number'
              ? a.price_from
              : a.price_from
              ? Number(a.price_from)
              : 0;

          // Menge: bei Lack eher kg, bei Arbeitsmittel eher Stück – Karte zeigt aktuell "kg" fix,
          // wir liefern trotzdem die Zahl. (Label fixen wir in der Karte im nächsten Schritt.)
          const qty =
            a.qty_kg != null ? Number(a.qty_kg) : a.qty_piece != null ? Number(a.qty_piece) : undefined;

          return {
            id: String(a.id),
            titel: a.title ?? '',
            hersteller: a.manufacturer ?? '',
            zustand: a.condition ?? '', // wenn DB-Feld "condition" vorhanden
            kategorie: a.category ?? '',

            preis: Number.isFinite(priceFrom) ? priceFrom : 0,

            // aus API: delivery_date_iso (Berlin + Werktage + Feiertage)
            lieferdatum: a.delivery_date_iso ?? undefined,

            menge: Number.isFinite(qty as number) ? (qty as number) : undefined,

            // Mapping auf deine bisherigen Filter:
            // - gewerblich: true bei 'gewerblich' oder 'beide'
            // - privat: true nur bei 'beide' (weil es kein 'privat-only' in sell_to gibt)
            gewerblich: sellTo === 'gewerblich' || sellTo === 'beide',
            privat: sellTo === 'beide',

            // Sponsor
            gesponsert: Number(a.promo_score ?? 0) > 0,

            // Bilder
            bilder: Array.isArray(a.image_urls) ? a.image_urls : [],
          };
        });

        if (!cancelled) {
          setArtikelDaten(mapped);
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

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Dynamisch höchsten Preis (jetzt: preis = price_from brutto)
  const maxAvailablePrice = Math.max(0, ...artikelDaten.map((a) => Number(a.preis ?? 0)));
  const [maxPreis, setMaxPreis] = useState(0);

  // beim ersten Laden Slider-Max setzen (und bei Datenänderung clampen)
  useEffect(() => {
    setMaxPreis((prev) => {
      if (prev === 0) return maxAvailablePrice;
      return Math.min(prev, maxAvailablePrice);
    });
  }, [maxAvailablePrice]);

  // Filter-States
  const [kategorie, setKategorie] = useState<'' | 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel'>('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(50);

  // ---- Vorselektion Kategorie aus Navbar (?kategorie=...) ----
  useEffect(() => {
    const qKat = searchParams.get('kategorie');
    const normalized = normalizeKategorie(qKat);
    if (normalized) setKategorie(normalized);
    else if (!qKat) setKategorie(''); // wenn kein Param da ist, auf "Alle"
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

  // Artikel filtern – Kategorie robust vergleichen
  const gefilterteArtikel = artikelDaten
    .filter((a) => {
      if (!kategorie) return true;
      return normalizeKategorie(a.kategorie) === kategorie;
    })
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand ?? ''))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller ?? ''))
    .filter((a) => (a.preis ?? 0) <= maxPreis);

  // Suche
  const fuse = new Fuse(gefilterteArtikel, {
    keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
    threshold: 0.35,
  });
  const suchErgebnis = suchbegriff ? fuse.search(suchbegriff).map((r) => r.item) : gefilterteArtikel;

  // Sortierung:
  // WICHTIG: Standardmäßig NICHT sortieren -> DB-Reihenfolge bleibt (promo + random kommt aus API)
  const sortierteArtikel = (() => {
    if (!sortierung) return suchErgebnis;

    const arr = [...suchErgebnis];
    arr.sort((a, b) => {
      switch (sortierung) {
        case 'lieferdatum-auf':
          return new Date(a.lieferdatum ?? 0).getTime() - new Date(b.lieferdatum ?? 0).getTime();
        case 'lieferdatum-ab':
          return new Date(b.lieferdatum ?? 0).getTime() - new Date(a.lieferdatum ?? 0).getTime();
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

  // Infinite-Scroll (nur Seite 1)
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
          <div className={styles.mengeText}>Max. Preis: {Number(maxPreis).toFixed(2)} €</div>

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

          <div className={styles.grid}>
            {(page === 1 ? sortierteArtikel.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => (
              <ArtikelCard key={a.id} artikel={a} />
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
