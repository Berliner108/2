import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Page() {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', links: [{ href: '/', text: 'Startseite' }] },
            { title: 'Kaufen', links: [{ href: '/about/team', text: 'Unser Team' }, { href: '/about/vision', text: 'Unsere Vision' }] },
            { title: 'Lacke anfragen', links: [{ href: '/services/webdesign', text: 'Webdesign' }, { href: '/services/seo', text: 'SEO' }] },
            { title: 'Auftragsbörse', links: [{ href: '/contact/email', text: 'E-Mail' }, { href: '/contact/phone', text: 'Telefon' }] },
            { title: 'Verkaufen', links: [{ href: '/portfolio/websites', text: 'Websites' }, { href: '/portfolio/apps', text: 'Apps' }] },
            { title: 'Offene Lackanfragen', links: [{ href: '/blog/latest', text: 'Neueste Artikel' }, { href: '/blog/popular', text: 'Beliebteste Artikel' }] },
            { title: 'Wissenswertes', links: [{ href: '/faq/shipping', text: 'Versand' }, { href: '/faq/payment', text: 'Zahlung' }] },
            { title: 'Mein Konto', links: [{ href: '/support/help', text: 'Hilfe' }, { href: '/support/contact', text: 'Kontakt' }] }
          ].map((item, index) => (
            <li key={index} className={styles.navItem}>
              <button className={styles.navButton}>{item.title}</button>
              <div className={styles.dropdown}>
                {item.links.map((link, linkIndex) => (
                  <Link key={linkIndex} href={link.href} className={styles.dropdownLink}>{link.text}</Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.content}>
        <h1>Willkommen auf der Seite!</h1>
        <p>Dies ist die Homepage mit einer Navbar und Dropdown-Menüs.</p>
      </div>
    </div>
  );
}
