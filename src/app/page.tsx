import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Page() {
  return (
    <div className={styles.wrapper}>
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          {[
            { title: 'Angebote einholen', href: '/angebote', links: [{ href: '/about/team', text: 'Lackieren' },  { href: '/about/vision', text: 'Pulverbeschichten' }] },
            { title: 'Kaufen', href: '/kaufen', links: [{ href: '/about/team', text: 'Unser Team' }, { href: '/about/vision', text: 'Unsere Vision' }, { href: '/about/vision', text: 'Unsere Vision' }, { href: '/about/vision', text: 'Unsere Vision' }, { href: '/about/vision', text: 'Unsere Vision' }] },
            { title: 'Lacke anfragen', href: '/sonderlacke', links: [{ href: '/services/webdesign', text: 'Webdesign' }, { href: '/services/seo', text: 'SEO' }] },
            { title: 'Auftragsbörse', href: '/auftragsboerse', links: [{ href: '/contact/email', text: 'E-Mail' }, { href: '/contact/phone', text: 'Telefon' }] },
            { title: 'Verkaufen', href: '/verkaufen', links: [{ href: '/portfolio/websites', text: 'Websites' }, { href: '/portfolio/apps', text: 'Apps' }] },
            { title: 'Offene Lackanfragen', href: '/lackanfragen', links: [{ href: '/blog/latest', text: 'Neueste Artikel' }, { href: '/blog/popular', text: 'Beliebteste Artikel' }] },
            { title: 'Wissenswertes', href: '/wissenswertes', links: [{ href: '/faq/shipping', text: 'Versand' }, { href: '/faq/payment', text: 'Zahlung' }] },
            { title: 'Mein Konto', href: '/konto', links: [{ href: '/support/help', text: 'Hilfe' }, { href: '/support/contact', text: 'Kontakt' }] }
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

      <div className={styles.content}>
        <h1>Willkommen auf der Seite!</h1>
        <p>Dies ist die Homepage mit einer Navbar und Dropdown-Menüs.</p>
      </div>
    </div>
  );
}
