'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import Image from 'next/image';
import styles from './auftragsboerse.module.css';
import Pager from './navbar/pager';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { artikelDaten } from '../../data/ArtikelDatenLackanfragen';
import ArtikelCard from '../components/ArtikelCard'; // anpassen je nach Pfad






const kategorien = ['Nasslack', 'Pulverlack'];
const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];
const herstellerFilter = [
  'Alle',
  'IGP',
  'Tiger',
  'Axalta',
  'Frei Lacke',
  'Grimm Pulverlacke',
  'Akzo Nobel',  
  'Sherwin Williams',
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


export default function KaufenSeite() {
const [suchbegriff, setSuchbegriff] = useState('');
  const [maxMenge, setMaxMenge] = useState(1000);
  const [kategorie, setKategorie] = useState('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(10);
  const [gewerblich, setGewerblich] = useState(false);
  const [privat, setPrivat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const searchParams = useSearchParams();
  
  const kategorieQuery = searchParams.get('kategorie');
  useEffect(() => {
    if (kategorieQuery && (kategorieQuery === 'Nasslack' || kategorieQuery === 'Pulverlack')) {
      setKategorie(kategorieQuery);
    }
  }, [kategorieQuery]);
  const vorSuchFilter = artikelDaten
    .filter((a) => !kategorie || a.kategorie === kategorie)
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter((a) => a.menge !== undefined && a.menge <= maxMenge)


const fuse = new Fuse(vorSuchFilter, {
  keys: ['titel', 'hersteller', 'zustand', 'kategorie'],
  threshold: 0.35, // Toleranz – je kleiner, desto strenger
});


  

  const suchErgebnis = suchbegriff
    ? fuse.search(suchbegriff).map((r) => r.item).filter((item) => vorSuchFilter.includes(item))
    : vorSuchFilter;

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
      case 'bewertung-auf':
      return (a.menge ?? 0) - (b.menge ?? 0);
      case 'bewertung-ab':
      return (b.menge ?? 0) - (a.menge ?? 0);

      default:
        return 0;
    }
  });
 

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [sortierteArtikel]);

  useEffect(() => {
    setAnzahlAnzeigen(10);
  }, [suchbegriff, maxMenge, kategorie, zustand, hersteller, sortierung, gewerblich, privat]);


  return (
    <>
      <Pager />
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Sidebar öffnen"
      >
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar1open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar2open : ''}`} />
        <span className={`${styles.bar} ${sidebarOpen ? styles.bar3open : ''}`} />
      </button>


{sidebarOpen && (
  <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
)}

      <div className={styles.wrapper}>
        
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>

          <input
            className={styles.input}
            type="text"
            placeholder="Lackanfrage finden..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

          <select
            className={styles.sortSelect}
            value={sortierung}
            onChange={(e) => setSortierung(e.target.value)}
          >
            
            <option value="">Sortieren</option>
            <option value="lieferdatum-auf">Lieferdatum aufsteigend</option>
            <option value="lieferdatum-ab">Lieferdatum absteigend</option>
            <option value="titel-az">Titel A–Z</option>
            <option value="titel-za">Titel Z–A</option>
            <option value="bewertung-auf">Menge aufsteigend</option>
            <option value="bewertung-ab">Menge absteigend</option>
          </select>

          <input
  className={styles.range}
  type="range"
  min="0"
  max="1000"
  step="0.1"
  value={maxMenge}
  onChange={(e) => setMaxMenge(Number(e.target.value))}
/>
<div className={styles.bewertetText}>Max. Menge: {maxMenge} kg</div>


          <div className={styles.checkboxGroup}>
            <div className={styles.Kategorie}><strong>Kategorie</strong></div>
            {kategorien.map((k) => (
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

          <div className={styles.checkboxGroup}>
            <strong>Zustand</strong>
            {zustandFilter.map((z) => (
              <label key={z} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={zustand.includes(z)}
                  onChange={() =>
                    setZustand((prev) =>
                      prev.includes(z) ? prev.filter((item) => item !== z) : [...prev, z]
                    )
                  }
                />
                {z}
              </label>
            ))}
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Verkaufstyp</strong>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={gewerblich}
                onChange={() => setGewerblich((prev) => !prev)}
              />
              Gewerblich
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={privat}
                onChange={() => setPrivat((prev) => !prev)}
              />
              Privat
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <strong>Hersteller</strong>
            {herstellerFilter.map((h) => (
              <label key={h} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hersteller.includes(h)}
                  onChange={() =>
                    setHersteller((prev) =>
                      prev.includes(h) ? prev.filter((item) => item !== h) : [...prev, h]
                    )
                  }
                />
                {h}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.content}>
  <h3>
    {sortierteArtikel.length} {sortierteArtikel.length === 1 ? 'offene Lackanfrage' : 'offene Lackanfragen'}
  </h3>

  <div className={styles.grid}>
  {sortierteArtikel.slice(0, anzahlAnzeigen).map((a) => (
    <ArtikelCard key={a.id} artikel={a} />
  ))}
  <div ref={loadMoreRef} />
</div>

</div> {/* schließt .content */}
      </div> {/* schließt .wrapper */}
    </>
  );
}
