'use client';

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import Image from 'next/image';
import styles from './auftragsboerse.module.css';
import Pager from './navbar/pager';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const kategorien = ['Nasslack', 'Pulverlack'];
const zustandFilter = ['Neu und ungeöffnet', 'Geöffnet und einwandfrei'];
const herstellerFilter = [
  'Alle',
  'IGP',
  'Axalta',
  'Frei Lacke',
  'Grimm Pulverlacke',
  'Akzo Nobel',
  'Tiger',
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
  'Motec-pulverlack.de',
  'Pulvertech.de',
  'Pulverlacke24.de',
  'Pulverlacke.de',
  'Pulverlack-pro.de',
  'Pulverlackshop.de',
];
// Berechnet das Lieferdatum basierend auf Werktagen
function berechneLieferdatum(werktage: number) {
  const date = new Date();
  let addedDays = 0;
  while (addedDays < werktage) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      addedDays++;
    }
  }
  return date;
}
const artikelDaten = [
  {
    id: '1',
    titel: 'QUARTZ 2 Feinstruktur Matt',
    menge: 25,
    lieferdatum: berechneLieferdatum(3),
    hersteller: 'IGP',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    bewertet: '25',
    ort: '6330 Kufstein',
    bild: '/images/artikel1.jpg',
    gesponsert: true,
    gewerblich: false,  
    privat: true,    
  },
  {
    id: 2,
    titel: 'GREEN Feinstruktur Matt',  
    menge: 75,  
    lieferdatum: berechneLieferdatum(10),
    hersteller: 'Tiger',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    bewertet: '75',
    ort: '87645 Schwangau',
    bild: '/images/artikel2.jpg',
    gesponsert: false,
    gewerblich: false,
    privat: true,
  },
  {
    id: 3,
    titel: 'Marmorgrau glatt matt',        
    lieferdatum: berechneLieferdatum(15),
    hersteller: 'IGP',
    zustand: 'Geöffnet und einwandfrei',
    ort: '83435 Bad Reichenhall',
    kategorie: 'Pulverlack',
    menge: 710,  
    bewertet: '710',
    user: 'Powdermarket',
    bild: '/images/sonderlack1.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
  },
  {
    id: 4,
    titel: 'Messing glatt seidenglanz metallic',    
    lieferdatum: berechneLieferdatum(12),
    hersteller: 'IGP',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    ort: '83646 Bad Tölz',
    menge: 20,  
    bewertet: '20',
    user: 'Coatingmaster',
    bild: '/images/sonderlack3.jpg',
    gesponsert: false,
    gewerblich: true,
    privat: false,
    
  },
  {
    id: 5,
    titel: 'Sonnengold glatt seidenglanz metallic',    
    lieferdatum: berechneLieferdatum(6),
    hersteller: 'Axalta',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    menge: 980,  
    bewertet: '980',
    user: 'Lackmeister',
    bild: '/images/artikel5.jpg',
    gesponsert: false,
    gewerblich: false,
    privat: true,
    ort: '38855 Wernigerode',
  },
  {
    id: 6,
    titel: 'PealyHaze glatt matt metallic',    
    lieferdatum: berechneLieferdatum(2),
    hersteller: 'Axalta',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Nasslack',
    menge: 22,
    bewertet: '22',
    user: 'AM Coatings',
    bild: '/images/sonderlack4.jpg',
    gesponsert: false,
    gewerblich: false,
    privat: true,
    ort: '91550 Dinkelsbühl',
  },
  {
    id: 7,
    titel: 'Eloxalsilber glatt matt metallic',    
    lieferdatum: berechneLieferdatum(2),
    hersteller: 'Alle',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 25,
    bewertet: '25',
    user: 'Frei Lacke',
    bild: '/images/artikel7.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '82481 Mittenwald',
  },
  {
    id: 8,
    titel: 'GoldenHoney Glatt Matt Metallic',    
    lieferdatum: berechneLieferdatum(4),   
    hersteller: 'Frei Lacke',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Pulverlack',
    menge: 48,
    bewertet: '48',
    user: 'Arden17',
    bild: '/images/artikel8.jpg',
    gesponsert: false,
    gewerblich: true,
    privat: false,
    ort: '4820 Bad Ischl',
  },
  {
    id: 9,
    titel: 'Liebherr Grau Glatt Seidenmatt Uni',       
    lieferdatum: berechneLieferdatum(1),
    hersteller: 'Frei Lacke',
    zustand: 'Neu und ungeöffnet',
    kategorie: 'Nasslack',
    menge: 0.5,
    bewertet: '0.5',
    user: 'AM Lacke',
    bild: '/images/artikel9.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '4830 Hallstatt',
  },
  {
    id: 10,
    titel: 'ELVES BENCH Feinstruktur Matt Metallic',    
    lieferdatum: berechneLieferdatum(3),
    hersteller: 'IGP',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 85,
    bewertet: '85',
    user: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '6240 Rattenberg',
  },
  {
    id: 11,
    titel: 'AMETHYST1 Feinstruktur Matt',    
    lieferdatum: berechneLieferdatum(10),
    hersteller: 'Pulver Kimya',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 205,
    bewertet: '205',
    user: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '87629 Füssen',
  },  
  {
    id: 12,
    titel: 'Anodic Champagne Glatt Matt',    
    lieferdatum: berechneLieferdatum(9),
    hersteller: 'IGP',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 850,
    bewertet: '850',
    user: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '88709 Meersburg',
  },  
  {
    id: 13,
    titel: 'BLACK2 Glatt Seidenmatt',    
    lieferdatum: berechneLieferdatum(7),
    hersteller: 'IGP',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 450,
    bewertet: '450',
    user: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '06484 Quedlinburg',
  },  
  {
    id: 14,
    titel: 'EDGE PRIMER - Grundierung Glatt Tiefmatt Uni',    
    lieferdatum: berechneLieferdatum(12),
    hersteller: 'IGP',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 98,
    bewertet: '98',
    user: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '02826 Görlitz',
  },  
  {
    id: 15,
    titel: 'Precious Sand  Feinstruktur Matt HWFMetallic',    
    lieferdatum: berechneLieferdatum(3),
    hersteller: 'IGP',
    zustand: 'Geöffnet und einwandfrei',
    kategorie: 'Pulverlack',
    menge: 57,
    bewertet: '57',
    user: 'Premium Powder',
    bild: '/images/artikel10.jpg',
    gesponsert: true,
    gewerblich: true,
    privat: false,
    ort: '96047 Bamberg',
  },    
  // ... weitere Artikel nach dem gleichen Muster
];

export default function KaufenSeite() {
  const [suchbegriff, setSuchbegriff] = useState('');
  const [bewertet, setBewertet] = useState(1000);
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

  const fuse = new Fuse(artikelDaten, {
    keys: ['titel'],
    threshold: 0.3,
  });

  const vorSuchFilter = artikelDaten
    .filter((a) => !kategorie || a.kategorie === kategorie)
    .filter((a) => zustand.length === 0 || zustand.includes(a.zustand))
    .filter((a) => (!gewerblich && !privat) || (gewerblich && a.gewerblich) || (privat && a.privat))
    .filter((a) => hersteller.length === 0 || hersteller.includes(a.hersteller))
    .filter((a) => parseFloat(a.bewertet) <= bewertet);

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
        return parseFloat(a.bewertet) - parseFloat(b.bewertet);
      case 'bewertung-ab':
        return parseFloat(b.bewertet) - parseFloat(a.bewertet);
      default:
        return 0;
    }
  });
  const groupedArticles = [];
for (let i = 0; i < sortierteArtikel.length; i += 4) {
  groupedArticles.push(sortierteArtikel.slice(i, i + 4));
}

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
  }, [suchbegriff, bewertet, kategorie, zustand, hersteller, sortierung, gewerblich, privat]);

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
  value={bewertet}
  onChange={(e) => setBewertet(Number(e.target.value))}
/>
<div className={styles.bewertetText}>Max. Menge: {bewertet} kg</div>

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
    {sortierteArtikel.slice(0, anzahlAnzeigen).map((a, index) => (
      <React.Fragment key={a.id}>
        <div
          className={`${styles.card} ${a.gesponsert ? styles.gesponsert : ''}`}
        >
          <div className={styles.cardBildWrapper}>
            <Image
              className={styles.cardBild}
              src={a.bild}
              alt={a.titel}
              fill
              priority
            />
          </div>

          {a.gesponsert && <div className={styles.gesponsertLabel}>Gesponsert</div>}

          <div className={styles.cardText1}>{a.titel}</div>
          <div className={styles.cardText2}>Menge: {a.menge} kg</div>
          <div className={styles.cardText3}>
            Lieferdatum: {a.lieferdatum.toLocaleDateString('de-DE')}
          </div>
          <div className={styles.cardText4}>Hersteller: {a.hersteller}</div>
          <div className={styles.cardText5}>Zustand: {a.zustand}</div>
          <div className={styles.cardText6}>Kategorie: {a.kategorie}</div>
          <div className={styles.cardText6}>Ort: {a.ort}</div>

          {a.gewerblich && (
            <div className={styles.cardText7} style={{ color: 'green' }}>
              gewerblich
            </div>
          )}
          {a.privat && (
            <div className={styles.cardText7} style={{ color: 'blue' }}>
              privat
            </div>
          )}

          <div className={styles.cardButtonWrapper}>
            <Link href={`/lackanfragen/artikel/${a.id}`}>
              <button className={styles.cardButton}>Lack anbieten</button>
            </Link>
          </div>
        </div>

        {/* Banner nach dem 8. Artikel einfügen */}
{index === 7 && (
  <div className={styles.fullWidthBanner} key="banner">
    <div className={styles.bannerWrapper}>
      <Image
        src="/images/werbung.jpg"
        alt="Banner"
        fill
        style={{ objectFit: 'cover' }}
        className={styles.bannerImage}
        priority
      />
      <div className={styles.gradientOverlay} />
    </div>
  </div>
        )}
      </React.Fragment>
    ))}
  </div>
  <div ref={loadMoreRef} />
</div>
      </div>
    </>
  );
}
