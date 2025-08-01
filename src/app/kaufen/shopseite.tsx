'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import styles from './kaufen.module.css';
import Pager from './navbar/pager';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { artikelDaten } from '../../data/ArtikelimShop';
import ArtikelCard from '../components/ArtikelKarteShop';

const kategorien = ['Nasslack', 'Pulverlack', 'Arbeitsmittel'];
const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];
const herstellerFilter = [
  'Sherwin Williams','PPG Industries','Nippon Paint', 'BASF', 'Asian Paints', 'Hempel',
  'Adler Lacke', 'Berger','Nerolac','Benjamin Moore','RPM International','IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm Pulverlacke', 
  'Akzo Nobel','Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
  'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL',
  'E-Pulverit', 'Braunsteiner', 'Ganzlin', 'Colors-Manufaktur', 'Aalbert',
  'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de', 'Pulverlacke24.de',
  'Pulverlacke.de', 'Pulverlack-pro.de', 'Pulverlackshop.de',
];
export default function Shopseite() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1) Initialwert für Suchfeld aus URL holen (?search=...)
  const [suchbegriff, setSuchbegriff] = useState(
    () => searchParams.get('search') ?? ''
  );

  // 2) Wenn URL sich ändert, Suchfeld nachziehen
  useEffect(() => {
    setSuchbegriff(searchParams.get('search') ?? '');
  }, [searchParams]);

  // 3) Dynamisch höchsten Preis berechnen und State initialisieren
  const maxAvailablePrice = Math.max(...artikelDaten.map(a => a.preis));
  const [maxPreis, setMaxPreis] = useState(maxAvailablePrice);

  // alle anderen Filter‑States
  const [kategorie, setKategorie] = useState('');
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

  // Sidebar‐Filter: Kategorie aus URL 
  const kategorieQuery = searchParams.get('kategorie');
  useEffect(() => {
    if (kategorieQuery && kategorien.includes(kategorieQuery)) {
      setKategorie(kategorieQuery);
    }
  }, [kategorieQuery]);

  // 4) Artikel filtern – jetzt nach Preis statt Menge
  const gefilterteArtikel = artikelDaten
    .filter(a => !kategorie || a.kategorie === kategorie)
    .filter(a => zustand.length === 0 || zustand.includes(a.zustand))
    .filter(a => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter(a => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter(a => a.preis <= maxPreis);

  // Fuse.js für Volltextsuche über alle gefilterten Artikel
  const fuse = new Fuse(gefilterteArtikel, {
    keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
    threshold: 0.35,
  });
  const suchErgebnis = suchbegriff
    ? fuse.search(suchbegriff).map(r => r.item)
    : gefilterteArtikel;

  // gesponserte oben zuerst, dann je nach Sortierung
  const sortierteArtikel = [...suchErgebnis].sort((a, b) => {
    if (a.gesponsert && !b.gesponsert) return -1;
    if (!a.gesponsert && b.gesponsert) return 1;
    switch (sortierung) {
      case 'lieferdatum-auf':
        return new Date(a.lieferdatum).getTime() - new Date(b.lieferdatum).getTime();
      case 'lieferdatum-ab':
        return new Date(b.lieferdatum).getTime() - new Date(a.lieferdatum).getTime();
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

  // Infinite‐Scroll‐Setup
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (page !== 1) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setAnzahlAnzeigen(prev => Math.min(prev + 10, sortierteArtikel.length));
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
      const neueUrl = params.toString()
        ? `${location.pathname}?${params}`
        : location.pathname;
      router.replace(neueUrl);
    }
  }, [suchbegriff, maxPreis, kategorie, zustand, hersteller, sortierung, gewerblich, privat]);

  // für Pagination
  const seitenArtikel = sortierteArtikel.slice(startIndex, endIndex);

  return (
    <>
      <Pager />

      {/* Hamburger / Sidebar toggle */}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(open => !open)}
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
            onChange={e => setSuchbegriff(e.target.value)}
          />

          {/* Sortierung */}
          <select
            className={styles.sortSelect}
            value={sortierung}
            onChange={e => setSortierung(e.target.value)}
          >
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
            onChange={e => setMaxPreis(Number(e.target.value))}
          />
          <div className={styles.mengeText}>
            Max. Preis: {maxPreis.toFixed(2)} €
          </div>

          {/* Kategorie */}
          <div className={styles.checkboxGroup}>
            <strong>Kategorie</strong>
            {kategorien.map(k => (
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
              <input
                type="radio"
                name="kategorie"
                checked={kategorie === ''}
                onChange={() => setKategorie('')}
              />
              Alle
            </label>
          </div>

          {/* Zustand */}
          <div className={styles.checkboxGroup}>
            <strong>Zustand</strong>
            {zustandFilter.map(z => (
              <label key={z} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={zustand.includes(z)}
                  onChange={() =>
                    setZustand(prev => prev.includes(z) ? prev.filter(i => i !== z) : [...prev, z])
                  }
                />
                {z}
              </label>
            ))}
          </div>

          {/* Verkaufstyp */}
          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={gewerblich}
                onChange={() => setGewerblich(g => !g)}
              />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={privat}
                onChange={() => setPrivat(p => !p)}
              />
              Privat
            </label>
          </div>

          {/* Hersteller */}
          <div className={styles.checkboxGroup}>
            <strong>Hersteller</strong>
            {herstellerFilter.map(h => (
              <label key={h} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hersteller.includes(h)}
                  onChange={() =>
                    setHersteller(prev => prev.includes(h) ? prev.filter(i => i !== h) : [...prev, h])
                  }
                />
                {h}
              </label>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          <h3 className={styles.anfrageUeberschrift}>
            {sortierteArtikel.length} Artikel im Shop
          </h3>

          <div className={styles.grid}>
            {(page === 1
              ? sortierteArtikel.slice(0, anzahlAnzeigen)
              : seitenArtikel
            ).map(a => (
              <ArtikelCard key={a.id} artikel={a} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>

          {/* Pagination */}
          <div className={styles.seitenInfo}>
            Seite {page} von {Math.ceil(sortierteArtikel.length / seitenGroesse)}
          </div>
          <div className={styles.pagination}>
            {page > 1 && (
              <Link
                href={page - 1 === 1 ? location.pathname : `?page=${page - 1}`}
                className={styles.pageArrow}
              >
                ←
              </Link>
            )}
            {Array.from({ length: Math.ceil(sortierteArtikel.length / seitenGroesse) }, (_, i) => {
              const p = i + 1;
              const href = p === 1 ? location.pathname : `?page=${p}`;
              return (
                <Link
                  key={p}
                  href={href}
                  className={`${styles.pageLink} ${page === p ? styles.activePage : ''}`}
                >
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
