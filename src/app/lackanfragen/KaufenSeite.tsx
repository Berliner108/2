'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import styles from './auftragsboerse.module.css';
import Pager from './navbar/pager';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { artikelDaten } from '../../data/ArtikelDatenLackanfragen';
import ArtikelCard from '../components/ArtikelCard';

const kategorien = ['Nasslack', 'Pulverlack'];
const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];
const herstellerFilter = [
  'Brillux', 'Sherwin Williams','PPG Industries','Nippon Paint', 'BASF', 'Asian Paints', 'Hempel',
  'Adler Lacke', 'Berger','Nerolac','Benjamin Moore','RPM International','IGP', 'Tiger', 'Axalta', 'Frei Lacke', 'Grimm', 
  'Akzo Nobel','Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag', 'Kansai',
  'Helios', 'Pulverkönig', 'Bentatec', 'Pulmatech', 'Colortech', 'VAL',
  'E-Pulverit', 'Braunsteiner', 'Ganzlin', 'Colors-Manufaktur', 'Aalbert',
  'Motec-Pulverlack', 'DuPont', 'Jotun', 'Pulvertech.de', 'Pulverlacke24.de',
  'Pulverlacke.de', 'Pulverlack-pro.de', 'Pulverlackshop.de',
];

export default function KaufenSeite() {
  const [suchbegriff, setSuchbegriff] = useState('');
  const [maxMenge, setMaxMenge] = useState(1000);
  const [kategorie, setKategorie] = useState('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(50);
  const router = useRouter();


  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  const seitenGroesse = 50;
  const startIndex = (page - 1) * seitenGroesse;
  const endIndex = page * seitenGroesse;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const kategorieQuery = searchParams.get('kategorie');
  useEffect(() => {
    if (kategorieQuery && (kategorieQuery === 'Nasslack' || kategorieQuery === 'Pulverlack')) {
      setKategorie(kategorieQuery);
    }
  }, [kategorieQuery]);

  const gefilterteArtikel = artikelDaten
    .filter((a) => !kategorie || a.kategorie === kategorie)
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter((a) => a.menge !== undefined && a.menge <= maxMenge);

  const fuse = new Fuse(gefilterteArtikel, {
    keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
    threshold: 0.35,
  });

  const suchErgebnis = suchbegriff
    ? fuse.search(suchbegriff).map((r) => r.item)
    : gefilterteArtikel;

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

  useEffect(() => {
    if (page !== 1) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setAnzahlAnzeigen((prev) => Math.min(prev + 10, sortierteArtikel.length));
        }
      },
      { rootMargin: '100px' }
    );

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [sortierteArtikel, page]);

  useEffect(() => {
  if (page !== 1) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const query = params.toString();
    const neueUrl = query ? `${location.pathname}?${query}` : location.pathname;
    router.replace(neueUrl);
  }
}, [suchbegriff, maxMenge, kategorie, zustand, hersteller, sortierung, gewerblich, privat]);




  const seitenArtikel = sortierteArtikel.slice(startIndex, endIndex);

  return (
    <>
      <Pager />
      <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Sidebar öffnen">
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar1open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar2open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar3open : ''}`} />
      </button>

      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

      <div className={styles.wrapper}>
        {/* SIDEBAR */}
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <input className={styles.input} type="text" placeholder="Lackanfrage finden..." value={suchbegriff} onChange={(e) => setSuchbegriff(e.target.value)} />
          <select className={styles.sortSelect} value={sortierung} onChange={(e) => setSortierung(e.target.value)}>
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum aufsteigend</option>
            <option value="lieferdatum-ab">Lieferdatum absteigend</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="menge-auf">Menge aufsteigend</option>
            <option value="menge-ab">Menge absteigend</option>
          </select>

          <input className={styles.range} type="range" min="0" max="1000" step="0.1" value={maxMenge} onChange={(e) => setMaxMenge(Number(e.target.value))} />
          <div className={styles.mengeText}>Max. Menge: {maxMenge} kg</div>

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

          <div className={styles.checkboxGroup}>
            <strong>Zustand</strong>
            {zustandFilter.map((z) => (
              <label key={z} className={styles.checkboxLabel}>
                <input type="checkbox" checked={zustand.includes(z)} onChange={() =>
                  setZustand((prev) => prev.includes(z) ? prev.filter((item) => item !== z) : [...prev, z])
                } />
                {z}
              </label>
            ))}
          </div>

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

          <div className={styles.checkboxGroup}>
            <strong>Hersteller</strong>
            {herstellerFilter.map((h) => (
              <label key={h} className={styles.checkboxLabel}>
                <input type="checkbox" checked={hersteller.includes(h)} onChange={() =>
                  setHersteller((prev) => prev.includes(h) ? prev.filter((item) => item !== h) : [...prev, h])
                } />
                {h}
              </label>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className={styles.content}>
          <h3 className={styles.anfrageUeberschrift}>
            {sortierteArtikel.length} {sortierteArtikel.length === 1 ? 'offene Lackanfrage' : 'offene Lackanfragen'}
          </h3>

          <div className={styles.grid}>
            {(page === 1 ? sortierteArtikel.slice(0, anzahlAnzeigen) : seitenArtikel).map((a) => (
              <ArtikelCard key={a.id} artikel={a} />
            ))}
            {page === 1 && <div ref={loadMoreRef} />}
          </div>
          <div className={styles.seitenInfo}>
  Seite {page} von {Math.ceil(sortierteArtikel.length / seitenGroesse)}
</div>

<div className={styles.pagination}>
  {page > 1 && (
    <Link href={page - 1 === 1 ? location.pathname : `?page=${page - 1}`} className={styles.pageArrow}>
      ←
    </Link>
  )}

  {Array.from({ length: Math.ceil(sortierteArtikel.length / seitenGroesse) }, (_, i) => {
    const pageNum = i + 1;
    const href = pageNum === 1 ? location.pathname : `?page=${pageNum}`;
    return (
      <Link
        key={pageNum}
        href={href}
        className={`${styles.pageLink} ${page === pageNum ? styles.activePage : ''}`}
      >
        {pageNum}
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
