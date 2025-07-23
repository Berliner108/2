'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import Slideshow from './slideshow/slideshow';
import CookieBanner from './components/CookieBanner';
import { dummyAuftraege } from './auftragsboerse/dummyAuftraege';
import styles from '../styles/Home.module.css';
import { artikelDaten as artikelDatenLackanfragen } from '@/data/ArtikelDatenLackanfragen';
import { MapPin } from 'lucide-react';


type Auftrag = {
  id: string | number;
  bilder: string[];
  verfahren: string[];
  material: string;
  length: number;
  width: number;
  height: number;
  masse: string;
  standort: string;
  lieferDatum: Date;
  abholDatum: Date;
  abholArt: string;
  lieferArt: string;
  isSponsored?: boolean; // ← das fehlt!
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

const formatDate = (date: Date) => {
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('de-AT');
};


const category2 = [
  { id: 7, title: "RAL 5020 Glatt Matt", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch1.jpg" },
  { id: 8, title: "RAL 6012 Glatt Matt", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch2.jpg" },
  { id: 9, title: "NCS S 3050-B20G Glatt Seidenmatt", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch3.jpg" },
  { id: 10, title: "Sikkens C4.55.30 Feinstruktur Seidenmatt", desc: "Pulverlack GSB und Qualicoat zertifiziert", img: "/images/strauch4.jpg" },
  { id: 11, title: "DB702 Glatt Seidenglanz Metallic", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch5.jpg" },
  { id: 12, title: "Eloxal E6/C35 Orange", desc: "Pulverlack Qualicoat zertifiziert", img: "/images/strauch6.jpg" },
];

const category3 = [
  { id: 13, title: "Stretch Folie", desc: "Perforiert, 15 cm breit, 10 Meter, 12 Stück / Karton 32,99€", img: "/images/stretch.jpg" },
  { id: 14, title: "Stretchfolie breit Industrieanwendung", desc: "Perforiert", img: "/images/folie lang.jpg" },
  { id: 15, title: "3 M Schutzmaske FFP3", desc: "Für Lackierer und Pulverbeschichter", img: "/images/atemschutz.jpg" },
  { id: 16, title: "Atemschutzmaske mit Filter", desc: "Pulverlack, glatt glanz", img: "/images/atemschutz1.jpg" },
  { id: 17, title: "Arbeitshandschuhe", desc: "Langlebig und passgenau", img: "/images/blume5.jpg" },
  { id: 18, title: "Stahlhaken", desc: "Pulverlack, grobstruktur matt, anti grafitti", img: "/images/blume18.png" },
];

const sponsoredAuftraege: Auftrag[] = dummyAuftraege
  .filter((a) => a.isSponsored)
  .slice(0, 12)
  .map((a) => ({
    ...a,
    lieferDatum: new Date(a.lieferDatum),
    abholDatum: new Date(a.abholDatum),
  }));

export default function Page() {
  const scrollRefAuftraege = useRef<HTMLDivElement>(null);
const scrollRefLack = useRef<HTMLDivElement>(null);
const scrollRefLackanfragen = useRef<HTMLDivElement>(null);

  const [auftraege, setAuftraege] = useState<Auftrag[]>(sponsoredAuftraege);

  




  const handleScroll = (ref: React.RefObject<HTMLDivElement>, direction: number) => {
  if (ref.current) {
    ref.current.scrollLeft += direction * 200;
  }
};


  useEffect(() => {
  const fetchAuftraege = async () => {
    try {
      const res = await fetch('/api/auftraege?sponsored=true&limit=12');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setAuftraege(
        data.map((a: any) => ({
          ...a,
          lieferDatum: new Date(a.lieferDatum),
          abholDatum: new Date(a.abholDatum),
        }))
      );
    } catch {
      // Dummy nur im Fehlerfall
      setAuftraege(sponsoredAuftraege);
    }
  };
  fetchAuftraege();
}, []);

  const [lackanfragen, setLackanfragen] = useState<Lackanfrage[]>(
  artikelDatenLackanfragen
    .filter((a) => a.gesponsert)
    .slice(0, 12)
    .map((a) => ({
      ...a,
      lieferdatum: new Date(a.lieferdatum),
    }))
);


useEffect(() => {
  const fetchLackanfragen = async () => {
    try {
      const res = await fetch('/api/lackanfragen?limit=12');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setLackanfragen(
        data.map((a: any) => ({
          ...a,
          lieferdatum: new Date(a.lieferdatum),
        }))
      );
    } catch {
      // Dummy bleibt
    }
  };
  fetchLackanfragen();
}, []);



  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', href: '/angebote', links: [{ href: '/angebote?first=Nasslackieren', text: 'Nasslackieren' },  { href: '/angebote?first=Pulverbeschichten', text: 'Pulverbeschichten' },  { href: '/angebote?first=Verzinken', text: 'Verzinken' },  { href: '/angebote?first=Eloxieren', text: 'Eloxieren' },  { href: '/angebote?first=Strahlen', text: 'Strahlen' },  { href: '/angebote?first=Entlacken', text: 'Entlacken' },  { href: '/angebote?first=Einlagern', text: 'Einlagern' },  { href: '/angebote?first=Isolierstegverpressen', text: 'Isolierstegverpressung' },  { href: '/angebote?first=Folieren', text: 'Folieren' },  { href: '/angebote', text: 'Kombiniert' }] },
            { title: 'Shop', href: '/kaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Lacke anfragen', href: '/sonderlacke', links: [{ href: '/services/webdesign', text: 'Nasslack' }, { href: '/services/seo', text: 'Pulverlack' }] },
            { title: 'Auftragsbörse', href: '/auftragsboerse', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kombiniert' }] },
            { title: 'Verkaufen', href: '/verkaufen', links: [{ href: '/verkaufen?kategorie=Nasslack', text: 'Nasslacke' }, { href: '/verkaufen?kategorie=Pulverlack', text: 'Pulverlacke' }, { href: '/verkaufen?kategorie=Arbeitsmittel', text: 'Arbeitsmittel' }] },
            { title: 'Lackanfragen-Börse', href: '/lackanfragen', links: [{ href: '/lackanfragen?kategorie=Nasslack', text: 'Nasslack' }, { href: '/lackanfragen?kategorie=Pulverlack', text: 'Pulverlack' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/wissenswertes', text: 'Vision und Mission' },{ href: '/wissenswertes#Sofunktioniert’s', text: 'So funktioniert’s' }, { href: '/wissenswertes#Beschichtungstechnik', text: 'Beschichtungstechnik' }, { href: '/wissenswertes#Verfahren', text: 'Verfahren' }, { href: '/wissenswertes#Nasslackieren', text: 'Nasslackieren' }, { href: '/wissenswertes#Pulverbeschichten', text: 'Pulverbeschichten' },  { href: '/wissenswertes#Eloxieren', text: 'Eloxieren/Anodisieren' }, { href: '/wissenswertes#Verzinken', text: 'Verzinken' }, { href: '/wissenswertes#Verzinnen', text: 'Verzinnen' }, { href: '/wissenswertes#Aluminieren', text: 'Aluminieren' }, { href: '/wissenswertes#Vernickeln', text: 'Vernickeln' }, { href: '/wissenswertes#Entlacken', text: 'Entlacken' },  { href: '/wissenswertes#Strahlen', text: 'Strahlen' }, { href: '/wissenswertes#Folieren', text: 'Folieren' }, { href: '/wissenswertes#Isolierstegverpressen', text: 'Isolierstegverpressen' }] },
            { title: 'Mein Konto', href: '/konto', links: [{ href: '/konto/angebote', text: 'Angebote' }, { href: '/konto/auftraege', text: 'Meine Aufträge' },{ href: '/konto/bestellungen', text: 'Bestellungen' },{ href: '/konto/lackanfragen', text: 'Lackanfragen' }, { href: '/konto/verkaufen', text: 'Verkaufen' }, { href: '/konto/einstellungen', text: 'Kontoeinstellungen' }, { href: '/konto/nachrichten', text: 'Nachrichten' }] }
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
      <Slideshow />

      {/* Auftragsbörse */}
      <div className={styles.articleLinkContainer}>
        <Link href="/auftragsboerse" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Auftragsbörse</span>
        </Link>
      </div>
      <div className={styles.scrollContainer}>
        <div className={styles.scrollContent} ref={scrollRefAuftraege}> 
          {auftraege.map((auftrag) => (
            <Link key={auftrag.id} href={`/auftragsboerse/${auftrag.id}`} className={styles.articleBox}>
              <img src={auftrag.bilder[0]} alt={auftrag.verfahren.join(' & ')} className={styles.articleImg} />
              <div className={styles.articleText}>
                <h3>{auftrag.verfahren.join(' & ') || 'Verfahren unbekannt'}</h3>
                <p><strong>Material:</strong> {auftrag.material}</p>
                <p><strong>Maße:</strong> {auftrag.length} x {auftrag.width} x {auftrag.height} mm</p>
                <p><strong>Masse:</strong> {auftrag.masse}</p>                
                <p><strong>Lieferdatum:</strong> {formatDate(auftrag.lieferDatum)}</p>
                <p><strong>Abholdatum:</strong> {formatDate(auftrag.abholDatum)}</p>
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
      
      {/* Lackbörse */}
      <div className={styles.articleLinkContainer}>
        <Link href="/kaufen" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Lack- und Arbeitsmittelbörse</span>
        </Link>
      </div>
      <div className={styles.scrollContainer}>        
          <div className={styles.scrollContent} ref={scrollRefLack}> 
        {category2.map((article) => (
          <Link key={article.id} href={`/artikel/${article.id}`} className={styles.articleBox}>
            <img src={article.img} alt={article.title} className={styles.articleImg} />
            <div className={styles.articleText}>
              <h3>{article.title}</h3>
              <p>{article.desc}</p>
            </div>
          </Link>
        ))}
      </div>
        <button className={styles.arrowLeft} onClick={() => handleScroll(scrollRefLack, -1)}>
          <ChevronLeftIcon className="h-6 w-6 text-black" />
        </button>
        <button className={styles.arrowRight} onClick={() => handleScroll(scrollRefLack, 1)}>
          <ChevronRightIcon className="h-6 w-6 text-black" />
        </button>
      </div>

      
      
      
      <div className={styles.imageContainer}>
        <img src="/images/sonderlacke.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>

      {/* Lackanfragen-Börse */}
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
            className={styles.articleBox}
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




      <CookieBanner />
    </div>
  );
}

