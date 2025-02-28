"use client";

import React from "react";
import styles from "./wissenswertes.module.css";
import Image from "next/image";
import Link from "next/link"; // Für den Button zur Startseite

const Wissenswertes = () => {
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
      <div className={styles.container}>
      <h1>Über Uns</h1>
      
      <div className={styles.textContent}>
        
        <p>
          Wir sind die erste Plattform für reine Oberflächentechnik. Eine Plattform:</p>
          <p>Die es Kunden ermöglicht innerhalb kürzester Zeit ihren passenden Oberflächentechniker zu finden</p>
          <p>Die es Oberflächentechnikern ermöglicht ihren Absatz zu steigern</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p>          
          <p>Die es Oberflächentechnikern ermöglicht den passendsten Lieferanten für ihre Verbrauchsartikel zu finden</p>
          <p>Die es Kunden durch eigenständige Materialbeschaffung ermöglicht, bares Geld zu sparen</p><br></br>
          <p>Alles, was wir machen, machen wir mit dem Glauben, den Status Quo in der Oberflächentechnik herauszufordern.
          Wir glauben daran, dass wir anders denken. Wir machen das, indem wir auf Nachhaltigkeit, Nutzerfreundlichkeit und Wirtschaftlichkeit setzen.
          Wir freuen uns, besondere Lösungen anzubieten. Wollen Sie auch Teil davon sein?
        </p>
      </div>
      <h1>So funktionierts</h1>

      <div className={styles.imageGallery}>
        
        
        <div className={styles.imageContainer}>
          <Image
            src="/images/sofunktionierts.jpg" // Ersetze mit deinem Bildpfad
            alt="Bild 3"
            width={400}
            height={300}
            className={styles.image}
          />
        </div>
      </div>
      <h1>Die Oberflächentechnik</h1>
      <div className={styles.textContent}>
        
        <p>
        Oberflächentechnik ist ein Bereich der Materialwissenschaften, der sich mit der Veränderung und Verbesserung der Eigenschaften von Oberflächen befasst.
          Ziel ist es, die Funktionalität, Haltbarkeit, Ästhetik und andere spezifische Eigenschaften von Werkstoffen oder Bauteilen zu optimieren.
          
          Die Anwendungen der Oberflächentechnik reichen von der Verhinderung von Korrosion und Verschleiß bis hin zur Verbesserung von chemischen, elektrischen und 
            mechanischen Eigenschaften sowie der optischen Gestaltung. In der Oberflächentechnik wird die Oberfläche eines Materials behandelt, 
            ohne das gesamte Material zu verändern. Dies ermöglicht eine gezielte Anpassung an die Bedürfnisse des jeweiligen Einsatzes. Diese Verfahren sind 
            in vielen Industrien von großer Bedeutung, z. B. in der Automobilindustrie, Luft- und Raumfahrt, Maschinenbau, Medizintechnik und Elektronik.
            <br></br><br></br>Zu den wichtigsten Zielen der Oberflächentechnik zählen:</p>
            <p>
            • Schutz: Die Oberfläche wird so behandelt, dass sie gegenüber Umwelteinflüssen wie Korrosion, Abrieb, Kratzern oder UV-Strahlung widerstandsfähiger wird.</p>
            <p>• Funktionalität: Die Oberfläche wird mit spezifischen Eigenschaften ausgestattet, etwa durch Verbesserung der Haftung, Gleitfähigkeit, elektrischen Leitfähigkeit oder Wärmeleitfähigkeit.</p>
            <p>• Optik: Oberflächenbehandlungen wie Lackierungen oder Beschichtungen verändern das Aussehen des Materials, etwa durch Farbgebung, Glanz oder Textur.</p>
            <p>• Hygiene und Reinheit: Die Oberflächenbehandlung kann die Reinigung erleichtern und Schmutzanhaftungen reduzieren, was besonders in der Medizintechnik oder Lebensmittelindustrie wichtig ist.
            
        </p>
      </div>
      

      <div className={styles.backButton}>
        <Link href="/">
          <button className={styles.button}>Zurück zur Startseite</button>
        </Link>
      </div>
      </div>
    </div>
  );
};

export default Wissenswertes;
