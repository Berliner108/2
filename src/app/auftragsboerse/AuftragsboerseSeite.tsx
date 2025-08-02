'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import styles from './auftragsboerse.module.css';
import Pager from './navbar/pager';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { dummyAuftraege, Auftrag } from '../../data/dummyAuftraege';
import ArtikelContainerAuftragsboerse from '../components/ArtikelContainerAuftragsboerse';

// Erzeuge Liste aller Verfahren
const verfahrenFilter = Array.from(
  new Set(
    dummyAuftraege.flatMap((a) => a.verfahren.map((v) => v.name))
  )
);

// Bestimme Maximalwerte für Slider
const maxValues = dummyAuftraege.reduce(
  (acc, a) => ({
    length: Math.max(acc.length, a.length),
    width:  Math.max(acc.width,  a.width),
    height: Math.max(acc.height, a.height),
    masse:  Math.max(acc.masse,  parseFloat(a.masse)),
  }),
  { length: 0, width: 0, height: 0, masse: 0 }
);

export default function AuftragsboerseSeite() {
  // Such-, Filter- und Slider-State
  const [suchbegriff, setSuchbegriff]     = useState('');
  const [verfahren, setVerfahren]         = useState('');
  const [gewerblich, setGewerblich]       = useState(false);
  const [privat, setPrivat]               = useState(false);
  const [sortierung, setSortierung]       = useState('');
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [anzeigenLimit, setAnzeigenLimit] = useState(50);

  // Slider für Maße & Masse
  const [maxLength, setMaxLength] = useState(maxValues.length);
  const [maxWidth,  setMaxWidth ] = useState(maxValues.width);
  const [maxHeight, setMaxHeight] = useState(maxValues.height);
  const [maxMasse,  setMaxMasse ] = useState(maxValues.masse);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const page         = parseInt(searchParams.get('page') || '1', 10);
  const seitenGroesse= 50;
  const startIndex   = (page - 1) * seitenGroesse;
  const endIndex     = page * seitenGroesse;

  const observerRef  = useRef<IntersectionObserver | null>(null);
  const loadMoreRef  = useRef<HTMLDivElement>(null);

  // 1) Filterung inkl. Slider
  const gefilterteAuftraege = dummyAuftraege
    .filter((a) => !verfahren || a.verfahren.some((v) => v.name === verfahren))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => a.length <= maxLength)
    .filter((a) => a.width  <= maxWidth)
    .filter((a) => a.height <= maxHeight)
    .filter((a) => parseFloat(a.masse) <= maxMasse);

  // 2) Volltextsuche mit Fuse
  const fuse = new Fuse<Auftrag>(gefilterteAuftraege, {
    keys: ['verfahren.name', 'material', 'standort', 'user'],
    threshold: 0.4,
  });
  const suchErgebnis = suchbegriff
    ? fuse.search(suchbegriff).map((r) => r.item)
    : gefilterteAuftraege;

  // 3) Sortierung (Gesponsert + Datum)
  const sortierteAuftraege = [...suchErgebnis].sort((a, b) => {
    if (a.gesponsert && !b.gesponsert) return -1;
    if (!a.gesponsert && b.gesponsert) return 1;
    switch (sortierung) {
      case 'lieferdatum-auf': return a.lieferdatum.getTime() - b.lieferdatum.getTime();
      case 'lieferdatum-ab': return b.lieferdatum.getTime() - a.lieferdatum.getTime();
      default: return 0;
    }
  });

  // 4) Infinite Scroll nur auf Seite 1
  useEffect(() => {
    if (page !== 1) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnzeigenLimit((prev) => Math.min(prev + 10, sortierteAuftraege.length));
        }
      },
      { rootMargin: '100px' }
    );
    loadMoreRef.current && observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [sortierteAuftraege, page]);

  // URL Cleanup nach Filteränderungen
  useEffect(() => {
    if (page !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      router.replace(params.toString() ? `${location.pathname}?${params}` : location.pathname);
    }
  }, [suchbegriff, verfahren, gewerblich, privat, sortierung]);

  // 5) Paginierung
  const seiten  = sortierteAuftraege.slice(startIndex, endIndex);
  const anzeigen= page === 1
    ? sortierteAuftraege.slice(0, anzeigenLimit)
    : seiten;

  return (
    <>
      <Pager />

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
        {/* SIDEBAR mit Filtern */}
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <select
            className={styles.sortSelect}
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
          >
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum ↑</option>
            <option value="lieferdatum-ab">Lieferdatum ↓</option>
          </select>

          <input
            className={styles.input}
            type="text"
            placeholder="Aufträge durchsuchen…"
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <label className={styles.sliderLabel}>
  Max. Länge: {maxLength} mm
</label>
<input
  type="range"
  min={0}
  max={maxValues.length}
  value={maxLength}
  onChange={(e) => setMaxLength(+e.target.value)}
  className={styles.range}
/>

<label className={styles.sliderLabel}>
  Max. Breite: {maxWidth} mm
</label>
<input
  type="range"
  min={0}
  max={maxValues.width}
  value={maxWidth}
  onChange={(e) => setMaxWidth(+e.target.value)}
  className={styles.range}
/>

<label className={styles.sliderLabel}>
  Max. Höhe: {maxHeight} mm
</label>
<input
  type="range"
  min={0}
  max={maxValues.height}
  value={maxHeight}
  onChange={(e) => setMaxHeight(+e.target.value)}
  className={styles.range}
/>

<label className={styles.sliderLabel}>
  Max. Masse: {maxMasse} kg
</label>
<input
  type="range"
  min={0}
  max={maxValues.masse}
  value={maxMasse}
  onChange={(e) => setMaxMasse(+e.target.value)}
  className={styles.range}
/>


          <div className={styles.checkboxGroup}>
            <strong>Verfahren</strong>
            {verfahrenFilter.map((v) => (
              <label key={v} className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="verfahren"
                  checked={verfahren === v}
                  onChange={() => setVerfahren(v)}
                />
                {v}
              </label>
            ))}
            <label className={styles.checkboxLabel}>
              <input
                type="radio"
                name="verfahren"
                checked={!verfahren}
                onChange={() => setVerfahren('')}
              />
              Alle
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Typ</strong>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={gewerblich}
                onChange={() => setGewerblich(!gewerblich)}
              />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={privat}
                onChange={() => setPrivat(!privat)}
              />
              Privat
            </label>
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
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
            {page > 1 && (
              <Link
                href={page - 1 === 1 ? location.pathname : `?page=${page - 1}`}
                className={styles.pageArrow}
              >
                ←
              </Link>
            )}
            {Array.from(
              { length: Math.ceil(sortierteAuftraege.length / seitenGroesse) },
              (_, i) => (
                <Link
                  key={i + 1}
                  href={i === 0 ? location.pathname : `?page=${i + 1}`}
                  className={`${styles.pageLink} ${
                    page === i + 1 ? styles.activePage : ''
                  }`}
                >
                  {i + 1}
                </Link>
              )
            )}
            {page < Math.ceil(sortierteAuftraege.length / seitenGroesse) && (
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
