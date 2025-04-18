import Link from 'next/link';
import styles from './navbar.module.css'; 

export default function Pager() {
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
    </div>
    
  );
}
