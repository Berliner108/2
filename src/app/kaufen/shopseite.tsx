'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ArtikelCard from '../components/ArtikelKarteShop';
import { supabaseBrowser } from '@/lib/supabase-browser';
import BoerseLoading from '../components/loading/BoerseLoading';

// ---- Helpers: Kategorie robust normalisieren ----
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();
const CAT_MAP: Record<string, 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel' | 'Galvano-Zubehör'> = {
  nasslack: 'Nasslack',
  nasslacke: 'Nasslack',
  pulverlack: 'Pulverlack',
  pulverlacke: 'Pulverlack',
  arbeitsmittel: 'Arbeitsmittel',
  'arbeitsmittel & zubehör': 'Arbeitsmittel',
  galvano_zubehoer: 'Galvano-Zubehör',
  'galvano-zubehoer': 'Galvano-Zubehör',
  'galvano-zubehör': 'Galvano-Zubehör',
  galvanozubehoer: 'Galvano-Zubehör',
  galvanozubehör: 'Galvano-Zubehör',
};
const normalizeKategorie = (s?: string | null) => CAT_MAP[norm(s)] ?? '';

const kategorien: Array<'Nasslack' | 'Pulverlack' | 'Arbeitsmittel' | 'Galvano-Zubehör'> = ['Nasslack', 'Pulverlack', 'Arbeitsmittel', 'Galvano-Zubehör'];
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
  versand?: number | null;
  bilder: string[];
  einheit: 'kg' | 'stueck';
  seller_account_type?: "business" | "private" | null;
  gesponsert?: boolean;
  promo_score?: number;
  gewerblich?: boolean;
  privat?: boolean;
  sale_type?: "gesamt" | "pro_kg" | "pro_stueck" | null;
  price_mode?: "legacy_gross" | "net" | "no_vat" | null;

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
  shipping_from?: number | null;
  price_unit?: 'kg' | 'stueck' | null;
  condition?: string | null; // optional, falls API liefert
  zustand?: string | null;   // optional fallback
  sale_type?: "gesamt" | "pro_kg" | "pro_stueck" | null;
  price_mode?: "legacy_gross" | "net" | "no_vat" | null;

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
  const [totalCount, setTotalCount] = useState(0);
  const [maxAvailablePrice, setMaxAvailablePrice] = useState(0);
  const [maxPreis, setMaxPreis] = useState(0);

    // ✅ Toast für Promo-Erfolg/Abbruch/Fehler (kommt über ?promo=success|cancel|failed)
  const [promoToast, setPromoToast] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const promo = searchParams.get("promo");
    if (!promo) return;

    if (promo === "success") {
      setPromoToast({ type: "success", text: "Bewerbung erfolgreich – dein Promo-Score wurde erhöht." });
    } else if (promo === "cancel") {
      setPromoToast({ type: "info", text: "Zahlung abgebrochen – keine Bewerbung durchgeführt." });
    } else if (promo === "failed") {
      setPromoToast({ type: "error", text: "Zahlung fehlgeschlagen – keine Bewerbung durchgeführt." });
    }

    // nach ein paar Sekunden automatisch ausblenden
    const t = window.setTimeout(() => setPromoToast(null), 4500);

    // URL bereinigen, damit Toast bei Reload nicht erneut kommt
    const params = new URLSearchParams(searchParams.toString());
    params.delete("promo");
    params.delete("session_id"); // optional
    const next = params.toString() ? `?${params.toString()}` : location.pathname;
    router.replace(next, { scroll: false });

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  // Suchfeld aus URL (?search=...)
  const [suchbegriff, setSuchbegriff] = useState(() => searchParams.get('search') ?? '');
  const [suchEingabe, setSuchEingabe] = useState(() => searchParams.get('search') ?? '');
  useEffect(() => {
    const q = searchParams.get('search') ?? '';
    setSuchbegriff(q);
    setSuchEingabe(q);
  }, [searchParams]);

  // Filter-States
  const [kategorie, setKategorie] = useState<'' | 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel' | 'Galvano-Zubehör'>('');
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

  // 2) Artikel serverseitig filtern/paginieren – gleiches Prinzip wie Lackanfragen
  useEffect(() => {
    if (!viewerChecked) return;

    let cancelled = false;

    async function loadArticles() {
      try {
        setLoading(true);
        setLoadError(null);

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(seitenGroesse));
        params.set('viewerBusiness', viewerIsBusiness ? '1' : '0');

        if (suchbegriff.trim()) params.set('q', suchbegriff.trim());
        if (kategorie) params.set('kategorie', kategorie);
        if (zustand.length) params.set('zustand', zustand.join(','));
        if (hersteller.length) params.set('hersteller', hersteller.join(','));
        if (gewerblich) params.set('g', '1');
        if (privat) params.set('p', '1');
        if (sortierung) params.set('sort', sortierung);

        // Beim ersten Laden ist der Slider noch nicht initialisiert.
        // Sobald maxAvailablePrice bekannt ist, ist auch max=0 ein echter Filterwert.
        if (maxAvailablePrice > 0 || maxPreis > 0) {
          params.set('max', String(maxPreis));
        }

        const res = await fetch(`/api/articles?${params.toString()}`, {
          cache: 'no-store',
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? 'Fehler beim Laden der Artikel');

        const rows = (json.articles ?? []) as ApiArticle[];

        const mapped: ShopArtikel[] = rows.map((a) => {
          const sellTo = (a.sell_to ?? 'beide') as 'gewerblich' | 'beide';

          const unit: 'kg' | 'stueck' =
            a.price_unit === 'stueck'
              ? 'stueck'
              : a.price_unit === 'kg'
                ? 'kg'
                : norm(a.category) === 'arbeitsmittel' || norm(a.category) === 'galvano_zubehoer'
                  ? 'stueck'
                  : 'kg';

          const qtyForUnit =
            unit === 'stueck' ? (a.qty_piece ?? null) : (a.qty_kg ?? null);

          const displayQty =
            a.stock_status === 'begrenzt'
              ? (typeof qtyForUnit === 'number' ? qtyForUnit : safeNumber(qtyForUnit, 0))
              : undefined;

          return {
            id: a.id,
            titel: a.title ?? '',
            hersteller: a.manufacturer ?? '—',
            zustand: String(a.condition ?? a.zustand ?? '').trim() || '—',
            kategorie: a.category ?? '—',
            preis: safeNumber(a.price_from, 0),
            versand:
              a.shipping_from == null
                ? null
                : safeNumber(a.shipping_from, 0),
            menge: displayQty,
            lieferdatum: isoToDate(a.delivery_date_iso),
            bilder: Array.isArray(a.image_urls) ? a.image_urls : [],
            seller_account_type: (a as any).seller_account_type ?? null,
            einheit: unit,
            promo_score: safeNumber(a.promo_score, 0),
            gesponsert: safeNumber(a.promo_score, 0) > 0,
            gewerblich: sellTo === 'gewerblich' || sellTo === 'beide',
            privat: sellTo === 'beide',
            sale_type: a.sale_type ?? null,
            price_mode: a.price_mode ?? "legacy_gross",
          };
        });

        if (!cancelled) {
          setArtikelDaten(mapped);
          setTotalCount(safeNumber(json.total, 0));

          const serverMax = safeNumber(json.max_price, 0);
          setMaxAvailablePrice(serverMax);
          setMaxPreis((prev) => {
            if (prev === 0 && maxAvailablePrice === 0) return serverMax;
            return Math.min(prev, serverMax);
          });

          setAnzahlAnzeigen(50);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message ?? 'Unbekannter Fehler');
          setArtikelDaten([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadArticles();

    return () => {
      cancelled = true;
    };
  }, [
    viewerChecked,
    viewerIsBusiness,
    page,
    suchbegriff,
    kategorie,
    zustand,
    hersteller,
    gewerblich,
    privat,
    sortierung,
    maxPreis,
    maxAvailablePrice,
  ]);

  // Infinite-Scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (page !== 1) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAnzahlAnzeigen((prev) => Math.min(prev + 10, artikelDaten.length));
        }
      },
      { rootMargin: '100px' }
    );
    loadMoreRef.current && observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [artikelDaten, page]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / seitenGroesse));

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage <= 1) params.delete('page');
    else params.set('page', String(targetPage));

    const qs = params.toString();
    return qs ? `?${qs}` : location.pathname;
  };

    // Nur beim ersten Laden: einheitliches Börsen-Loading
    const bootLoading = loading && artikelDaten.length === 0;

    if (bootLoading) {
      return <BoerseLoading />;
    }

    return (
    <>
      <Navbar />
            {promoToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            zIndex: 9999,
            maxWidth: 420,
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
              color: "#fff",
              background:
                promoToast.type === "success"
                  ? "#16a34a"
                  : promoToast.type === "error"
                  ? "#dc2626"
                  : "#334155",
              fontWeight: 600,
            }}
          >
            {promoToast.text}
          </div>
        </div>
      )}


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
          <form
            className={styles.searchRow}
            onSubmit={(e) => {
              e.preventDefault();

              const q = suchEingabe.trim();
              setSuchbegriff(q);

              const params = new URLSearchParams(searchParams.toString());
              if (q) params.set('search', q);
              else params.delete('search');
              params.delete('page');

              const next = params.toString()
                ? `${location.pathname}?${params.toString()}`
                : location.pathname;

              router.replace(next, { scroll: false });
            }}
          >
            <input
              className={styles.input}
              type="text"
              placeholder="Artikel finden..."
              value={suchEingabe}
              onChange={(e) => setSuchEingabe(e.target.value)}
            />
            <button type="submit" className={styles.searchButton}>
              Suchen
            </button>
          </form>

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
            {loading ? 'Lade...' : `${totalCount} Artikel im Shop`}
          </h3>

          {loadError && (
            <div style={{ padding: '10px 0' }}>
              <strong>Fehler:</strong> {loadError}
            </div>
          )}

          {!loading && !loadError && totalCount === 0 && (
            <div style={{ padding: '10px 0', opacity: 0.9 }}>
              <strong>
                {suchbegriff || kategorie || zustand.length || hersteller.length || gewerblich || privat
                  ? 'Keine passenden Artikel gefunden.'
                  : 'Keine Artikel im Shop.'}
              </strong>
            </div>
          )}

          <div className={styles.grid}>
            {(page === 1 ? artikelDaten.slice(0, anzahlAnzeigen) : artikelDaten).map((a) => (
              <ArtikelCard key={String(a.id)} artikel={a} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>

          {/* Pagination */}
          <div className={styles.seitenInfo}>
            Seite {page} von {totalPages}
          </div>
          <div className={styles.pagination}>
            {page > 1 && (
              <Link href={pageHref(page - 1)} className={styles.pageArrow}>
                ←
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => {
              const p = i + 1;
              const href = pageHref(p);
              return (
                <Link key={p} href={href} className={`${styles.pageLink} ${page === p ? styles.activePage : ''}`}>
                  {p}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className={styles.pageArrow}>
                →
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
