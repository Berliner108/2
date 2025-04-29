import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Slideshow from "./slideshow/slideshow";  // Importiere die Slideshow-Komponente

 


const category1 = [
  { id: 1, title: "Pulverlackieren", desc: "RAL 9005 glatt matt Werkstoff: Aluminium", img: "/images/baum1.jpg" },
  { id: 2, title: "Eloxieren", desc: "Schöner Herbstbaum", img: "/images/baum2.jpg" },
  { id: 3, title: "Pulverlackieren", desc: "Weißer Stamm", img: "/images/baum3.jpg" },
  { id: 4, title: "Strahlen, Verzinken & Nasslackieren", desc: "Immergrün", img: "/images/baum4.jpg" },
  { id: 5, title: "Entlacken & Nasslackieren", desc: "Harziger Duft", img: "/images/baum5.jpg" },
  { id: 6, title: "Einlagern & Pulverlackieren", desc: "Mittelmeerbaum", img: "/images/baum6.jpg" }, 
];

const category2 = [
  { id: 11, title: "Rosenstrauch", desc: "Blühende Pracht", img: "/images/strauch1.jpg" },
  { id: 12, title: "Flieder", desc: "Duftend & lila", img: "/images/strauch2.jpg" },
  { id: 13, title: "Johannisbeerstrauch", desc: "Essbare Früchte", img: "/images/strauch3.jpg" },
  { id: 14, title: "Buchsbaum", desc: "Immergrün & dicht", img: "/images/strauch4.jpg" },
  { id: 15, title: "Rhododendron", desc: "Farbenfrohe Blüten", img: "/images/strauch5.jpg" },
  { id: 16, title: "Hortensie", desc: "Große Blütenbälle", img: "/images/strauch6.jpg" },
  { id: 17, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch7.jpg" },
  { id: 18, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch8.jpg" },
  { id: 19, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch9.jpg" },
  { id: 20, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch10.jpg" },
  { id: 21, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch10.jpg" },
  { id: 22, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch10.jpg" },
  
];

const category3 = [
  { id: 21, title: "Stretch Folie", desc: "Perforiert, 15 cm breit, 10 Meter, 12 Stück / Karton 32,99€", img: "/images/stretch.jpg" },
  { id: 22, title: "Sonnengelb", desc: "Nasslack, glatt matt", img: "/images/folie lang.jpg" },
  { id: 23, title: "Braunbeige", desc: "Pulverlack, glatt tiefmatt", img: "/images/atemschutz.jpg" },
  { id: 24, title: "Olivgrün", desc: "Pulverlack, glatt glanz", img: "/images/atemschutz1.jpg" },
  { id: 25, title: "Taxigelb", desc: "Nasslack, feinstruktur glanz", img: "/images/blume5.jpg" },
  { id: 26, title: "Cremegelb", desc: "Pulverlack, grobstruktur matt, anti grafitti", img: "/images/blume6.jpg" },
  { id: 27, title: "Gelbbeige", desc: "Pulverlack, glatt glanz", img: "/images/blume7.jpg" },
  { id: 28, title: "Feuerorange", desc: "Pulverlack, glatt glanz", img: "/images/blume8.jpg" },
  { id: 29, title: "Kunstgelb", desc: "Pulverlack, glatt glanz", img: "/images/blume9.jpg" },
  { id: 30, title: "Ziegelrot", desc: "Pulverlack, glatt glanz", img: "/images/blume10.jpg" },
  { id: 31, title: "Ziegelrot", desc: "Pulverlack, glatt glanz", img: "/images/blume10.jpg" },
  { id: 32, title: "Ziegelrot", desc: "Pulverlack, glatt glanz", img: "/images/blume10.jpg" },
  
  
];
  const category4 = [
    { id: 11, title: "Rosenstrauch", desc: "Blühende Pracht", img: "/images/strauch1.jpg" },
    { id: 12, title: "Flieder", desc: "Duftend & lila", img: "/images/strauch2.jpg" },
    { id: 13, title: "Johannisbeerstrauch", desc: "Essbare Früchte", img: "/images/strauch3.jpg" },
    { id: 14, title: "Buchsbaum", desc: "Immergrün & dicht", img: "/images/strauch4.jpg" },
    { id: 15, title: "Rhododendron", desc: "Farbenfrohe Blüten", img: "/images/strauch5.jpg" },
    { id: 16, title: "Hortensie", desc: "Große Blütenbälle", img: "/images/strauch6.jpg" },
    { id: 17, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch7.jpg" },
    { id: 18, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch8.jpg" },
    { id: 19, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch9.jpg" },
    { id: 20, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch10.jpg" },
    { id: 21, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch10.jpg" },
    { id: 22, title: "Liguster", desc: "Schnittverträglich", img: "/images/strauch10.jpg" },
    
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
            { title: 'Offene Lackanfragen', href: '/lackanfragen', links: [{ href: '/services/webdesign', text: 'Sonderfarbe Nasslack' }, { href: '/services/seo', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/wissenswertes', text: 'Vision und Mission' },{ href: '/wissenswertes#UeberUns', text: 'Über Uns' }, { href: '/wissenswertes#Sofunktionierts', text: 'So funktionierts' }, { href: '/wissenswertes#Beschichtungstechnik', text: 'Beschichtungstechnik' }, { href: '/wissenswertes#Pulverbeschichten', text: 'Pulverbeschichten' }, { href: '/wissenswertes#Nasslackieren', text: 'Nasslackieren' }, { href: '/wissenswertes#Entlacken', text: 'Entlacken' },{ href: '/wissenswertes#Verzinken', text: 'Verzinken' }, { href: '/wissenswertes#Eloxieren', text: 'Eloxieren' }, { href: '/wissenswertes#Strahlen', text: 'Strahlen' }, { href: '/wissenswertes#Folieren', text: 'Folieren' }, { href: '/wissenswertes#Isolierstegverpressung', text: 'Isolierstegverpressung' }] },
            { title: 'Mein Konto', href: '/konto', links: [{ href: '/support/help', text: 'Eingeholte Angebote' }, { href: '/support/contact', text: 'Meine Käufe' }, { href: '/support/contact', text: 'Offene Lackanfragen' }, { href: '/support/contact', text: 'Meine Aufträge' }, { href: '/support/contact', text: 'Aktive Artikel' }, { href: '/support/contact', text: 'Verkaufte Artikel' }, { href: '/support/contact', text: 'Angebotene Artikel' }, { href: '/support/contact', text: 'Kontoeinstellungen' }] }
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
          <Link href="/artikelseite">
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
          <Link href="/artikelseite">
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
