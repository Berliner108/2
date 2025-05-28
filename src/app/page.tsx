import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Slideshow from "./slideshow/slideshow";  // Importiere die Slideshow-Komponente

 


const category1 = [
  { id: 1, title: "Pulverlackieren", desc: "RAL 9005 glatt matt Werkstoff: Aluminium", img: "/images/baum1.jpg" },
  { id: 2, title: "Eloxieren", desc: "E5", img: "/images/baum2.jpg" },
  { id: 3, title: "Pulverlackieren", desc: "RAL 6005 Moosgrün", img: "/images/baum3.jpg" },
  { id: 4, title: "Strahlen, Verzinken & Nasslackieren", desc: "Sandstrahlen, Feuerverzinken und RAL 9001", img: "/images/baum4.jpg" },
  { id: 5, title: "Entlacken & Nasslackieren", desc: "Nach Qualistrip und RAL 3003 glatt seidenglanz", img: "/images/baum5.jpg" },
  { id: 6, title: "Einlagern & Pulverlackieren", desc: "NCS S-8500 glatt glanz", img: "/images/baum6.jpg" }, 
];

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
    { id: 19, title: "IKEANr.4 GLATT Glanz", desc: "Pulverlack GSB und Qualicoat zertifiziert, 50 kg", img: "/images/strauch1.jpg" },
    { id: 20, title: "GS Premium Design Gamma Feinstruktur Matt", desc: "Profile werden anschließend zugeschnitten", img: "/images/strauch2.jpg" },
    { id: 21, title: "C31 Anodized Glatt Matt HWF Metallic", desc: "Nasslack, Hersteller Axalta, 21 kg", img: "/images/strauch3.jpg" },
    { id: 22, title: "Deore 619 Glatt Matt HWF Metallic", desc: "Pulverlack, Hersteller IGP, 33 kg", img: "/images/strauch4.jpg" },
    { id: 23, title: "CHAMPAGNE 611 Glatt Matt Metallic", desc: "Nasslack, 15 kg, neu & ungeöffnet, GSB Zertifizierung erforderlich", img: "/images/strauch5.jpg" },
    { id: 24, title: "GS Premium Design Gamma Feinstruktur Matt Hochwetterfest", desc: "Nasslack, 20 kg, GSB zertifizierung erforderlich", img: "/images/strauch6.jpg" },
    
    
  ];
export default function Page() {
  return (
    
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', href: '/angebote', links: [{ href: '/angebote?first=Nasslackieren', text: 'Nasslackieren' },  { href: '/angebote?first=Pulverbeschichten', text: 'Pulverbeschichten' },  { href: '/angebote?first=Verzinken', text: 'Verzinken' },  { href: '/angebote?first=Eloxieren', text: 'Eloxieren' },  { href: '/angebote?first=Strahlen', text: 'Strahlen' },  { href: '/angebote?first=Entlacken', text: 'Entlacken' },  { href: '/angebote?first=Einlagern', text: 'Einlagern' },  { href: '/angebote?first=Isolierstegverpressen', text: 'Isolierstegverpressung' },  { href: '/angebote?first=Folieren', text: 'Folieren' },  { href: '/angebote', text: 'Kombiniert' }] },
            { title: 'Kaufen', href: '/kaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Lacke anfragen', href: '/sonderlacke', links: [{ href: '/services/webdesign', text: 'Sonderfarbe Nasslack' }, { href: '/services/seo', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Auftragsbörse', href: '/auftragsboerse', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kombiniert' }] },
            { title: 'Verkaufen', href: '/verkaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Offene Lackanfragen', href: '/lackanfragen', links: [{ href: '/lackanfragen?kategorie=Nasslack', text: 'Sonderfarbe Nasslack' }, { href: '/lackanfragen?kategorie=Pulverlack', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/wissenswertes', text: 'Vision und Mission' },{ href: '/wissenswertes#UeberUns', text: 'Über Uns' }, { href: '/wissenswertes#Sofunktionierts', text: 'So funktionierts' }, { href: '/wissenswertes#Beschichtungstechnik', text: 'Beschichtungstechnik' }, { href: '/wissenswertes#Pulverbeschichten', text: 'Pulverbeschichten' }, { href: '/wissenswertes#Nasslackieren', text: 'Nasslackieren' }, { href: '/wissenswertes#Entlacken', text: 'Entlacken' },{ href: '/wissenswertes#Verzinken', text: 'Verzinken' }, { href: '/wissenswertes#Eloxieren', text: 'Eloxieren' }, { href: '/wissenswertes#Strahlen', text: 'Strahlen' }, { href: '/wissenswertes#Folieren', text: 'Folieren' }, { href: '/wissenswertes#Isolierstegverpressung', text: 'Isolierstegverpressung' }] },
            { title: 'Mein Konto', href: '/konto', links: [{ href: '/support/help', text: 'Eingeholte Angebote' }, { href: '/support/contact', text: 'Meine Aufträge' },{ href: '/support/help', text: 'Versendete Angebote' },{ href: '/support/contact', text: 'Meine Käufe' }, { href: '/support/contact', text: 'Offene Lackanfragen' }, { href: '/support/contact', text: 'Angebotene Lacke' },  { href: '/support/contact', text: 'Aktive Artikel' }, { href: '/support/contact', text: 'Verkaufte Artikel' },  { href: '/support/contact', text: 'Kontoeinstellungen' }, { href: '/support/contact', text: 'Nachrichten' }] }
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
      
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        <h2 className={styles.articleHeader}>
          <Link href="/auftragsboerse">
            Top Deals aus der Auftragsbörse
          </Link>
        </h2>
      </div>
      {/* Kategorie 2: Blumen */}
      <div className={styles.categorySection}>
        <div className={styles.articleContainer}>
          {category1.map((article) => (
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
        <img src="/images/snake79.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        <h2 className={styles.articleHeader}>
          <Link href="/kaufen">
            Top Deals aus der Lackbörse
          </Link>
        </h2>
      </div>
      {/* Kategorie 2: Blumen */}
      <div className={styles.categorySection}>
        <div className={styles.articleContainer}>
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
      </div>
      {/* Bild unter dem Artikel Container */}
      <div className={styles.imageContainer}>
        <img src="/images/arbeitsmittelbild3.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
      
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        <h2 className={styles.articleHeader}>
          <Link href="/artikelseite">
            Arbeitsmittelbörse
          </Link>
        </h2>
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
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        <h2 className={styles.articleHeader}>
          <Link href="/artikelseite">
            Offene Sonderlackanfragen
          </Link>
        </h2>
      </div>
      {/* Kategorie 2: Blumen */}
      <div className={styles.categorySection}>
        <div className={styles.articleContainer}>
          {category4.map((article) => (
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
    </div>
  );
}
