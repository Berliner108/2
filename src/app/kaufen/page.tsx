'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './kaufen.module.css';
import Pager from './navbar/pager';

const kategorien = ['Nasslack', 'Pulverlack', 'Arbeitsmittel'];
const zustandFilter = ['Neu und ungeöffnet', 'Angebraucht und einwandfrei'];
const herstellerFilter = ['IGP', 'Axalta', 'Frei Lacke', 'Grimm Pulverlacke', 'Akzo Nobel', 'Tiger', 'Sherwin Williams', 'Teknos', 'Pulver Kimya', 'Kabe', 'Wörwag'];


const artikelDaten = [
  {
    id: 1,
    titel: 'RAL 6005 glatt matt',
    preis: 4.55,
    versand: 6.5 ,
    lieferzeit: 3,
    hersteller: 'IGP',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    bewertet: '4.8',
    anbieterTyp: 'Gewerblich',
    bild: '/images/artikel1.jpg',
    gesponsert: true,
    gewerblich: true,  
    privat: false,
    
  },
  {
    id: 2,
    titel: 'NCS S-8000 glatt seidenglanz',
    preis: 8.77,
    lieferzeit: 4,
    hersteller: 'Axalta',
    zustand: 'Angebraucht und einwandfrei',
    kategorie: 'Nasslack',
    bewertet: '4.5',
    versand: 6.1 ,
    bild: '/images/artikel2.jpg',
    gesponsert: false,
    gewerblich: false,
    privat: true,
  },
  {
    id: 3,
    titel: 'RAL 7038 glatt matt',
    preis: 7.41,
    lieferzeit: 2,
    versand: 8.5 ,
    hersteller: 'IGP',
    zustand: 'Angebraucht und einwandfrei',
    kategorie: 'Pulverlack',
    bewertet: '4.9',
    verkaeufer: 'Powdermarket',
    bild: '/images/artikel3.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
  },
  {
    id: 4,
    titel: 'DB 702 feinstruktur seidenmatt',
    preis: 12.54,
    lieferzeit: 4,
    versand: 5.7 ,
    hersteller: 'IGP',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    bewertet: '4.9',
    verkaeufer: 'Coatingmaster',
    bild: '/images/artikel4.jpg',
    gesponsert: false,
    gewerblich: true,
    privat: false,
  },
  {
    id: 5,
    titel: 'NCS S-3050-B20G glatt hochglanz',
    preis: 6.56,
    lieferzeit: 3,
    versand: 5.5 ,
    hersteller: 'Axalta',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    bewertet: '4.9',
    verkaeufer: 'Lackmeister',
    bild: '/images/artikel5.jpg',
    gesponsert: false,
    gewerblich: false,
    privat: true,
  },
  {
    id: 6,
    titel: 'RAL 7033 grobstruktur tiefmatt',
    preis: 8.01,
    lieferzeit: 3,
    versand: 5.2 ,
    hersteller: 'Axalta',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Nasslack',
    bewertet: '4.9',
    verkaeufer: 'AM Coatings',
    bild: '/images/artikel6.jpg',
    gesponsert: false,
    gewerblich: false,
    privat: true,
  },
  {
    id: 7,
    titel: 'DB 703 glatt seidenmatt',
    preis: 8.89,
    lieferzeit: 3,
    versand: 4.9 ,
    hersteller: 'Frei Lacke',
    zustand: 'Angebraucht und einwandfrei',
    kategorie: 'Pulverlack',
    bewertet: '4.9',
    verkaeufer: 'Frei Lacke',
    bild: '/images/artikel7.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
  },
  {
    id: 8,
    titel: 'RAL 9005 glatt stumpfmatt',
    preis: 6.8,
    lieferzeit: 5,
    versand: 5.3 ,
    hersteller: 'Frei Lacke',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    bewertet: '4.9',
    verkaeufer: 'Arden17',
    bild: '/images/artikel8.jpg',
    gesponsert: false,
    gewerblich: true,
    privat: false,
  },
  {
    id: 9,
    titel: 'RAL 9016 glatt stumpfmatt',
    preis: 3.21,
    lieferzeit: 5,
    versand: 4.5 ,
    hersteller: 'Frei Lacke',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Nasslack',
    bewertet: '4.9',
    verkaeufer: 'AM Lacke',
    bild: '/images/artikel9.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
  },
  {
    id: 10,
    titel: 'RAL 7016 feinstruktur matt',
    preis: 4.67,
    lieferzeit: 3,
    versand: 8.5 ,
    hersteller: 'IGP',
    zustand: 'Angebraucht und einwandfrei',
    kategorie: 'Pulverlack',
    bewertet: '5.0',
    verkaeufer: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
  },
  {
    id: 11,
    titel: '10 Stück Stretchfolie 26 mm',
    preis: 4.67,
    lieferzeit: 3,
    versand: 8.5 ,
    hersteller: 'Folienfabrik',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Arbeitsmittel',
    bewertet: '4.1',    
    bild: '/images/stretch.jpg',
    gesponsert: false,
    gewerblich: true,
    privat: false,
  },
  // ... weitere Artikel nach dem gleichen Muster
];

export default function KaufenSeite() {
  const [suchbegriff, setSuchbegriff] = useState('');
  const [preis, setPreis] = useState(100);
  const [kategorie, setKategorie] = useState('');
  const [zustand, setZustand] = useState<string[]>([]);
  const [hersteller, setHersteller] = useState<string[]>([]);
  const [sortierung, setSortierung] = useState('');
  const [anzahlAnzeigen, setAnzahlAnzeigen] = useState(10);

  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 100
    ) {
      setAnzahlAnzeigen((prev) => Math.min(prev + 10, gefilterteArtikel.length));
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });

  const gefilterteArtikel = artikelDaten
    .filter((a) => a.titel.toLowerCase().includes(suchbegriff.toLowerCase()))
    .filter((a) => !kategorie || a.kategorie === kategorie)
    .filter((a) => a.preis <= preis)
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller));

  const sortierteArtikel = [...gefilterteArtikel].sort((a, b) => {
    if (a.gesponsert && !b.gesponsert) return -1;
    if (!a.gesponsert && b.gesponsert) return 1;

    switch (sortierung) {
      case 'preis-auf':
        return a.preis - b.preis;
      case 'preis-ab':
        return b.preis - a.preis;
      case 'lieferzeit-auf':
        return a.lieferzeit - b.lieferzeit;
      case 'lieferzeit-ab':
        return b.lieferzeit - a.lieferzeit;
      case 'titel-az':
        return a.titel.localeCompare(b.titel);
      case 'titel-za':
        return b.titel.localeCompare(a.titel);
      case 'bewertung-auf':
        return parseFloat(a.bewertet) - parseFloat(b.bewertet);
      case 'bewertung-ab':
        return parseFloat(b.bewertet) - parseFloat(a.bewertet);
      default:
        return 0;
    }
  });

  return (
    <>
      <Pager />
      <div className={styles.wrapper}>
        <div className={styles.sidebar}>
          <input
            className={styles.input}
            type="text"
            placeholder="Suche..."
            value={suchbegriff}
            onChange={(e) => setSuchbegriff(e.target.value)}
          />

<select
  className={styles.sortSelect}
  value={sortierung}
  onChange={(e) => setSortierung(e.target.value)}
>
  <option value="">Sortieren</option>
  <option value="preis-auf">Preis ↑</option>
  <option value="preis-ab">Preis ↓</option>
  <option value="lieferzeit-auf">Lieferzeit ↑</option>
  <option value="lieferzeit-ab">Lieferzeit ↓</option>
  <option value="titel-az">Titel A–Z</option>
  <option value="titel-za">Titel Z–A</option>
  <option value="bewertung-auf">Bewertung ↑</option>
  <option value="bewertung-ab">Bewertung ↓</option>
</select>


          <input
            className={styles.range}
            type="range"
            min="0"
            max="100"
            step="0.01"
            value={preis}
            onChange={(e) => setPreis(Number(e.target.value))}
          />
          <div>Max. Preis: {preis} €</div>

          <div className={styles.checkboxGroup}>
  <strong>Kategorie</strong>
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
            prev.includes(z)
              ? prev.filter((item) => item !== z)
              : [...prev, z]
          )
        }
      />
      {z}
    </label>
  ))}
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
                      prev.includes(h)
                        ? prev.filter((item) => item !== h)
                        : [...prev, h]
                    )
                  }
                />
                {h}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.sortRow}>
            <select
              className={styles.sortSelect}
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value)}
            >
              <option value="">Sortieren</option>
              <option value="preis-auf">Preis ↑</option>
              <option value="preis-ab">Preis ↓</option>
              <option value="lieferzeit-auf">Lieferzeit ↑</option>
              <option value="lieferzeit-ab">Lieferzeit ↓</option>
            </select>
          </div>

          <div className={styles.grid}>
            {sortierteArtikel.slice(0, anzahlAnzeigen).map((a) => (
              <div key={a.id} className={styles.card}>
                <Image
                  src={a.bild}
                  width={250}
                  height={250}
                  alt={a.titel}
                />
                <div className={styles.cardTitle}>{a.titel}</div>                
                <div className={styles.cardText}>Preis: {a.preis} € </div>
                <div className={styles.cardText}>Versand: {a.versand} €</div> 
                <div className={styles.cardText}>Kategorie: {a.kategorie}</div>              
                <div className={styles.cardText}>Lieferzeit: {a.lieferzeit} Werktage</div>
                <div className={styles.cardText}>Hersteller: {a.hersteller}</div>
                <div className={styles.cardText}>Zustand: {a.zustand}</div>
                <div className={styles.cardText}>Bewertung: {a.bewertet} ⭐</div>                
                {a.gesponsert && (
                  <div className={styles.cardText} style={{ color: 'gray' }}>
                    *Gesponsert*
                  </div>
                )}
                {a.gewerblich && (
                  <div className={styles.cardText} style={{ color: 'green' }}>
                    gewerblich
                  </div>
                )}
                {a.privat && (
                  <div className={styles.cardText} style={{ color: 'blue' }}>
                    privat
                  </div>
                )}
                
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
