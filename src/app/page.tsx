'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import Slideshow from './slideshow/slideshow';
import CookieBanner from './components/CookieBanner';
import Navbar from './components/navbar/Navbar';
import styles from '../styles/Home.module.css';
import { artikelDaten as artikelDatenShop } from '@/data/ArtikelimShop';
import { MapPin } from 'lucide-react';
import SearchBox from './components/SearchBox';

/* ================= Helpers ================= */
const toDate = (v: unknown): Date | undefined => {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? undefined : d;
};
const formatDate = (d?: Date) =>
  d instanceof Date && !isNaN(d.getTime()) ? d.toLocaleDateString('de-AT') : '-';

const parseNum = (v: any): number | undefined => {
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return isFinite(n) ? n : undefined;
  }
  return undefined;
};
const labelWarenausgabe = (v?: string | null) => {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return '-';

  if (s.includes('abhol')) return 'Abholung';
  if (s.includes('selbst')) return 'Selbstanlieferung';

  return '-';
};

const labelWarenrueckgabe = (v?: string | null) => {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return '-';

  if (s.includes('anliefer') || s.includes('liefer')) return 'Anlieferung';
  if (s.includes('selbst')) return 'Selbstabholung';

  return '-';
};



const strOrEmpty = (...vals: any[]): string => {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
};

const normKategorie = (k?: string) => {
  const v = (k ?? '').trim().toLowerCase();
  if (v === 'pulverlack') return 'Pulverlack';
  if (v === 'nasslack') return 'Nasslack';
  return k ?? '';
};

/** Zustand formatieren mit „und“ statt „&“ */
const stripDiacritics = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const norm = (s?: string) => stripDiacritics((s ?? '').trim().toLowerCase());

const formatZustand = (z?: string) => {
  const n = norm(z);
  if (!n) return '';
  if (n === 'neu' || n.includes('ungeoffnet') || n.includes('ungeöffnet')) {
    return 'Neu und ungeöffnet';
  }
  if (n.includes('geoffnet') || n.includes('geöffnet') || n === 'offen') {
    return 'Geöffnet und einwandfrei';
  }
  const raw = (z ?? '').replace(/&/g, 'und');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/* ================= Delayed Skeleton (kein Flash) ================= */
function useDelayedSkeleton(loading: boolean, hasData: boolean, delayMs = 220) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hasData || !loading) {
      setShow(false);
      return;
    }
    setShow(false);
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [loading, hasData, delayMs]);

  return show;
}

/* ================= Types ================= */
type Auftrag = any; // kommt jetzt aus der echten Börse-API (Top 12)
type Lackanfrage = {
  id: string | number;
  titel: string;
  bilder: string[];
  menge: number;
  lieferdatum?: Date;
  hersteller: string;
  zustand: string;
  kategorie: string;
  ort: string;
  preis?: number;
  gesponsert?: boolean;
  created_at?: Date;
  farbton?: string;
};

type ShopArtikel = {
  id: string | number;
  titel: string;
  bilder: string[];
  menge: number;
  lieferdatum?: Date;
  hersteller?: string;
  zustand?: string;
  kategorie?: string;
  preis?: number;
  farbton?: string;
  [key: string]: any;
};

/* ---------- Skeleton-Karten (Horizontalscroller) ---------- */
function SkeletonRow({ cards = 12 }: { cards?: number }) {
  return (
    <>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={styles.skelCard}>
          <div className={`${styles.skelImg} ${styles.skeleton}`} />
          <div className={styles.skelBody}>
            <div className={`${styles.skelLine} ${styles.skeleton} ${styles.w80}`} />
            <div className={`${styles.skelLine} ${styles.skeleton} ${styles.w60}`} />
            <div className={`${styles.skelLine} ${styles.skeleton} ${styles.w70}`} />
            <div className={`${styles.skelLine} ${styles.skeleton} ${styles.w50}`} />
          </div>
        </div>
      ))}
    </>
  );
}

export default function Page() {
  // scroll-Refs
  const scrollRefAuftraege = useRef<HTMLDivElement>(null);
  const scrollRefShop = useRef<HTMLDivElement>(null);
  const scrollRefLackanfragen = useRef<HTMLDivElement>(null);

  /* ===== Aufträge (Top 12 aus echter Börse) ===== */
  const [auftraege, setAuftraege] = useState<Auftrag[]>([]);
  const [loadingAuftraege, setLoadingAuftraege] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchAuftraege = async () => {
      try {
        setLoadingAuftraege(true);
        // ✅ neuer, schneller Endpoint (Route: /api/auftraege/top)
        const res = await fetch('/api/auftraege/top', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = (await res.json()) as Auftrag[];
        if (!active) return;
        setAuftraege(data);
      } catch (e) {
        console.warn('Top-Aufträge konnten nicht geladen werden:', e);
        if (active) setAuftraege([]);
      } finally {
        if (active) setLoadingAuftraege(false);
      }
    };
    fetchAuftraege();
    return () => {
      active = false;
    };
  }, []);

  /* ===== Lackanfragen (TOP 12 aus der Börse) ===== */
  const [lackanfragen, setLackanfragen] = useState<Lackanfrage[]>([]);
  const [loadingLack, setLoadingLack] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLack = async () => {
      try {
        setLoadingLack(true);
        const res = await fetch('/api/lackanfragen?sort=promo&order=desc&page=1&limit=12', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const json = await res.json();
        const rawList: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
            ? json.items
            : [];

        const mapped: Lackanfrage[] = rawList.map((a: any) => {
          const attrs = a?.attributes || a?.data || {};
          const o = { ...attrs, ...a };

          const ortKombi = [o.plz ?? o.zip, o.city ?? o.stadt].filter(Boolean).join(' ').trim();
          const ort = strOrEmpty(o.ort, o.location, ortKombi);

          let bilder: string[] = [];
          if (Array.isArray(o.bilder) && o.bilder.length) bilder = o.bilder;
          else if (Array.isArray(o.images) && o.images.length) bilder = o.images;
          else if (typeof o.image === 'string') bilder = [o.image];
          else if (typeof o.thumbnail === 'string') bilder = [o.thumbnail];
          else bilder = ['/images/platzhalter.jpg'];

          const createdAt = toDate(a.created_at ?? o.created_at ?? o.createdAt ?? o.created);
          const lieferdatum = toDate(
            a.lieferdatum ?? a.delivery_at ?? o.lieferdatum ?? o.delivery_at ?? o.date,
          );

          const menge = parseNum(o.menge ?? o.quantity ?? o.amount ?? o.kg ?? o.mass_kg) ?? 0;

          const farbton = strOrEmpty(
            o.farbton,
            o.farbtonbezeichnung,
            o.farb_bezeichnung,
            o.farb_name,
            o.color_name,
            o.color,
            o.ral,
            o.ncs,
          );

          const gesponsert =
            Boolean(a.gesponsert) ||
            Boolean(o.gesponsert) ||
            Boolean(a.is_sponsored) ||
            (typeof a.promo_score === 'number' && a.promo_score > 0);

          return {
            id:
              o.id ??
              a.id ??
              o._id ??
              o.uuid ??
              `${o.titel ?? o.title ?? 'item'}-${Math.random().toString(36).slice(2)}`,
            titel: strOrEmpty(o.titel, a.title, o.title, o.name, 'Unbenannt'),
            bilder,
            menge,
            lieferdatum,
            hersteller: strOrEmpty(o.hersteller, o.manufacturer, o.brand),
            zustand: strOrEmpty(o.zustand, o.condition, o.state),
            kategorie: normKategorie(strOrEmpty(o.kategorie, o.category, o.type)),
            ort,
            preis:
              typeof o.preis === 'number'
                ? o.preis
                : typeof o.min_price === 'number'
                  ? o.min_price
                  : typeof o.price === 'number'
                    ? o.price
                    : undefined,
            gesponsert,
            created_at: createdAt,
            farbton,
          };
        });

        if (active) setLackanfragen(mapped);
      } catch (e) {
        console.warn('Lackanfragen konnten nicht geladen werden:', e);
        if (active) setLackanfragen([]);
      } finally {
        if (active) setLoadingLack(false);
      }
    };
    fetchLack();
    return () => {
      active = false;
    };
  }, []);

  /* ===== Shop-Artikel ===== */
  const [shopArtikel, setShopArtikel] = useState<ShopArtikel[]>(
    artikelDatenShop
      .filter((a) => a.gesponsert)
      .slice(0, 12)
      .map((a) => ({ ...a, lieferdatum: toDate(a.lieferdatum)! })),
  );
  const [loadingShop, setLoadingShop] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchShop = async () => {
      try {
        setLoadingShop(true);
        const res = await fetch('/api/artikel?gesponsert=true&limit=12', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!active) return;
        setShopArtikel((data as any[]).map((a) => ({ ...a, lieferdatum: toDate(a.lieferdatum)! })));
      } catch {
        // keep dummy shop items
      } finally {
        if (active) setLoadingShop(false);
      }
    };
    fetchShop();
    return () => {
      active = false;
    };
  }, []);

  // Scroll-Helper
  const handleScroll = (ref: React.RefObject<HTMLDivElement>, dir: number) => {
    if (ref.current) ref.current.scrollLeft += dir * 200;
  };

  // ✅ Skeleton nur, wenn Laden wirklich dauert (kein Flash)
  const showSkeletonAuftraege = useDelayedSkeleton(loadingAuftraege, auftraege.length > 0, 220);
  const showSkeletonShop = useDelayedSkeleton(loadingShop, shopArtikel.length > 0, 220);
  const showSkeletonLack = useDelayedSkeleton(loadingLack, lackanfragen.length > 0, 220);

  return (
    <>
      <Navbar />
      <Suspense fallback={<div>Seite lädt...</div>}>
        <div className={styles.wrapper}>
          {/* Suchformular */}
          <Suspense fallback={<div>Suchfeld lädt...</div>}>
            <SearchBox />
          </Suspense>

          <Slideshow />

          {/* Auftragsbörse */}
          <section className={styles.sectionWrapper}>
            <div className={styles.articleLinkContainer}>
              <Link href="/auftragsboerse" className={styles.articleLink}>
                Top Deals aus der <span className={styles.colored}>Auftragsbörse</span>
              </Link>
            </div>

            <div className={styles.scrollContainer}>
              <div
                className={styles.scrollContent}
                ref={scrollRefAuftraege}
                style={loadingAuftraege ? { minHeight: 280 } : undefined}
              >
                {showSkeletonAuftraege ? (
                  <SkeletonRow cards={12} />
                ) : (
                  auftraege.map((a) => (
                    <Link
                      key={a.id}
                      href={`/auftragsboerse/auftraege/${a.id}`}
                      className={styles.articleBox}
                    >
                      <img
                        src={a.bilder?.[0] ?? '/images/platzhalter.jpg'}
                        alt={a.verfahren?.map((v: any) => v.name).join(' & ') || 'Auftrag'}
                        className={styles.articleImg}
                      />
                      <div className={styles.articleText}>
                        <h3>{a.verfahren?.map((v: any) => v.name).join(' & ') || 'Verfahren unbekannt'}</h3>
                        <p><strong>Material:</strong> {a.material ?? '-'}</p>
                        <p><strong>Warenausgabe per:</strong> {labelWarenausgabe(a.warenausgabeArt)}</p>                        
                        <p><strong>Datum Warenausgabe:</strong> {formatDate(toDate(a.warenausgabeDatum))}</p>                        
                        <p><strong>Warenrückgabe per:</strong> {labelWarenrueckgabe(a.warenannahmeArt)}</p>
                        <p><strong>Datum Warenrückgabe:</strong> {formatDate(toDate(a.warenannahmeDatum))}</p>
                        <p><strong>Max. Maße:</strong> {a.length ?? '-'} x {a.width ?? '-'} x {a.height ?? '-'} mm</p>
                        <p><strong>Max. Masse:</strong> {a.masse ?? '-'} kg</p>
                        <p>
                          <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {a.standort ?? '-'}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefAuftraege, -1)}>
                <ChevronLeftIcon className="h-6 w-6 text-black" />
              </button>
              <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefAuftraege, 1)}>
                <ChevronRightIcon className="h-6 w-6 text-black" />
              </button>
            </div>

            <div className={styles.imageContainer}>
              <img src="/images/werbung.jpg" alt="Artikelbild" className={styles.articleImage} />
            </div>
          </section>

          {/* Shop */}
          <section className={styles.sectionWrapper}>
            <div className={styles.articleLinkContainer}>
              <Link href="/kaufen" className={styles.articleLink}>
                Top Deals aus dem Beschichter <span className={styles.colored}>Shop</span>
              </Link>
            </div>

            <div className={styles.scrollContainer}>
              <div
                className={styles.scrollContent}
                ref={scrollRefShop}
                style={loadingShop ? { minHeight: 280 } : undefined}
              >
                {showSkeletonShop ? (
                  <SkeletonRow cards={12} />
                ) : (
                  shopArtikel.map((art) => (
                    <Link key={art.id} href={`/kaufen/artikel/${art.id}`} className={styles.articleBox2}>
                      <img
                        src={art.bilder?.[0] ?? '/images/platzhalter.jpg'}
                        alt={art.titel}
                        className={styles.articleImg}
                      />
                      <div className={styles.articleText}>
                        <h3>{art.titel}</h3>
                        <p><strong>Menge:</strong> {art.menge} kg</p>
                        <p><strong>Lieferdatum:</strong> {formatDate(art.lieferdatum)}</p>
                        <p><strong>Hersteller:</strong> {art.hersteller}</p>
                        <p><strong>Zustand:</strong> {formatZustand(art.zustand) || '—'}</p>
                        <p><strong>Kategorie:</strong> {normKategorie(art.kategorie)}</p>
                        <p style={{ fontSize: '1rem', fontWeight: 500, color: 'gray' }}>
                          <strong>Preis ab:</strong> {art.preis?.toFixed?.(2) ?? '–'} €
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefShop, -1)}>
                <ChevronLeftIcon className="h-6 w-6 text-black" />
              </button>
              <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefShop, 1)}>
                <ChevronRightIcon className="h-6 w-6 text-black" />
              </button>
            </div>
          </section>

          <div className={styles.imageContainer}>
            <img src="/images/sonderlacke.jpg" alt="Artikelbild" className={styles.articleImage} />
          </div>

          {/* Lackanfragen */}
          <section className={styles.sectionWrapper}>
            <div className={styles.articleLinkContainer}>
              <Link href="/lackanfragen" className={styles.articleLink}>
                Top Deals aus der <span className={styles.colored}>Lackanfragen-Börse</span>
              </Link>
            </div>

            <div className={styles.scrollContainer}>
              <div
                className={styles.scrollContent}
                ref={scrollRefLackanfragen}
                style={loadingLack ? { minHeight: 280 } : undefined}
              >
                {showSkeletonLack ? (
                  <SkeletonRow cards={12} />
                ) : lackanfragen.length === 0 ? (
                  <div className={styles.emptyState}>Keine Einträge gefunden.</div>
                ) : (
                  lackanfragen.map((anfrage) => (
                    <Link key={anfrage.id} href={`/lackanfragen/artikel/${anfrage.id}`} className={styles.articleBox3}>
                      <img
                        src={anfrage.bilder?.[0] ?? '/images/platzhalter.jpg'}
                        alt="Lackanfrage-Bild"
                        className={styles.articleImg}
                      />
                      <div className={styles.articleText}>
                        <h3>{anfrage.titel}</h3>
                        <p><strong>Menge:</strong> {anfrage.menge} kg</p>
                        <p><strong>Lieferdatum:</strong> {formatDate(anfrage.lieferdatum)}</p>
                        <p><strong>Hersteller:</strong> {anfrage.hersteller || 'Alle'}</p>
                        <p><strong>Farbtonbezeichnung:</strong> {anfrage.farbton || '—'}</p>
                        <p><strong>Zustand:</strong> {formatZustand(anfrage.zustand) || '—'}</p>
                        <p><strong>Kategorie:</strong> {anfrage.kategorie || '—'}</p>
                        <p>
                          <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {anfrage.ort || '—'}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefLackanfragen, -1)}>
                <ChevronLeftIcon className="h-6 w-6 text-black" />
              </button>
              <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefLackanfragen, 1)}>
                <ChevronRightIcon className="h-6 w-6 text-black" />
              </button>
            </div>
          </section>

          <CookieBanner />
        </div>
      </Suspense>
    </>
  );
}
