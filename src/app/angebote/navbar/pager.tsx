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
                { href: '/kaufen?kategorie=Nasslack', text: 'Nasslacke' },
                { href: '/kaufen?kategorie=Pulverlack', text: 'Pulverlacke' },
                { href: '/kaufen?kategorie=Arbeitsmittel', text: 'Arbeitsmittel' }
              ]
            },
            {
              title: 'Lacke anfragen',
              href: '/sonderlacke',
              links: [
                { href: '/sonderlacke?kategorie=nasslack', text: 'Nasslack' },
                { href: '/sonderlacke?kategorie=pulverlack', text: 'Pulverlack' }
              ]
            },
            {
                title: 'Auftragsbörse',
                href: '/auftragsboerse',
                links: [
                  { href: '/auftragsboerse?verfahren=Nasslackieren',          text: 'Nasslackieren' },
                  { href: '/auftragsboerse?verfahren=Pulverbeschichten',      text: 'Pulverbeschichten' },
                  { href: '/auftragsboerse?verfahren=Verzinken',              text: 'Verzinken' },
                  { href: '/auftragsboerse?verfahren=Eloxieren',              text: 'Eloxieren' },
                  { href: '/auftragsboerse?verfahren=Strahlen',               text: 'Strahlen' },
                  { href: '/auftragsboerse?verfahren=Entlacken',              text: 'Entlacken' },
                  { href: '/auftragsboerse?verfahren=Einlagern',              text: 'Einlagern' },
                  { href: '/auftragsboerse?verfahren=Isolierstegverpressung', text: 'Isolierstegverpressung' },
                  { href: '/auftragsboerse?verfahren=Folieren',               text: 'Folieren' },
                  { href: '/auftragsboerse',                                  text: 'Alle' }
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
                { href: '/wissenswertes#Sofunktioniert’s', text: 'So funktioniert’s' },        
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
                { href: '/konto/auftraege', text: 'Aufträge' },
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
