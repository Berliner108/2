'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { ChevronRightIcon } from '@heroicons/react/24/solid';
import Slideshow from './slideshow/slideshow';
import CookieBanner from './components/CookieBanner';
import Navbar from './components/navbar/Navbar';
import { dummyAuftraege } from '@/data/dummyAuftraege';
import type { Auftrag as RawAuftrag } from '@/data/dummyAuftraege';
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
  // sonst Capitalize
  const raw = (z ?? '').replace(/&/g, 'und');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/* ================= Types ================= */
type Auftrag = RawAuftrag;

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
  gesponsert?: boolean;   // ← wichtig für Sortierung
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

/* Initial: gesponserte Aufträge aus den Dummies (unverändert) */
const initialSponsored: Auftrag[] = dummyAuftraege
  .filter(a => a.gesponsert)
  .slice(0, 12);

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

  /* ===== Aufträge ===== */
  const [auftraege, setAuftraege] = useState<Auftrag[]>(initialSponsored);
  const [loadingAuftraege, setLoadingAuftraege] = useState(true);
  useEffect(() => {
    let active = true;
    const fetchAuftraege = async () => {
      try {
        setLoadingAuftraege(true);
        const res = await fetch('/api/auftraege?sponsored=true&limit=12', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = (await res.json()) as any[];

        if (!active) return;

        setAuftraege(prev => {
          const apiById = new Map<any, any>(data.map(x => [x.id, x]));
          return prev.map(old => {
            const a = apiById.get(old.id) ?? {};
            const warenausgabeDatum =
              toDate(a.warenausgabeDatum) ?? (old as any).warenausgabeDatum;
            const warenannahmeDatum =
              toDate(a.warenannahmeDatum) ?? (old as any).warenannahmeDatum;

            const patch: Partial<Auftrag> = {
              ...(a.verfahren ? { verfahren: a.verfahren } : {}),
              ...(a.material ? { material: a.material } : {}),
              ...(a.length ? { length: a.length } : {}),
              ...(a.width ? { width: a.width } : {}),
              ...(a.height ? { height: a.height } : {}),
              ...(a.masse ? { masse: a.masse } : {}),
              ...(a.standort ? { standort: a.standort } : {}),
              ...(a.user ? { user: a.user } : {}),
              ...(Array.isArray(a.bilder) ? { bilder: a.bilder } : {}),
              ...(typeof a.gesponsert === 'boolean' ? { gesponsert: a.gesponsert } : {}),
              ...(typeof a.gewerblich === 'boolean' ? { gewerblich: a.gewerblich } : {}),
              ...(typeof a.privat === 'boolean' ? { privat: a.privat } : {}),
              ...(a.beschreibung ? { beschreibung: a.beschreibung } : {}),
              ...(warenausgabeDatum ? { warenausgabeDatum } : {}),
              ...(warenannahmeDatum ? { warenannahmeDatum } : {}),
            };

            if (a.warenausgabeArt) (patch as any).warenausgabeArt = a.warenausgabeArt;
            if (a.warenannahmeArt) (patch as any).warenannahmeArt = a.warenannahmeArt;

            return { ...(old as any), ...patch };
          });
        });
      } catch {
        // keep initialSponsored
      } finally {
        if (active) setLoadingAuftraege(false);
      }
    };
    fetchAuftraege();
    return () => { active = false; };
  }, []);

  /* ===== Lackanfragen (TOP 12 aus der Börse) ===== */
  const [lackanfragen, setLackanfragen] = useState<Lackanfrage[]>([]);
  const [loadingLack, setLoadingLack] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchLack = async () => {
      try {
        setLoadingLack(true);
        const res = await fetch('/api/lackanfragen?sort=promo&order=desc&page=1&limit=12', { cache: 'no-store' })
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const json = await res.json();
        const rawList: any[] = Array.isArray(json)
          ? json
          : (Array.isArray(json?.items) ? json.items : []);

        const mapped: Lackanfrage[] = rawList.map((a: any) => {
          // === robustes Zusammenführen aus mehreren Backendshapes ===
          const attrs = a?.attributes || a?.data || {};
          const o = { ...attrs, ...a };

          // Ort
          const ortKombi = [o.plz ?? o.zip, o.city ?? o.stadt].filter(Boolean).join(' ').trim();
          const ort = strOrEmpty(o.ort, o.location, ortKombi);

          // Bilder
          let bilder: string[] = [];
          if (Array.isArray(o.bilder) && o.bilder.length) bilder = o.bilder;
          else if (Array.isArray(o.images) && o.images.length) bilder = o.images;
          else if (typeof o.image === 'string') bilder = [o.image];
          else if (typeof o.thumbnail === 'string') bilder = [o.thumbnail];
          else bilder = ['/images/platzhalter.jpg'];

          // Zeiten
          const createdAt = toDate(a.created_at ?? o.created_at ?? o.createdAt ?? o.created);
          const lieferdatum = toDate(a.lieferdatum ?? a.delivery_at ?? o.lieferdatum ?? o.delivery_at ?? o.date);

          // Mengen
          const menge =
            parseNum(o.menge ?? o.quantity ?? o.amount ?? o.kg ?? o.mass_kg) ?? 0;

          // Farbton
          const farbton = strOrEmpty(
            o.farbton,
            o.farbtonbezeichnung,
            o.farb_bezeichnung,
            o.farb_name,
            o.color_name,
            o.color,
            o.ral,
            o.ncs
          );

          // Gesponsert (Promo) – mehrere Fallbacks
          const gesponsert =
            Boolean(a.gesponsert) ||
            Boolean(o.gesponsert) ||
            Boolean(a.is_sponsored) ||
            (typeof a.promo_score === 'number' && a.promo_score > 0);

          return {
            id: o.id ?? a.id ?? o._id ?? o.uuid ?? `${o.titel ?? o.title ?? 'item'}-${Math.random().toString(36).slice(2)}`,
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
                : (typeof o.min_price === 'number'
                    ? o.min_price
                    : (typeof o.price === 'number' ? o.price : undefined)),
            gesponsert,
            created_at: createdAt,
            farbton,
          };
        })
        // === Sortierung: Gesponsert zuerst, dann nach Neuheit (created_at > lieferdatum) ===
        .sort((a, b) => {
          const aS = a.gesponsert ? 1 : 0;
          const bS = b.gesponsert ? 1 : 0;
          if (aS !== bS) return bS - aS; // gesponsert nach oben
          const da = (a.created_at ?? a.lieferdatum ?? new Date(0)).getTime();
          const db = (b.created_at ?? b.lieferdatum ?? new Date(0)).getTime();
          return db - da;
        })
        .slice(0, 12);

        if (active) setLackanfragen(mapped);
      } catch (e) {
        console.warn('Lackanfragen konnten nicht geladen werden:', e);
        if (active) setLackanfragen([]);
      } finally {
        if (active) setLoadingLack(false);
      }
    };
    fetchLack();
    return () => { active = false; };
  }, []);

  /* ===== Shop-Artikel ===== */
  const [shopArtikel, setShopArtikel] = useState<ShopArtikel[]>(
    artikelDatenShop
      .filter(a => a.gesponsert)
      .slice(0, 12)
      .map(a => ({ ...a, lieferdatum: toDate(a.lieferdatum)! }))
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
        setShopArtikel((data as any[]).map(a => ({ ...a, lieferdatum: toDate(a.lieferdatum)! })));
      } catch {
        // keep dummy shop items
      } finally {
        if (active) setLoadingShop(false);
      }
    };
    fetchShop();
    return () => { active = false; };
  }, []);

  // Scroll-Helper
  const handleScroll = (ref: React.RefObject<HTMLDivElement>, dir: number) => {
    if (ref.current) ref.current.scrollLeft += dir * 200;
  };

  // Boot-loading Flags: Skeleton nur, wenn *noch keine* Daten da sind
  const bootLoadingAuftraege = loadingAuftraege && auftraege.length === 0;
  const bootLoadingShop = loadingShop && shopArtikel.length === 0;
  const bootLoadingLack = loadingLack && lackanfragen.length === 0;

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
                {bootLoadingAuftraege ? (
                  <SkeletonRow cards={12} />
                ) : (
                  auftraege.map((a) => (
                    <Link key={a.id} href={`/auftragsboerse/auftraege/${a.id}`} className={styles.articleBox}>
                      <img
                        src={a.bilder?.[0] ?? '/images/platzhalter.jpg'}
                        alt={a.verfahren?.map(v => v.name).join(' & ') || 'Auftrag'}
                        className={styles.articleImg}
                      />
                      <div className={styles.articleText}>
                        <h3>{a.verfahren?.map(v => v.name).join(' & ') || 'Verfahren unbekannt'}</h3>
                        <p><strong>Material:</strong> {(a as any).material}</p>
                        <p><strong>Maße:</strong> {(a as any).length} x {(a as any).width} x {(a as any).height} mm</p>
                        <p><strong>Max. Masse:</strong> {(a as any).masse}</p>
                        <p><strong>Lieferdatum:</strong> {formatDate(toDate((a as any).warenausgabeDatum))}</p>
                        <p><strong>Abholdatum:</strong> {formatDate(toDate((a as any).warenannahmeDatum))}</p>
                        <p><strong>Warenausgabe per:</strong> {(a as any).warenausgabeArt || '-'}</p>
                        <p>
                          <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {(a as any).standort}
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
              <img src="/images/snake79.jpg" alt="Artikelbild" className={styles.articleImage} />
            </div>
          </section>

          {/* Shop */}
          <section className={styles.sectionWrapper}>
            <div className={styles.articleLinkContainer}>
              <Link href="/kaufen" className={styles.articleLink}>
                Top Deals aus unserem <span className={styles.colored}>Shop</span>
              </Link>
            </div>

            <div className={styles.scrollContainer}>
              <div
                className={styles.scrollContent}
                ref={scrollRefShop}
                style={loadingShop ? { minHeight: 280 } : undefined}
              >
                {bootLoadingShop ? (
                  <SkeletonRow cards={12} />
                ) : (
                  shopArtikel.map((art) => (
                    <Link key={art.id} href={`/kaufen/artikel/${art.id}`} className={styles.articleBox2}>
                      <img src={art.bilder?.[0] ?? '/images/platzhalter.jpg'} alt={art.titel} className={styles.articleImg} />
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
                {bootLoadingLack ? (
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
