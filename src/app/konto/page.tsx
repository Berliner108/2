import Link from 'next/link';
import styles from './konto.module.css';
import Pager from './navbar/pager';

export default function Page() {
  return (
    <>
          <Pager />
    <div className={styles.wrapper}>
      

      {/* Bereich für Mein Konto Kategorien */}
      <div className={styles.kontoContainer}>
        
        <div className={styles.kontoList}>
          {[
            { href: '/konto/angebote', text: 'Eingeholte Angebote' },
            { href: '/konto/kaeufe', text: 'Meine Käufe' },
            { href: '/konto/lackanfragen', text: 'Offene Lackanfragen' },
            { href: '/konto/auftraege', text: 'Meine Aufträge' },
            { href: '/konto/aktive-artikel', text: 'Aktive Artikel' },
            { href: '/konto/verkaufte-artikel', text: 'Verkaufte Artikel' },
            { href: '/konto/angebotene-artikel', text: 'Angebotene Artikel' },
            { href: '/konto/einstellungen', text: 'Kontoeinstellungen' }
          ].map((item, index) => (
            <Link key={index} href={item.href} className={styles.kontoItem}>
              {item.text}
            </Link>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
