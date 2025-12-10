'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import styles from './auftragsboerse.module.css';
import Navbar from '../components/navbar/Navbar'
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { dummyAuftraege, Auftrag } from '../../data/dummyAuftraege';
import ArtikelContainerAuftragsboerse from '../components/ArtikelContainerAuftragsboerse';

// Feste Verfahren
const VERFAHREN = [
  'Nasslackieren','Pulverbeschichten','Verzinken','Eloxieren','Strahlen','Entlacken',
  'Einlagern','Isolierstegverpressung','Folieren','Anodisieren','Verzinnen','Aluminieren',
  'Entzinken','Entzinnen','Entnickeln','Vernickeln','Entanodisieren','Entaluminieren','Enteloxieren',
] as const;

// Maximalwerte aus Daten
const maxValues = dummyAuftraege.reduce(
  (acc, a: any) => ({
    length: Math.max(acc.length, a.length),
    width:  Math.max(acc.width,  a.width),
    height: Math.max(acc.height, a.height),
    masse:  Math.max(acc.masse,  parseFloat(a.masse)),
  }),
  { length: 0, width: 0, height: 0, masse: 0 }
);

// Rundung auf 1/2/5*10^n
const niceCeil = (n: number) => {
  if (n <= 0) return 0;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const m = n / base;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * base;
};

// Große, feste Mindestbereiche (genug Reserve)
const FLOORS = {
  length: 20000, // mm
  width:   6000, // mm
  height:  3000, // mm
  masse:  20000, // kg
};

// Endgültige Slider-Limits
const LIMITS = {
  length: Math.max(FLOORS.length, niceCeil(maxValues.length * 2)),
  width:  Math.max(FLOORS.width,  niceCeil(maxValues.width  * 2)),
  height: Math.max(FLOORS.height, niceCeil(maxValues.height * 2)),
  masse:  Math.max(FLOORS.masse,  niceCeil(maxValues.masse  * 3)),
};

// Logistik normalisieren (neu bevorzugt, alte/abweichende Felder als Fallback)
function normLogistik(a: any) {
  const waDatum: Date | undefined = a.warenausgabeDatum ?? a.lieferdatum;
  const wnDatum: Date | undefined = a.warenannahmeDatum ?? a.abholdatum;

  const waArtRaw: string | undefined = a.warenausgabeArt ?? a.warenausgabeart ?? a.lieferArt;
  const wnArtRaw: string | undefined = a.warenannahmeArt ?? a.abholArt;

  const lower = (s?: string) => (typeof s === 'string' ? s.trim().toLowerCase() : undefined);

  return {
    waDatum,
    wnDatum,
    waArt: lower(waArtRaw),   // 'selbstanlieferung' | 'abholung' | undefined
    wnArt: lower(wnArtRaw),   // 'zustellung' | 'selbstabholung' | undefined
  };
}

export default function AuftragsboerseSeite() {
  const router   = useRouter();
  const pathname = usePathname();
  const sp       = useSearchParams();

  // Datenquelle robust (falls dateien optional)
  const data: (Auftrag & { dateien?: { name: string; url: string }[] })[] = useMemo(
    () => dummyAuftraege.map(a => ({ ...a, dateien: (a as any).dateien ?? [] })),
    []
  );

  // --- Refs & stabile Scroll-Position beim Filtern ---
  const contentRef  = useRef<HTMLDivElement>(null);
  const sidebarRef  = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const keepViewportStable = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (!sidebarRef.current || !sidebarRef.current.contains(t)) return;
    const beforeTop = t.getBoundingClientRect().top;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterTop = t.getBoundingClientRect().top;
        const delta = afterTop - beforeTop;
        if (delta !== 0) window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
      });
    });
  };

  // Helper
  const numFromQuery  = (key: string, fallback: number) => (sp.get(key) !== null ? Number(sp.get(key)) : fallback);
  const boolFromQuery = (key: string) => sp.get(key) === '1';

  // --- State ---
  const [suchbegriff, setSuchbegriff] = useState(() => sp.get('q') ?? '');
  const [verfahren,   setVerfahren]   = useState(() => sp.get('verfahren') ?? '');
  const [gewerblich,  setGewerblich]  = useState(() => boolFromQuery('g'));
  const [privat,      setPrivat]      = useState(() => boolFromQuery('p'));
  const [sortierung,  setSortierung]  = useState(() => sp.get('sort') ?? '');

  // Checkbox-Filter (Warenausgabe/Warenannahme)
  const [waSelbst, setWaSelbst] = useState(() => boolFromQuery('wa_s')); // Selbstanlieferung
  const [waAbhol,  setWaAbhol ] = useState(() => boolFromQuery('wa_a')); // Abholung
  const [wnZust,   setWnZust  ] = useState(() => boolFromQuery('wn_z')); // Zustellung
  const [wnSelbst, setWnSelbst] = useState(() => boolFromQuery('wn_s')); // Selbstabholung

  // Slider
  const [maxLength, setMaxLength] = useState(() => numFromQuery('l', LIMITS.length));
  const [maxWidth,  setMaxWidth ] = useState(() => numFromQuery('w', LIMITS.width));
  const [maxHeight, setMaxHeight] = useState(() => numFromQuery('h', LIMITS.height));
  const [maxMasse,  setMaxMasse ] = useState(() => numFromQuery('m', LIMITS.masse));

  // Paginierung
  const page          = parseInt(sp.get('page') || '1', 10);
  const seitenGroesse = 50;
  const startIndex    = (page - 1) * seitenGroesse;
  const endIndex      = page * seitenGroesse;

  const [anzeigenLimit, setAnzeigenLimit] = useState(50);
  const [sidebarOpen,  setSidebarOpen]    = useState(false);

  // --- URL <-> State ---
  const fromUrlRef = useRef(false);
  const spKey = sp.toString();

  // URL -> State
  useEffect(() => {
    fromUrlRef.current = true;

    setSuchbegriff(sp.get('q') ?? '');
    setVerfahren(sp.get('verfahren') ?? '');
    setGewerblich(sp.get('g') === '1');
    setPrivat(sp.get('p') === '1');
    setSortierung(sp.get('sort') ?? '');

    setWaSelbst(sp.get('wa_s') === '1');
    setWaAbhol (sp.get('wa_a') === '1');
    setWnZust  (sp.get('wn_z') === '1');
    setWnSelbst(sp.get('wn_s') === '1');

    setMaxLength(sp.get('l') ? Math.min(Number(sp.get('l')), LIMITS.length) : LIMITS.length);
    setMaxWidth (sp.get('w') ? Math.min(Number(sp.get('w')), LIMITS.width ) : LIMITS.width);
    setMaxHeight(sp.get('h') ? Math.min(Number(sp.get('h')), LIMITS.height) : LIMITS.height);
    setMaxMasse (sp.get('m') ? Math.min(Number(sp.get('m')), LIMITS.masse ) : LIMITS.masse);

    setAnzeigenLimit(50);
  }, [spKey]);

  // State -> URL
  useEffect(() => {
    if (fromUrlRef.current) { fromUrlRef.current = false; return; }
    const params = new URLSearchParams();
    if (suchbegriff) params.set('q', suchbegriff);
    if (verfahren)   params.set('verfahren', verfahren);
    if (gewerblich)  params.set('g', '1');
    if (privat)      params.set('p', '1');
    if (sortierung)  params.set('sort', sortierung);

    if (waSelbst) params.set('wa_s', '1');
    if (waAbhol ) params.set('wa_a', '1');
    if (wnZust  ) params.set('wn_z', '1');
    if (wnSelbst) params.set('wn_s', '1');

    if (maxLength !== LIMITS.length) params.set('l', String(maxLength));
    if (maxWidth  !== LIMITS.width ) params.set('w', String(maxWidth));
    if (maxHeight !== LIMITS.height) params.set('h', String(maxHeight));
    if (maxMasse  !== LIMITS.masse ) params.set('m', String(maxMasse));

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setAnzeigenLimit(50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    suchbegriff, verfahren, gewerblich, privat, sortierung,
    waSelbst, waAbhol, wnZust, wnSelbst,
    maxLength, maxWidth, maxHeight, maxMasse
  ]);

  // Logistik-Filter
  const matchWarenausgabe = (a: Auftrag) => {
    if (!waSelbst && !waAbhol) return true;
    const { waArt } = normLogistik(a);
    if (!waArt) return false;
    return (
      (waSelbst && waArt === 'selbstanlieferung') ||
      (waAbhol  && waArt === 'abholung')
    );
  };
  const matchWarenannahme = (a: Auftrag) => {
    if (!wnZust && !wnSelbst) return true;
    const { wnArt } = normLogistik(a);
    if (!wnArt) return false;
    return (
      (wnZust   && wnArt === 'zustellung') ||
      (wnSelbst && wnArt === 'selbstabholung')
    );
  };

  // Filtern
  const gefilterteAuftraege = useMemo(() => {
    return data
      .filter(a => !verfahren || a.verfahren.some(v => v.name === verfahren))
      .filter(a =>
        (!gewerblich && !privat) ||
        (gewerblich && a.gewerblich) ||
        (privat     && a.privat)
      )
      .filter(a => matchWarenausgabe(a))
      .filter(a => matchWarenannahme(a))
      .filter(a => a.length <= maxLength)
      .filter(a => a.width  <= maxWidth)
      .filter(a => a.height <= maxHeight)
      .filter(a => parseFloat(a.masse) <= maxMasse);
  }, [
    data, verfahren, gewerblich, privat,
    waSelbst, waAbhol, wnZust, wnSelbst,
    maxLength, maxWidth, maxHeight, maxMasse
  ]);

  // Verfahren-Zähler (mit aktiven Filtern, außer dem Verfahren selbst)
  const verfahrenCounts = useMemo(() => {
    const base = data
      .filter(a =>
        (!gewerblich && !privat) ||
        (gewerblich && a.gewerblich) ||
        (privat     && a.privat)
      )
      .filter(a => matchWarenausgabe(a))
      .filter(a => matchWarenannahme(a))
      .filter(a => a.length <= maxLength && a.width <= maxWidth && a.height <= maxHeight && parseFloat(a.masse) <= maxMasse);
    const map: Record<string, number> = Object.fromEntries(VERFAHREN.map(v => [v, 0]));
    for (const a of base) for (const v of a.verfahren) if (v.name in map) map[v.name]++;
    return map;
  }, [
    data, gewerblich, privat, waSelbst, waAbhol, wnZust, wnSelbst,
    maxLength, maxWidth, maxHeight, maxMasse
  ]);

  // Suche
  const fuse = new Fuse<Auftrag>(gefilterteAuftraege, {
    keys: ['verfahren.name', 'material', 'standort', 'user'],
    threshold: 0.4,
  });
  const suchErgebnis = suchbegriff ? fuse.search(suchbegriff).map(r => r.item) : gefilterteAuftraege;

  // Sortierung (Warenausgabe/Warenannahme + Gesponsert-Priorität)
  const sortierteAuftraege = useMemo(() => {
    const arr = [...suchErgebnis];
    const t = (d?: Date) => (d instanceof Date ? d.getTime() : undefined);
    arr.sort((a, b) => {
      if (a.gesponsert && !b.gesponsert) return -1;
      if (!a.gesponsert && b.gesponsert) return 1;

      const na = normLogistik(a);
      const nb = normLogistik(b);
      const waA = t(na.waDatum);
      const waB = t(nb.waDatum);
      const wnA = t(na.wnDatum);
      const wnB = t(nb.wnDatum);

      switch (sortierung) {
        case 'warenausgabe-auf': return (waA ?? Infinity) - (waB ?? Infinity);
        case 'warenausgabe-ab':  return (waB ?? -Infinity) - (waA ?? -Infinity);
        case 'warenannahme-auf': return (wnA ?? Infinity) - (wnB ?? Infinity);
        case 'warenannahme-ab':  return (wnB ?? -Infinity) - (wnA ?? -Infinity);
        default: return 0;
      }
    });
    return arr;
  }, [suchErgebnis, sortierung]);

  // Infinite Scroll (nur Seite 1)
  useEffect(() => {
    if (page !== 1) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnzeigenLimit(prev => Math.min(prev + 10, sortierteAuftraege.length)); },
      { rootMargin: '100px' }
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [sortierteAuftraege, page]);

  // Pagination-URLs
  const pageHref = (n: number) => {
    const p = new URLSearchParams(sp.toString());
    if (n <= 1) p.delete('page'); else p.set('page', String(n));
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const seiten   = sortierteAuftraege.slice(startIndex, endIndex);
  const anzeigen = page === 1 ? sortierteAuftraege.slice(0, anzeigenLimit) : seiten;

  return (
    <>
      <Navbar />

      {/* Hamburger & Overlay */}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Sidebar öffnen"
      >
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar1open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar2open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar3open : ''}`} />
      </button>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <div className={styles.wrapper}>
        {/* SIDEBAR */}
        <div
          ref={sidebarRef}
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}
          onInput={keepViewportStable}
          onChange={keepViewportStable}
        >
          <select
            className={styles.sortSelect}
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
          >
            <option value="">Sortieren</option>
            <option value="warenausgabe-auf">Warenausgabe aufsteigend</option>
            <option value="warenausgabe-ab">Warenausgabe absteigend</option>
            <option value="warenannahme-auf">Warenrückgabe aufsteigend</option>
            <option value="warenannahme-ab">Warenrückgabe absteigend</option>
          </select>

          <input
            className={styles.input}
            type="text"
            placeholder="Aufträge durchsuchen…"
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <label className={styles.sliderLabel}>Max. Länge: {maxLength} mm</label>
          <input type="range" min={0} max={LIMITS.length} step={10} value={maxLength} onChange={(e) => setMaxLength(+e.target.value)} className={styles.range} />

          <label className={styles.sliderLabel}>Max. Breite: {maxWidth} mm</label>
          <input type="range" min={0} max={LIMITS.width}  step={10} value={maxWidth}  onChange={(e) => setMaxWidth(+e.target.value)}  className={styles.range} />

          <label className={styles.sliderLabel}>Max. Höhe: {maxHeight} mm</label>
          <input type="range" min={0} max={LIMITS.height} step={10} value={maxHeight} onChange={(e) => setMaxHeight(+e.target.value)} className={styles.range} />

          <label className={styles.sliderLabel}>Max. Masse: {maxMasse} kg</label>
          <input type="range" min={0} max={LIMITS.masse}  step={10} value={maxMasse}  onChange={(e) => setMaxMasse(+e.target.value)}  className={styles.range} />

          {/* Warenausgabe */}
          <div className={styles.checkboxGroup}>
            <strong>Warenausgabe</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={waAbhol} onChange={() => setWaAbhol(!waAbhol)} />
              Abholung
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={waSelbst} onChange={() => setWaSelbst(!waSelbst)} />
              Selbstanlieferung
            </label>
            
          </div>

          {/* Warenannahme */}
          <div className={styles.checkboxGroup}>
            <strong>Warenannahme</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={wnZust} onChange={() => setWnZust(!wnZust)} />
              Zustellung
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={wnSelbst} onChange={() => setWnSelbst(!wnSelbst)} />
              Selbstabholung
            </label>
          </div>

          {/* Verfahren */}
          <div className={styles.checkboxGroup}>
            <strong>Verfahren</strong>
            {VERFAHREN.map((v) => (
              <label key={v} className={styles.checkboxLabel}>
                <input type="radio" name="verfahren" checked={verfahren === v} onChange={() => setVerfahren(v)} />
                {v} ({verfahrenCounts[v] ?? 0})
              </label>
            ))}
            <label className={styles.checkboxLabel}>
              <input type="radio" name="verfahren" checked={!verfahren} onChange={() => setVerfahren('')} />
              Alle
            </label>
          </div>

          {/* Typ */}
          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={gewerblich} onChange={() => setGewerblich(!gewerblich)} />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={privat} onChange={() => setPrivat(!privat)} />
              Privat
            </label>
          </div>
        </div>

        {/* CONTENT */}
        <div ref={contentRef} className={styles.content}>
          <h3 className={styles.anfrageUeberschrift}>
            {sortierteAuftraege.length} offene Aufträge
          </h3>

          <div className={styles.grid}>
            {anzeigen.map((a) => (
              <ArtikelContainerAuftragsboerse key={a.id} artikel={a} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            {page > 1 && <Link href={pageHref(page - 1)} className={styles.pageArrow}>←</Link>}
            {Array.from({ length: Math.ceil(sortierteAuftraege.length / seitenGroesse) }, (_, i) => (
              <Link
                key={i + 1}
                href={pageHref(i + 1)}
                className={`${styles.pageLink} ${page === i + 1 ? styles.activePage : ''}`}
              >
                {i + 1}
              </Link>
            ))}
            {page < Math.ceil(sortierteAuftraege.length / seitenGroesse) && (
              <Link href={pageHref(page + 1)} className={styles.pageArrow}>→</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
