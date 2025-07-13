import Link from 'next/link';
import styles from './navbar.module.css';

export default function Pager() {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            {
              title: 'Angebote einholen',
              href: '/angebote',
              links: [
                { href: '/angebote?first=Nasslackieren', text: 'Nasslackieren' },
                { href: '/angebote?first=Pulverbeschichten', text: 'Pulverbeschichten' },
                { href: '/angebote?first=Verzinken', text: 'Verzinken' },
                { href: '/angebote?first=Eloxieren', text: 'Eloxieren' },
                { href: '/angebote?first=Strahlen', text: 'Strahlen' },
                { href: '/angebote?first=Entlacken', text: 'Entlacken' },
                { href: '/angebote?first=Einlagern', text: 'Einlagern' },
                { href: '/angebote?first=Isolierstegverpressen', text: 'Isolierstegverpressung' },
                { href: '/angebote?first=Folieren', text: 'Folieren' },
                { href: '/angebote', text: 'Kombiniert' }
              ]
            },
            {
              title: 'Shop',
              href: '/kaufen',
              links: [
                { href: '/about/team', text: 'Nasslacke' },
                { href: '/about/vision', text: 'Pulverlacke' },
                { href: '/about/vision', text: 'Arbeitsmittel' }
              ]
            },
            {
              title: 'Lacke anfragen',
              href: '/sonderlacke',
              links: [
                { href: '/services/webdesign', text: 'Nasslack' },
                { href: '/services/seo', text: 'Pulverlack' }
              ]
            },
            {
              title: 'Auftragsbörse',
              href: '/auftragsboerse',
              links: [
                { href: '/about/team', text: 'Lackieren' },
                { href: '/about/vision', text: 'Pulverbeschichten' },
                { href: '/about/vision', text: 'Verzinken' },
                { href: '/about/vision', text: 'Eloxieren' },
                { href: '/about/vision', text: 'Strahlen' },
                { href: '/about/vision', text: 'Entlacken' },
                { href: '/about/vision', text: 'Einlagern' },
                { href: '/about/vision', text: 'Isolierstegverpressung' },
                { href: '/about/vision', text: 'Folieren' },
                { href: '/about/vision', text: 'Kombiniert' }
              ]
            },
            {
              title: 'Verkaufen',
              href: '/verkaufen',
              links: [
                { href: '/verkaufen?kategorie=Nasslack', text: 'Nasslacke' },
                { href: '/verkaufen?kategorie=Pulverlack', text: 'Pulverlacke' },
                { href: '/verkaufen?kategorie=Arbeitsmittel', text: 'Arbeitsmittel' }
              ]
            },
            {
              title: 'Lackanfragen-Börse',
              href: '/lackanfragen',
              links: [
                { href: '/lackanfragen?kategorie=Nasslack', text: 'Nasslack' },
                { href: '/lackanfragen?kategorie=Pulverlack', text: 'Pulverlack' }
              ]
            },
            {
              title: 'Wissenswertes',
              href: '/wissenswertes',
              links: [
                { href: '/wissenswertes', text: 'Vision und Mission' },
                { href: '/wissenswertes#UeberUns', text: 'Über Uns' },                
                { href: '/wissenswertes#Beschichtungstechnik', text: 'Beschichtungstechnik' },
                { href: '/wissenswertes#Verfahren', text: 'Verfahren' },                
                { href: '/wissenswertes#Nasslackieren', text: 'Nasslackieren' },
                { href: '/wissenswertes#Pulverbeschichten', text: 'Pulverbeschichten' },
                { href: '/wissenswertes#Eloxieren', text: 'Eloxieren/Anodisieren' },
                { href: '/wissenswertes#Verzinken', text: 'Verzinken' },
                { href: '/wissenswertes#Verzinnen', text: 'Verzinnen' },
                { href: '/wissenswertes#Aluminieren', text: 'Aluminieren' },
                { href: '/wissenswertes#Vernickeln', text: 'Vernickeln' },
                { href: '/wissenswertes#Entlacken', text: 'Entlacken' },                
                { href: '/wissenswertes#Strahlen', text: 'Strahlen' },
                { href: '/wissenswertes#Folieren', text: 'Folieren' },
                { href: '/wissenswertes#Isolierstegverpressen', text: 'Isolierstegverpressen' }
              ]
            },
            {
              title: 'Mein Konto',
              href: '/konto',
              links: [
                { href: '/konto/angebote', text: 'Angebote' },
                { href: '/konto/auftraege', text: 'Auftraege' },
                { href: '/konto/bestellungen', text: 'Bestellungen' },
                { href: '/konto/lackanfragen', text: 'Lackanfragen' },
                { href: '/konto/verkaufen', text: 'Verkaufen' },
                { href: '/konto/einstellungen', text: 'Kontoeinstellungen' },
                { href: '/konto/nachrichten', text: 'Nachrichten' }
              ]
            }
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
