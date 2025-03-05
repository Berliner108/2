import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Slideshow from "./slideshow/slideshow";  // Importiere die Slideshow-Komponente
 
const category1 = [
  { id: 1, title: "Eiche", desc: "Robuster Baum", img: "/images/baum1.jpg" },
  { id: 2, title: "Ahorn", desc: "Schöner Herbstbaum", img: "/images/baum2.jpg" },
  { id: 3, title: "Birke", desc: "Weißer Stamm", img: "/images/baum3.jpg" },
  { id: 4, title: "Tanne", desc: "Immergrün", img: "/images/baum4.jpg" },
  { id: 5, title: "Kiefer", desc: "Harziger Duft", img: "/images/baum5.jpg" },
  { id: 6, title: "Olivenbaum", desc: "Mittelmeerbaum", img: "/images/baum6.jpg" },
  { id: 7, title: "Zeder", desc: "Majestätischer Baum", img: "/images/baum7.jpg" },
  { id: 8, title: "Zeder", desc: "Majestätischer Baum", img: "/images/baum8.jpg" },
  { id: 9, title: "Zeder", desc: "Majestätischer Baum", img: "/images/baum9.jpg" },
  { id: 10, title: "Zeder", desc: "Majestätischer Baum", img: "/images/baum10.jpg" },
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
];

const category3 = [
  { id: 21, title: "Golden Eye", desc: "Pulverlack, glatt tiefmatt, 10kg, Zustellung", img: "/images/blume1.jpg" },
  { id: 22, title: "Sonnengelb", desc: "Nasslack, glatt matt", img: "/images/blume2.jpg" },
  { id: 23, title: "Braunbeige", desc: "Pulverlack, glatt tiefmatt", img: "/images/blume3.jpg" },
  { id: 24, title: "Olivgrün", desc: "Pulverlack, glatt glanz", img: "/images/blume4.jpg" },
  { id: 25, title: "Taxigelb", desc: "Nasslack, feinstruktur glanz", img: "/images/blume5.jpg" },
  { id: 26, title: "Cremegelb", desc: "Pulverlack, grobstruktur matt, anti grafitti", img: "/images/blume6.jpg" },
  { id: 27, title: "Gelbbeige", desc: "Pulverlack, glatt glanz", img: "/images/blume7.jpg" },
  { id: 28, title: "Feuerorange", desc: "Pulverlack, glatt glanz", img: "/images/blume8.jpg" },
  { id: 29, title: "Kunstgelb", desc: "Pulverlack, glatt glanz", img: "/images/blume9.jpg" },
  { id: 30, title: "Ziegelrot", desc: "Pulverlack, glatt glanz", img: "/images/blume10.jpg" },
  
];






export default function Page() {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', href: '/angebote', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kombiniert' }] },
            { title: 'Kaufen', href: '/kaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Lacke anfragen', href: '/sonderlacke', links: [{ href: '/services/webdesign', text: 'Sonderfarbe Nasslack' }, { href: '/services/seo', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Auftragsbörse', href: '/auftragsboerse', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' },  { href: '/about/vision', text: 'Kombiniert' }] },
            { title: 'Verkaufen', href: '/verkaufen', links: [{ href: '/about/team', text: 'Nasslacke' }, { href: '/about/vision', text: 'Pulverlacke' }, { href: '/about/vision', text: 'Arbeitsmittel' }] },
            { title: 'Offene Lackanfragen', href: '/lackanfragen', links: [{ href: '/services/webdesign', text: 'Sonderfarbe Nasslack' }, { href: '/services/seo', text: 'Sonderfarbe Pulverlack' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/about/vision', text: 'Die Vision' },{ href: '/about/vision', text: 'Oberlächentechnik' }, { href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' },  { href: '/about/vision', text: 'Verzinken' },  { href: '/about/vision', text: 'Eloxieren' },  { href: '/about/vision', text: 'Strahlen' },  { href: '/about/vision', text: 'Entlacken' },  { href: '/about/vision', text: 'Einlagern' },  { href: '/about/vision', text: 'Isolierstegverpressung' },  { href: '/about/vision', text: 'Folieren' }] },
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
      {/* Kategorie 1: Blumen */}
      <div className={styles.categorySection}>
        
        <div className={styles.articleContainer}>
          {category1.map((article) => (
            <div key={article.id} className={styles.articleBox}>
              <Link href={`/artikel/${article.id}`}>
                <img src={article.img} alt={article.title} className={styles.articleImg} />
                <div className={styles.articleText}>
                  <h3>{article.title}</h3>
                  <p>{article.desc}</p>
                </div>
              </Link>
            </div>
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
            <div key={article.id} className={styles.articleBox}>
              <Link href={`/artikel/${article.id}`}>
                <img src={article.img} alt={article.title} className={styles.articleImg} />
                <div className={styles.articleText}>
                  <h3>{article.title}</h3>
                  <p>{article.desc}</p>
                </div>
              </Link>
            </div>
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
      <div className={styles.categorySection}>
        
        <div className={styles.articleContainer}>
          {category2.map((article) => (
            <div key={article.id} className={styles.articleBox}>
              <Link href={`/artikel/${article.id}`}>
                <img src={article.img} alt={article.title} className={styles.articleImg} />
                <div className={styles.articleText}>
                  <h3>{article.title}</h3>
                  <p>{article.desc}</p>
                </div>
              </Link>
            </div>
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
      {/* Kategorie 3: Blumen */}
      <div className={styles.categorySection}>
        
        <div className={styles.articleContainer}>
          {category3.map((article) => (
            <div key={article.id} className={styles.articleBox}>
              <Link href={`/artikel/${article.id}`}>
                <img src={article.img} alt={article.title} className={styles.articleImg} />
                <div className={styles.articleText}>
                  <h3>{article.title}</h3>
                  <p>{article.desc}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>     
    </div>
  );
}
