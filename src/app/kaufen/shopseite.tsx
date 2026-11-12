'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './kaufen.module.css';
import Navbar from '../components/navbar/Navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import ArtikelCard from '../components/ArtikelKarteShop';
import { supabaseBrowser } from '@/lib/supabase-browser';
import ArtikelKartenSkeleton from '../components/loading/ArtikelKartenSkeleton';
import boerseLoadingStyles from '../auftragsboerse/auftragsboerse.module.css';

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

const herstellerFilterPulver = [
  'AkzoNobel',
  'Asian Paints',
  'Axalta',
  'Bellaria',
  'Berger',
  'Bollmann & Co. Pulverlacke',
  'Brillux Industrial Coatings',
  'Bub',
  'Colorine',
  'COLORE',
  'CWS Powder Coatings',
  'DuPont',
  'E-Pulverit',
  'FreiLacke',
  'Ganzlin',
  'Grimm Pulverlacke',
  'IGP Powder Coatings',
  'INVER',
  'Jotun',
  'KABE Farben',
  'KANSAI HELIOS',
  'MOTEC Pulverlack',
  'Nerolac',
  'Nippon Paint',
  'PPG',
  'Pulver Kimya',
  'Pulverkönig',
  'RELIUS',
  'RIPOL',
  'Serlac',
  'Sherwin-Williams',
  'ST Powder Coatings',
  'Teknos',
  'Teodur',
  'TIGER Coatings',
  'Valspar',
  'Wörwag',
];

const herstellerFilterNass = [
  'ADLER Lacke',
  'AkzoNobel',
  'Asian Paints',
  'Axalta',
  'BASF',
  'Beckers Group',
  'Benjamin Moore',
  'Berger',
  'Brillux Industrial Coatings',
  'CIN',
  'Colorine',
  'DAW / Caparol',
  'Dold',
  'DuPont',
  'Farben Morscher',
  'FEYCOLOR',
  'FreiLacke',
  'GV Lacke',
  'Hempel',
  'Hesse Lignal',
  'INVER',
  'IVM Chemicals / Milesi',
  'Jotun',
  'KABE Farben',
  'KANSAI HELIOS',
  'Mäder',
  'Mankiewicz',
  'Meffert',
  'Mipa',
  'Nerolac',
  'Nippon Paint',
  'PPG',
  'RELIUS',
  'Remmers',
  'Sherwin-Williams',
  'Sika',
  'Stahl',
  'Teknos',
  'Tikkurila',
  'Valspar',
  'Wörwag',
];

const herstellerFilterAlle = Array.from(
  new Set([...herstellerFilterNass, ...herstellerFilterPulver])
);

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
  viewer_is_business?: boolean;
  viewer_country?: "DE" | "AT" | null;
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

function normalizeCountryCode(v: unknown): "DE" | "AT" | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "de" || s === "deutschland" || s === "germany") return "DE";
  if (s === "at" || s === "österreich" || s === "oesterreich" || s === "austria") return "AT";
  return null;
}

function isoToDate(iso: any): Date {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00`);
  return new Date();
}

// Einheitliches Mapping für Suchtreffer und Empfehlungen.
function mapApiArticles(rows: ApiArticle[], viewerIsBusiness: boolean, viewerCountry: "DE" | "AT" | null): ShopArtikel[] {
  return rows.map((a) => {
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
            viewer_is_business: viewerIsBusiness,
            viewer_country: viewerCountry,
            einheit: unit,
            promo_score: safeNumber(a.promo_score, 0),
            gesponsert: safeNumber(a.promo_score, 0) > 0,
            gewerblich: sellTo === 'gewerblich' || sellTo === 'beide',
            privat: sellTo === 'beide',
            sale_type: a.sale_type ?? null,
            price_mode: a.price_mode ?? "legacy_gross",
          };
  });
}

export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Scrollposition unabhängig vom Ladezustand der Artikel erhalten.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollZielRef = useRef<{ typ: 'position' | 'artikelliste'; y?: number } | null>(null);
  const initialisiertRef = useRef(false);

  // Rückkehr von der Artikeldetailseite und echte Seitenwechsel (Pagination).
  useLayoutEffect(() => {
    if (initialisiertRef.current) return;
    initialisiertRef.current = true;
    const url = window.location.pathname + window.location.search;
    try {
      const pageNav = window.sessionStorage.getItem('shop:seitenwechsel');
      if (pageNav === url) {
        window.sessionStorage.removeItem('shop:seitenwechsel');
        scrollZielRef.current = { typ: 'artikelliste' };
        return;
      }
      const rueckkehrRaw = window.sessionStorage.getItem('shop:rueckkehr');
      if (rueckkehrRaw) {
        const rueckkehr = JSON.parse(rueckkehrRaw) as { url: string; y: number; hoehe: number };
        if (rueckkehr.url === url && Number.isFinite(rueckkehr.y)) {
          window.sessionStorage.removeItem('shop:rueckkehr');
          scrollZielRef.current = { typ: 'position', y: rueckkehr.y };
          if (contentRef.current && rueckkehr.hoehe > 0) {
            contentRef.current.style.minHeight = `${Math.ceil(rueckkehr.hoehe)}px`;
          }
        }
      }
    } catch {
      // Storage kann im Privatmodus blockiert sein; der Shop funktioniert trotzdem.
    }
  }, []);

  // Nach Abschluss des Ladens die gespeicherte Position wiederherstellen.
  useLayoutEffect(() => {
    if (loading || !scrollZielRef.current) return;
    const ziel = scrollZielRef.current;
    scrollZielRef.current = null;
    window.requestAnimationFrame(() => {
      if (ziel.typ === 'artikelliste') {
        const oben = contentRef.current?.getBoundingClientRect().top ?? 0;
        window.scrollTo({ top: window.scrollY + oben, behavior: 'instant' });
      } else {
        window.scrollTo({ top: ziel.y ?? 0, behavior: 'instant' });
      }
    });
  }, [loading]);

  const artikelNavigationMerken = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!link || !link.getAttribute('href')?.startsWith('/kaufen/artikel/')) return;
    try {
      window.sessionStorage.setItem('shop:rueckkehr', JSON.stringify({
        url: window.location.pathname + window.location.search,
        y: window.scrollY,
        hoehe: contentRef.current?.getBoundingClientRect().height ?? 0,
      }));
    } catch { /* Storage optional */ }
  };

  const seitenwechselMerken = (url: string) => {
    try {
      window.sessionStorage.setItem('shop:seitenwechsel', url);
      window.sessionStorage.removeItem('shop:rueckkehr');
    } catch { /* Storage optional */ }
  };

  const [viewerChecked, setViewerChecked] = useState(false);
  const [viewerIsBusiness, setViewerIsBusiness] = useState(false);
  const [viewerCountry, setViewerCountry] = useState<"DE" | "AT" | null>(null);

  const [artikelDaten, setArtikelDaten] = useState<ShopArtikel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [zeigeAlternativen, setZeigeAlternativen] = useState(false);
  const [weitereArtikel, setWeitereArtikel] = useState<ShopArtikel[]>([]);
  const [maxAvailablePrice, setMaxAvailablePrice] = useState(0);
  const [maxPreis, setMaxPreis] = useState(0);
  // Der Slider wird erst nach einer bewussten Nutzeränderung zum API-Filter.
  // Sonst löst die Initialisierung des Höchstpreises eine zweite Abfrage aus.
  const [preisFilterAktiv, setPreisFilterAktiv] = useState(false);
  const wirksamerMaxPreis = preisFilterAktiv ? maxPreis : null;

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
  const [kategorie, setKategorie] = useState<'' | 'Nasslack' | 'Pulverlack' | 'Arbeitsmittel' | 'Galvano-Zubehör'>(
    () => normalizeKategorie(searchParams.get('kategorie'))
  );
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(50);

  const aktuelleHerstellerFilter =
    kategorie === 'Nasslack'
      ? herstellerFilterNass
      : kategorie === 'Pulverlack'
      ? herstellerFilterPulver
      : herstellerFilterAlle;

  useEffect(() => {
    setHersteller((prev) =>
      prev.filter((name) => aktuelleHerstellerFilter.includes(name))
    );
  }, [kategorie]);

  // Pagination aus URL
  const pageRaw = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const seitenGroesse = 50;
  // ---- Vorselektion Kategorie aus Navbar (?kategorie=...) ----
  useEffect(() => {
    const qKat = searchParams.get('kategorie');
    const normalized = normalizeKategorie(qKat);
    if (normalized) setKategorie(normalized);
    else if (!qKat) setKategorie('');
  }, [searchParams]);

  // Seitenwechsel dürfen nicht durch Filter-Synchronisierung zurückgesetzt werden.
  // Nur echte Nutzeränderungen an Filtern setzen auf Seite 1 zurück.
  const resetPageForFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('page')) return;
    params.delete('page');
    const next = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.replace(next, { scroll: false });
  };

  const changeKategorie = (nextKategorie: typeof kategorie) => {
    setKategorie(nextKategorie);
    const params = new URLSearchParams(searchParams.toString());
    if (nextKategorie) params.set('kategorie', nextKategorie);
    else params.delete('kategorie');
    params.delete('page');
    const next = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.replace(next, { scroll: false });
  };

  // 1) Viewer Account-Type aus profiles holen (business/private)
  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      try {
        const supa = supabaseBrowser();
        const { data } = await supa.auth.getUser();
        const user = data.user;

        if (!user) {
          if (!cancelled) {
            setViewerIsBusiness(false);
            setViewerCountry(null);
          }
          return;
        }

        const { data: prof, error } = await supa
          .from('profiles')
          .select('account_type, address')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          // falls RLS blockt, bleiben wir vorsichtig bei "private"
          if (!cancelled) {
            setViewerIsBusiness(false);
            setViewerCountry(null);
          }
          return;
        }

        if (!cancelled) {
          setViewerIsBusiness(prof?.account_type === 'business');
          setViewerCountry(normalizeCountryCode((prof as any)?.address?.country));
        }
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
        // Der Loader ist kürzer als die echte Artikelliste. Ohne reservierte Höhe
        // würde der Browser am Seitenende die Scrollposition nach oben begrenzen.
        if (contentRef.current) {
          const bisherigeHoehe = contentRef.current.getBoundingClientRect().height;
          const reserviert = Number.parseFloat(contentRef.current.style.minHeight) || 0;
          contentRef.current.style.minHeight = `${Math.ceil(Math.max(bisherigeHoehe, reserviert))}px`;
        }
        // Bei Filtern/Suche/Sortierung bleibt die Position unverändert.
        if (!scrollZielRef.current) {
          scrollZielRef.current = { typ: 'position', y: window.scrollY };
        }
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

        // Erst eine aktive Nutzeränderung des Sliders filtert nach Höchstpreis.
        if (wirksamerMaxPreis !== null) {
          params.set('max', String(wirksamerMaxPreis));
        }

        const res = await fetch(`/api/articles?${params.toString()}`, {
          cache: 'no-store',
        });
        let json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? 'Fehler beim Laden der Artikel');

        // Die echten Treffer bleiben unverändert. Empfehlungen erscheinen
        // bei 0–3 Treffern einer Suche ODER eines aktiven Filters separat.
        const echteTrefferzahl = safeNumber(json.total, 0);
        const hatAktivenFilter = Boolean(
          suchbegriff.trim() || kategorie || zustand.length || hersteller.length ||
          gewerblich || privat || preisFilterAktiv
        );
        const empfehlungenAnzeigen = page === 1 && hatAktivenFilter && echteTrefferzahl <= 3;
        const rows = (json.articles ?? []) as ApiArticle[];
        const mapped = mapApiArticles(rows, viewerIsBusiness, viewerCountry);
        let empfehlungen: ShopArtikel[] = [];

        if (empfehlungenAnzeigen) {
          try {
            // Bewusst ohne Such-/Kategorie-/Zustands-/Hersteller-/Verkaufstyp-
            // oder Preisfilter; die Sichtbarkeit je Käuferprofil bleibt bestehen.
            const weitereParams = new URLSearchParams({
              page: '1',
              limit: '50',
              viewerBusiness: viewerIsBusiness ? '1' : '0',
            });
            const weitereRes = await fetch(`/api/articles?${weitereParams.toString()}`, {
              cache: 'no-store',
            });
            if (weitereRes.ok) {
              const weitereJson = await weitereRes.json();
              const trefferIds = new Set(mapped.map(a => String(a.id)));
              const moegliche = mapApiArticles(
                Array.isArray(weitereJson.articles) ? weitereJson.articles : [],
                viewerIsBusiness, viewerCountry
              ).filter(a => !trefferIds.has(String(a.id)));

              // Falls es echte Treffer gibt: gleiche Kategorie bevorzugen.
              const kategorienTreffer = new Set(mapped.map(a => norm(a.kategorie)));
              empfehlungen = [
                ...moegliche.filter(a => kategorienTreffer.has(norm(a.kategorie))),
                ...moegliche.filter(a => !kategorienTreffer.has(norm(a.kategorie))),
              ].slice(0, 12);
            }
          } catch (e) {
            console.warn('Weitere Shopartikel konnten nicht geladen werden:', e);
            // Empfehlungen sind optional und dürfen echte Treffer nicht blockieren.
          }
        }

        if (!cancelled) {
          setArtikelDaten(mapped);
          setWeitereArtikel(empfehlungen);
          setZeigeAlternativen(empfehlungenAnzeigen && echteTrefferzahl === 0 && empfehlungen.length > 0);
          setTotalCount(echteTrefferzahl);

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
          setZeigeAlternativen(false);
          setWeitereArtikel([]);
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
    viewerCountry,
    page,
    suchbegriff,
    kategorie,
    zustand,
    hersteller,
    gewerblich,
    privat,
    sortierung,
    wirksamerMaxPreis,
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

  const totalPages = Math.max(1, Math.ceil(totalCount / seitenGroesse));

  // Echte Dokument-Navigation bei Seitenwechseln: URL und Serverabfrage
  // können nicht durch veralteten React-Zustand auseinanderlaufen.
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetPage <= 1) params.delete('page');
    else params.set('page', String(targetPage));

    const qs = params.toString();
    return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  };

    return (
    <>
      <Navbar />
      {loading && (
        <div className={boerseLoadingStyles.topLoader} aria-hidden="true">
          <div className={boerseLoadingStyles.topLoaderInner} />
        </div>
      )}
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
          <select className={styles.sortSelect} value={sortierung} onChange={(e) => { setSortierung(e.target.value); resetPageForFilter(); }}>
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum ↑</option>
            <option value="lieferdatum-ab">Lieferdatum ↓</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge ↑</option>
            <option value="menge-ab">Menge ↓</option>
            <option value="preis-auf">Preis inkl. Versand ↑</option>
            <option value="preis-ab">Preis inkl. Versand ↓</option>
          </select>

          {/* Preis-Slider */}
          <input
            className={styles.range}
            type="range"
            min={0}
            max={maxAvailablePrice}
            step={0.1}
            value={maxPreis}
            onChange={(e) => { setPreisFilterAktiv(true); setMaxPreis(Number(e.target.value)); resetPageForFilter(); }}
          />
          <div className={styles.mengeText}>Max. Preis inkl. Versand: {maxPreis.toFixed(2)} €</div>

          {/* Kategorie */}
          <div className={styles.checkboxGroup}>
            <strong>Kategorie</strong>
            {kategorien.map((k) => (
              <label key={k} className={styles.checkboxLabel}>
                <input type="radio" name="kategorie" checked={kategorie === k} onChange={() => changeKategorie(k)} />
                {k}
              </label>
            ))}
            <label className={styles.checkboxLabel}>
              <input type="radio" name="kategorie" checked={kategorie === ''} onChange={() => changeKategorie('')} />
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
                  onChange={() => { setZustand((prev) => (prev.includes(z) ? prev.filter((i) => i !== z) : [...prev, z])); resetPageForFilter(); }}
                />
                {z}
              </label>
            ))}
          </div>

          {/* Hersteller */}
          <div className={styles.checkboxGroup}>
            <strong>Hersteller / Marke</strong>
            {aktuelleHerstellerFilter.map((h) => (
              <label key={h} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hersteller.includes(h)}
                  onChange={() => {
                    setHersteller((prev) => (prev.includes(h) ? prev.filter((i) => i !== h) : [...prev, h]));
                    resetPageForFilter();
                  }}
                />
                {h}
              </label>
            ))}
          </div>

          {/* Verkaufstyp */}
          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={gewerblich} onChange={() => { setGewerblich((g) => !g); resetPageForFilter(); }} />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={privat} onChange={() => { setPrivat((p) => !p); resetPageForFilter(); }} />
              Privat
            </label>
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.content} ref={contentRef} onClickCapture={artikelNavigationMerken}>
          <h3 className={styles.anfrageUeberschrift} style={loading ? { visibility: 'hidden' } : undefined}>
            {suchbegriff.trim() && !zeigeAlternativen
              ? `${totalCount} Suchtreffer`
              : `${totalCount} Artikel im Shop`}
          </h3>

          {!loading && !loadError && zeigeAlternativen && (
            <div role="status" style={{ padding: '12px 0', lineHeight: 1.5 }}>
              Für deine aktuellen Such- und Filtereinstellungen wurden keine passenden Artikel gefunden.
              {' '}Hier findest du stattdessen andere verfügbare Artikel aus dem Shop.
            </div>
          )}

          {loadError && (
            <div style={{ padding: '10px 0' }}>
              <strong>Fehler:</strong> {loadError}
            </div>
          )}

          {!loading && !loadError && totalCount === 0 && !zeigeAlternativen && (
            <div style={{ padding: '10px 0', opacity: 0.9 }}>
              <strong>
                {suchbegriff || kategorie || zustand.length || hersteller.length || gewerblich || privat || preisFilterAktiv
                  ? 'Keine passenden Artikel gefunden.'
                  : 'Keine Artikel im Shop.'}
              </strong>
            </div>
          )}

          {loading ? (
            <ArtikelKartenSkeleton anzahl={6} />
          ) : (
            <div className={styles.grid}>
              {(page === 1 ? artikelDaten.slice(0, anzahlAnzeigen) : artikelDaten).map((a) => (
                <ArtikelCard key={String(a.id)} artikel={a} />
              ))}
              {page === 1 && <div ref={loadMoreRef} />}
            </div>
          )}

          {!loading && !loadError && weitereArtikel.length > 0 && (
            <section aria-label="Weitere Artikel entdecken" style={{ marginTop: 32 }}>
              <h3 className={styles.anfrageUeberschrift}>Weitere Artikel entdecken</h3>
              
              <div className={styles.grid}>
                {weitereArtikel.map((a) => (
                  <ArtikelCard key={`weitere-${String(a.id)}`} artikel={a} />
                ))}
              </div>
            </section>
          )}

          {/* Pagination */}
          {!loading && !zeigeAlternativen && <div className={styles.seitenInfo}>
            Seite {page} von {totalPages}
          </div>}
          {!loading && !zeigeAlternativen && <div className={styles.pagination}>
            {page > 1 && (
              <a href={pageHref(page - 1)} onClick={() => seitenwechselMerken(pageHref(page - 1))} className={styles.pageArrow}>
                ←
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => {
              const p = i + 1;
              const href = pageHref(p);
              return (
                <a key={p} href={href} onClick={() => { if (p !== page) seitenwechselMerken(href); }} className={`${styles.pageLink} ${page === p ? styles.activePage : ''}`}>
                  {p}
                </a>
              );
            })}
            {page < totalPages && (
              <a href={pageHref(page + 1)} onClick={() => seitenwechselMerken(pageHref(page + 1))} className={styles.pageArrow}>
                →
              </a>
            )}
          </div>}
        </div>
      </div>
    </>
  );
}
