'use client'

import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Slideshow from "./slideshow/slideshow";  // Importiere die Slideshow-Komponente
import CookieBanner from "./components/CookieBanner"; // ✅ korrekt
import { dummyAuftraege } from './auftragsboerse/dummyAuftraege';
import { useRef } from 'react';  // Importiere useRef
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';



const gesponserteAuftraege = dummyAuftraege.filter(auftrag => auftrag.isSponsored).slice(0, 12);

const handleScroll = (direction: number) => {
  const scrollContainer = document.querySelector(`.${styles.scrollContent}`) as HTMLElement;
  const scrollAmount = 200; // Scroll-Menge (passe dies nach Bedarf an)
  scrollContainer.scrollLeft += direction * scrollAmount;
};



const category2 = [
  { id: 7, title: "RAL 5020 Glatt Matt", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch1.jpg" },
  { id: 8, title: "RAL 6012 Glatt Matt", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch2.jpg" },
  { id: 9, title: "NCS S 3050-B20G Glatt Seidenmatt ", desc: "Pulverlack GSB zertifiziert", img: "/images/strauch3.jpg" },
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
  const category4 = [
    { id: 1, title: "IKEANr.4 GLATT Glanz", desc: "Pulverlack GSB und Qualicoat zertifiziert, 50 kg", img: "/images/strauch1.jpg" },
    { id: 2, title: "GS Premium Design Gamma Feinstruktur Matt", desc: "Profile werden anschließend zugeschnitten", img: "/images/strauch2.jpg" },
    { id: 3, title: "C31 Anodized Glatt Matt HWF Metallic", desc: "Nasslack, Hersteller Axalta, 21 kg", img: "/images/strauch3.jpg" },
    { id: 4, title: "Deore 619 Glatt Matt HWF Metallic", desc: "Pulverlack, Hersteller IGP, 33 kg", img: "/images/strauch4.jpg" },
    { id: 5, title: "CHAMPAGNE 611 Glatt Matt Metallic", desc: "Nasslack, 15 kg, neu & ungeöffnet, GSB Zertifizierung erforderlich", img: "/images/strauch5.jpg" },
    { id: 6, title: "GS Premium Design Gamma Feinstruktur Matt Hochwetterfest", desc: "Nasslack, 20 kg, GSB zertifizierung erforderlich", img: "/images/strauch6.jpg" },
    
    
  ];
export default function Page() {
  
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
      <div className={styles.articleLinkContainer}>
        <Link href="/auftragsboerse" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Auftragsbörse</span>
        </Link>
      </div>

      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        
      </div>
      {/* Kategorie 2 mit scrollbarem Container */}
      <div className={styles.scrollContainer}>
        
        <div className={styles.scrollContent}>
          {gesponserteAuftraege.map((auftrag) => (
            <Link key={auftrag.id} href={`/auftragsboerse/${auftrag.id}`} className={styles.articleBox}>
              <img src={auftrag.bilder[0]} alt={auftrag.verfahren.join(' & ')} className={styles.articleImg} />
              <div className={styles.articleText}>
                <h3>{auftrag.verfahren.length > 0 ? auftrag.verfahren.join(' & ') : 'Verfahren unbekannt'}</h3>
                <p><strong>Material:</strong> {auftrag.material}</p>
                <p><strong>Maße:</strong> {auftrag.length} x {auftrag.width} x {auftrag.height} mm</p>
                <p><strong>Masse:</strong> {auftrag.masse}</p>
                <p><strong>Standort:</strong> {auftrag.standort}</p>
                <p><strong>Lieferdatum:</strong> {new Date(auftrag.lieferDatum).toLocaleDateString('de-AT')}</p>
                <p><strong>Abholdatum:</strong> {new Date(auftrag.abholDatum).toLocaleDateString('de-AT')}</p>
                <p><strong>Abholart:</strong> {auftrag.abholArt}</p>
                <p><strong>Auftraggeber:</strong> {auftrag.benutzername}</p>
                <p><strong>Bewertung:</strong> ⭐ {auftrag.bewertung}</p>
              </div>
            </Link>
          ))}
        </div>
        {/* Pfeil nach rechts - ChevronRightIcon */}
        <button className={styles.arrowLeft} onClick={() => handleScroll(-1)}>
  <ChevronLeftIcon className="h-6 w-6 text-black" />
</button>
<button className={styles.arrowRight} onClick={() => handleScroll(1)}>
  <ChevronRightIcon className="h-6 w-6 text-black" />
</button>
</div>

      {/* Bild unter dem Artikel Container */}
      <div className={styles.imageContainer}>
        <img src="/images/snake79.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
       <div className={styles.articleLinkContainer}>
        <Link href="/kaufen" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Lackbörse</span>
        </Link>
      </div>
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        
      </div>
      {/* Kategorie 2: Blumen */}
      <div className={styles.categorySection}>
    
  </div>
      {/* Bild unter dem Artikel Container */}
      <div className={styles.imageContainer}>
        <img src="/images/arbeitsmittelbild3.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
       <div className={styles.articleLinkContainer}>
        <Link href="/kaufen" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Arbeitsmittelbörse</span>
        </Link>
      </div>
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        
      </div>
      {/* Kategorie 2: Blumen */}
      {/* Kategorie 2: Blumen */}
      <div className={styles.categorySection}>
        <div className={styles.articleContainer}>
          {category3.map((article) => (
            <Link key={article.id} href={`/artikel/${article.id}`} className={styles.articleBox}>
              <img src={article.img} alt={article.title} className={styles.articleImg} />
              <div className={styles.articleText}>
                <h3>{article.title}</h3>
                <p>{article.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      {/* Bild unter dem Artikel Container */}
      <div className={styles.imageContainer}>
        <img src="/images/sonderlacke.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
       <div className={styles.articleLinkContainer}>
        <Link href="/lackanfragen" className={styles.articleLink}>
          Top Deals aus der <span className={styles.colored}>Lackanfragen-Börse</span>
        </Link>
      </div>
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        
      </div>
      {/* Kategorie 2: Blumen */}
      <div className={styles.categorySection}>
        <div className={styles.articleContainer}>
          {category4.map((article) => (
            <Link key={article.id} href={`lackanfragen/artikel/${article.id}`} className={styles.articleBox}>
              <img src={article.img} alt={article.title} className={styles.articleImg} />
              <div className={styles.articleText}>
                <h3>{article.title}</h3>
                <p>{article.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <CookieBanner /> {/* Cookie-Banner außerhalb vom Layout-Wrapper */}
    </div>
    
  );
}
