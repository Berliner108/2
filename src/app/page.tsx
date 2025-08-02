'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Slideshow from './slideshow/slideshow';
import CookieBanner from './components/CookieBanner';
import { dummyAuftraege } from '@/data/dummyAuftraege';
import styles from '../styles/Home.module.css';
import { artikelDaten as artikelDatenLackanfragen } from '@/data/ArtikelDatenLackanfragen';
import { artikelDaten as artikelDatenShop } from '@/data/ArtikelimShop';
import { MapPin } from 'lucide-react';
import SearchBox from './components/SearchBox';

type Auftrag = {
  id: string | number;
  bilder: string[];
  verfahren: { name: string; felder: any }[];
  material: string;
  length: number;
  width: number;
  height: number;
  masse: string;
  standort: string;
  lieferdatum: Date;
  abholdatum: Date;
  abholArt: string;
  lieferArt: string;
  gesponsert?: boolean;
};
type Lackanfrage = {
  id: string | number;
  titel: string;
  bilder: string[];
  menge: number;
  lieferdatum: Date;
  hersteller: string;
  zustand: string;
  kategorie: string;
  ort: string;
};
const formatDate = (date: Date) =>
  isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-AT');

const sponsoredAuftraege: Auftrag[] = dummyAuftraege
  .filter((a) => a.gesponsert)
  .slice(0, 12)
  .map((a) => ({
    ...a,
    lieferdatum: new Date(a.lieferdatum),
    abholdatum: new Date(a.abholdatum),
  }));

export default function Page() {
  // scroll‑Refs
  const scrollRefAuftraege = useRef<HTMLDivElement>(null);
  const scrollRefShop = useRef<HTMLDivElement>(null);
  const scrollRefLackanfragen = useRef<HTMLDivElement>(null);

  // Auftrags‑State & Fetch
  const [auftraege, setAuftraege] = useState<Auftrag[]>(sponsoredAuftraege);
  useEffect(() => {
    const fetchAuftraege = async () => {
      try {
        const res = await fetch('/api/auftraege?sponsored=true&limit=12');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAuftraege(
          data.map((a: any) => ({
            ...a,
            lieferdatum: new Date(a.lieferdatum),
            abholdatum: new Date(a.abholDatum),
          }))
        );
      } catch {
        setAuftraege(sponsoredAuftraege);
      }
    };
    fetchAuftraege();
  }, []);

  // Lackanfragen‑State (dummy + API)
  const [lackanfragen, setLackanfragen] = useState<Lackanfrage[]>(
    artikelDatenLackanfragen
      .filter((a) => a.gesponsert)
      .slice(0, 12)
      .map((a) => ({ ...a, lieferdatum: new Date(a.lieferdatum) }))
  );
  useEffect(() => {
    const fetchLack = async () => {
      try {
        const res = await fetch('/api/lackanfragen?limit=12');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setLackanfragen(
          data.map((a: any) => ({ ...a, lieferdatum: new Date(a.lieferdatum) }))
        );
      } catch {
        /* keep dummy */
      }
    };
    fetchLack();
  }, []);

  // Shop‑Artikel (gesponsert)
  const [shopArtikel, setShopArtikel] = useState(
    artikelDatenShop
      .filter((a) => a.gesponsert)
      .slice(0, 12)
      .map((a) => ({ ...a, lieferdatum: new Date(a.lieferdatum) }))
  );
  useEffect(() => {
    const fetchShop = async () => {
      try {
        const res = await fetch('/api/artikel?gesponsert=true&limit=12');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setShopArtikel(
          data.map((a: any) => ({ ...a, lieferdatum: new Date(a.lieferdatum) }))
        );
      } catch {
        /* keep dummy */
      }
    };
    fetchShop();
  }, []);

  // Scroll‑Helper
  const handleScroll = (ref: React.RefObject<HTMLDivElement>, dir: number) => {
    if (ref.current) ref.current.scrollLeft += dir * 200;
  };

  return (
    <Suspense fallback={<div>Seite lädt...</div>}>
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>        
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', href: '/angebote', links: [{ href: '/angebote?first=Nasslackieren', text: 'Nasslackieren' },  { href: '/angebote?first=Pulverbeschichten', text: 'Pulverbeschichten' },  { href: '/angebote?first=Verzinken', text: 'Verzinken' },  { href: '/angebote?first=Eloxieren', text: 'Eloxieren' },  { href: '/angebote?first=Strahlen', text: 'Strahlen' },  { href: '/angebote?first=Entlacken', text: 'Entlacken' },  { href: '/angebote?first=Einlagern', text: 'Einlagern' },  { href: '/angebote?first=Isolierstegverpressen', text: 'Isolierstegverpressung' },  { href: '/angebote?first=Folieren', text: 'Folieren' },  { href: '/angebote', text: 'Kombiniert' }] },
            { title: 'Shop', href: '/kaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Lacke anfragen', href: '/sonderlacke', links: [{ href: '/sonderlacke?kategorie=nasslack', text: 'Nasslack' }, { href: '/sonderlacke?kategorie=pulverlack', text: 'Pulverlack' }] },
            { title: 'Auftragsbörse', href: '/auftragsboerse', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kombiniert' }] },
            { title: 'Verkaufen', href: '/verkaufen', links: [{ href: '/verkaufen?kategorie=nasslack', text: 'Nasslacke' }, { href: '/verkaufen?kategorie=pulverlack', text: 'Pulverlacke' }, { href: '/verkaufen?kategorie=arbeitsmittel', text: 'Arbeitsmittel' }] },
            { title: 'Lackanfragen-Börse', href: '/lackanfragen', links: [{ href: '/lackanfragen?kategorie=Nasslack', text: 'Nasslack' }, { href: '/lackanfragen?kategorie=Pulverlack', text: 'Pulverlack' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/wissenswertes', text: 'Vision und Mission' },{ href: '/wissenswertes#Sofunktioniert’s', text: 'So funktioniert’s' }, { href: '/wissenswertes#Beschichtungstechnik', text: 'Beschichtungstechnik' }, { href: '/wissenswertes#Verfahren', text: 'Verfahren' }, { href: '/wissenswertes#Nasslackieren', text: 'Nasslackieren' }, { href: '/wissenswertes#Pulverbeschichten', text: 'Pulverbeschichten' },  { href: '/wissenswertes#Eloxieren', text: 'Eloxieren/Anodisieren' }, { href: '/wissenswertes#Verzinken', text: 'Verzinken' }, { href: '/wissenswertes#Verzinnen', text: 'Verzinnen' }, { href: '/wissenswertes#Aluminieren', text: 'Aluminieren' }, { href: '/wissenswertes#Vernickeln', text: 'Vernickeln' }, { href: '/wissenswertes#Entlacken', text: 'Entlacken' },  { href: '/wissenswertes#Strahlen', text: 'Strahlen' }, { href: '/wissenswertes#Folieren', text: 'Folieren' }, { href: '/wissenswertes#Isolierstegverpressen', text: 'Isolierstegverpressen' }] },
            { title: 'Mein Konto', href: '/konto', links: [{ href: '/konto/angebote', text: 'Angebote' }, { href: '/konto/auftraege', text: 'Aufträge' },{ href: '/konto/bestellungen', text: 'Bestellungen' },{ href: '/konto/lackanfragen', text: 'Lackanfragen' }, { href: '/konto/verkaufen', text: 'Verkaufen' }, { href: '/konto/einstellungen', text: 'Kontoeinstellungen' }, { href: '/konto/nachrichten', text: 'Nachrichten' }] }
          ].map((item, index) => (
            <li key={index} className={styles.navItem}>
              <Link href={item.href} className={styles.navButton}>
                {item.title}
              </Link>
              <div className={styles.dropdown}>
                {item.links.map((link, linkIndex) => (
                  <Link key={linkIndex} href={link.href} className={styles.dropdownLink}>
                    {link.text}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>      
      </nav>
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
        <div className={styles.scrollContent} ref={scrollRefAuftraege}> 
          {auftraege.map((auftrag) => (
            <Link key={auftrag.id} href={`/auftragsboerse/${auftrag.id}`} className={styles.articleBox}>
              <img src={auftrag.bilder[0]} alt={auftrag.verfahren.map(v => v.name).join(' & ')} className={styles.articleImg} />
              <div className={styles.articleText}>
                <h3>{auftrag.verfahren.map(v => v.name).join(' & ') || 'Verfahren unbekannt'}</h3>
                <p><strong>Material:</strong> {auftrag.material}</p>
                <p><strong>Maße:</strong> {auftrag.length} x {auftrag.width} x {auftrag.height} mm</p>
                <p><strong>Masse:</strong> {auftrag.masse}</p>                
                <p><strong>Lieferdatum:</strong> {formatDate(auftrag.lieferdatum)}</p>
                <p><strong>Abholdatum:</strong> {formatDate(auftrag.abholdatum)}</p>
                <p><strong>Abholart:</strong> {auftrag.abholArt}</p>
                <p><MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{auftrag.standort}</p>
              </div>
            </Link>
          ))}
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
      {/* Lackbörse */}
      {/* ▶ Shop‑Block: erste 12 gesponserte Artikel */}
<section className={styles.sectionWrapper}>
  <div className={styles.articleLinkContainer}>
    <Link href="/kaufen" className={styles.articleLink}>
      Top Deals aus unserem <span className={styles.colored}>Shop</span>
    </Link>
  </div>
  <div className={styles.scrollContainer}>
    <div className={styles.scrollContent} ref={scrollRefShop}>
      {shopArtikel.map((art) => (
        <Link key={art.id} href={`/kaufen/artikel/${art.id}`} className={styles.articleBox}>
          <img src={art.bilder[0]} alt={art.titel} className={styles.articleImg} />
          <div className={styles.articleText}>
            <h3>{art.titel}</h3>
            <p><strong>Menge:</strong> {art.menge} kg</p>
            <p><strong>Lieferdatum:</strong> {formatDate(art.lieferdatum)}</p>
            <p><strong>Hersteller:</strong> {art.hersteller}</p>
            <p><strong>Zustand:</strong> {art.zustand}</p>
            <p><strong>Kategorie:</strong> {art.kategorie}</p>
            <p style={{ fontSize: '1rem', fontWeight: 500, color: 'gray' }}>  <strong>Preis ab:</strong> {art.preis.toFixed(2)} €</p>            
          </div>
        </Link>
      ))}
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
      {/* Lackanfragen-Börse */}
      <section className={styles.sectionWrapper}>
      <div className={styles.articleLinkContainer}>
        <Link href="/lackanfragen" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Lackanfragen-Börse</span>
        </Link>
      </div>
      <div className={styles.scrollContainer}>        
          <div className={styles.scrollContent} ref={scrollRefLackanfragen}> 
        {lackanfragen.map((anfrage) => (
          <Link
            key={anfrage.id}
            href={`/lackanfragen/artikel/${anfrage.id}`}
            className={styles.articleBox3}
          >
            <img
              src={anfrage.bilder?.[0] ?? '/images/placeholder.jpg'}
              alt="Lackanfrage-Bild"
              className={styles.articleImg}
            />
            <div className={styles.articleText}>
        <h3>{anfrage.titel}</h3>
        <p><strong>Menge:</strong> {anfrage.menge} kg</p>
        <p><strong>Lieferdatum:</strong> {formatDate(anfrage.lieferdatum)}</p>
        <p><strong>Hersteller:</strong> {anfrage.hersteller}</p>
        <p><strong>Zustand:</strong> {anfrage.zustand}</p>
        <p><strong>Kategorie:</strong> {anfrage.kategorie}</p>
        <p><MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{anfrage.ort}</p>
      </div>
    </Link>   
  ))}  
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
  );
}

