import Link from 'next/link';
import styles from '../styles/Home.module.css';
import Slideshow from "./slideshow/slideshow";  // Importiere die Slideshow-Komponente
 




const artikelGruppen = [
    {
      kategorie: "Bäume",
      artikel: [
        { bild: "/images/baum1.jpg", titel: "Eiche", beschreibung: "Eine robuste Eiche." },
        { bild: "/images/baum2.jpg", titel: "Ahorn", beschreibung: "Ein schöner Ahornbaum." },
        { bild: "/images/baum3.jpg", titel: "Kiefer", beschreibung: "Immergrüne Kiefer." },
        { bild: "/images/baum4.jpg", titel: "Birke", beschreibung: "Weiße Birkenrinde." },
        { bild: "/images/baum5.jpg", titel: "Weide", beschreibung: "Eine elegante Weide." },
        { bild: "/images/baum6.jpg", titel: "Linde", beschreibung: "Duftende Lindenblüten." },
        { bild: "/images/baum7.jpg", titel: "Tanne", beschreibung: "Perfekt für Weihnachten." },
      ],
    },
    {
      kategorie: "Sträucher",
      artikel: [
        { bild: "/images/strauch1.jpg", titel: "Rhododendron", beschreibung: "Blüht im Frühling." },
        { bild: "/images/strauch2.jpg", titel: "Flieder", beschreibung: "Duftender Flieder." },
        { bild: "/images/strauch3.jpg", titel: "Buchsbaum", beschreibung: "Immergrüner Strauch." },
        { bild: "/images/strauch4.jpg", titel: "Holunder", beschreibung: "Gesunde Beeren." },
        { bild: "/images/strauch5.jpg", titel: "Johannisbeere", beschreibung: "Leckere Früchte." },
        { bild: "/images/strauch6.jpg", titel: "Liguster", beschreibung: "Dichte Heckenpflanze." },
        { bild: "/images/strauch7.jpg", titel: "Hibiskus", beschreibung: "Tropisch anmutende Blüten." },
      ],
    },
    {
      kategorie: "Blumen",
      artikel: [
        { bild: "/images/blume1.jpg", titel: "Rose", beschreibung: "Symbol der Liebe." },
        { bild: "/images/blume2.jpg", titel: "Tulpe", beschreibung: "Frühlingsbote." },
        { bild: "/images/blume3.jpg", titel: "Sonnenblume", beschreibung: "Strahlend gelb." },
        { bild: "/images/blume4.jpg", titel: "Lilie", beschreibung: "Elegante Blüten." },
        { bild: "/images/blume5.jpg", titel: "Orchidee", beschreibung: "Exotische Schönheit." },
        { bild: "/images/blume6.jpg", titel: "Gänseblümchen", beschreibung: "Klein, aber fein." },
        { bild: "/images/blume7.jpg", titel: "Veilchen", beschreibung: "Zarte Blüten." },
      ],
    },
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
      {/* Bild unter dem Artikel Container */}
      <div className={styles.imageContainer}>
        <img src="/images/sonderlacke.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
      {/* Neuer Container mit dem Text "Unsere Artikel" */}
      <div className={styles.articleContainer}>
        <h2 className={styles.articleHeader}>
          <Link href="/artikelseite">
            Arbeitsmittelbörse
          </Link>
        </h2>
      </div>
      {/* Bild unter dem Artikel Container */}
      <div className={styles.imageContainer}>
        <img src="/images/arbeitsmittelbild3.jpg" alt="Artikelbild" className={styles.articleImage} />
      </div>
      
      
    
      
      
      
    </div>
  );
}
