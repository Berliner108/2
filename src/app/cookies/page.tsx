'use client';

import React from 'react';
import Link from 'next/link'; // Importiere Link
import styles from './cookies.module.css';


const CookiePage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Cookie Richtlinie</h1>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Informationen über unsere Verwendung von Cookies:</h2>
        <p>
        Unsere Website und Apps (unsere „Seite“) werden von Beschichter Scout betrieben, einem in Österreich registrierten Unternehmen mit Sitz in Kärntner Straße 1, 
        A-1010 Wien („Beschichter Scout“, „wir“, „uns“ oder „unser“). Die Seite verwendet Cookies, 
        um Sie von anderen Nutzern zu unterscheiden. Dies hilft uns, Ihnen eine bessere Erfahrung beim Besuch unserer Seite zu bieten und unsere Website zu verbessern.
        Wenn Sie Cookies, die von unserer Seite auf Ihrem Gerät gespeichert wurden, entfernen oder zukünftige Speicherung von Cookies durch unsere Seite verhindern 
        möchten, können Sie dies jederzeit tun (siehe unten für weitere Informationen).
        </p>
      </section>
      
      <section className={styles.section}>
        <h2 className={styles.subheading}>Was sind Cookies?</h2>
        <p>
        Ein Cookie ist eine kleine Datei mit Buchstaben und Zahlen, die – mit Ihrer Zustimmung – auf Ihrem Browser oder der Festplatte Ihres Computers gespeichert wird. Cookies enthalten Informationen, die auf die Festplatte Ihres Computers übertragen werden.

        Wir verwenden folgende Arten von Cookies:</p>
        <p><b>1. Unbedingt erforderliche Cookies</b></p>
        <p>
        Diese Cookies sind für den Betrieb unserer Seite erforderlich. Dazu gehören z. B. Cookies, die es Ihnen ermöglichen, sich in geschützte Bereiche unserer 
        Seite einzuloggen oder elektronische Rechnungsdienste zu nutzen. Wir benötigen für diese Cookies keine Zustimmung. Sie können diese Cookies möglicherweise 
        in Ihren Geräteeinstellungen oder im Browser blockieren, aber dadurch könnte unsere Seite nicht mehr ordnungsgemäß funktionieren.
        </p>
        <p><b>2. Nicht unbedingt erforderliche Cookies</b></p>
        <p><b>Analytische/Performance-Cookies</b></p>
        <p>Diese Cookies helfen uns, Besucher zu erkennen und zu zählen sowie deren Nutzung unserer Seite nachzuvollziehen. Dadurch können wir die Funktionalität der 
          Website verbessern, beispielsweise indem wir sicherstellen, dass Nutzer die gesuchten Informationen leicht finden. Zudem nutzen wir diese Cookies, um 
          Statistiken über Besucherzahlen, genutzte Technologien (z. B. Mac oder Windows), Verweildauer auf der Seite und betrachtete Seiten zu erfassen. Das hilft uns, 
          unsere Website kontinuierlich zu optimieren.
        </p>
        <p><b>Funktions-Cookies</b></p>
        <p>Diese Cookies erkennen Sie, wenn Sie auf unsere Seite zurückkehren. Dadurch können wir Inhalte für Sie personalisieren, Sie mit Ihrem Namen begrüßen und Ihre 
          Einstellungen (z. B. bevorzugte Sprache oder Region) speichern.
        </p>
        <p><b>Targeting-Cookies</b></p>
        <p>Diese Cookies speichern Informationen über Ihren Besuch auf unserer Seite, besuchte Seiten und angeklickte Links. Diese Daten nutzen wir (und Drittanbieter), 
          um Ihnen relevantere Inhalte und Werbung anzuzeigen. Wir können diese Informationen auch mit Dritten zu diesem Zweck teilen.
        </p>
        <p><b>Cookies sozialer Netzwerke</b></p>
        <p>Damit Sie Inhalte leicht „liken“ oder teilen können, haben wir auf unserer Seite Schaltflächen für soziale Netzwerke wie Facebook und Twitter integriert. 
          Diese Cookies werden von den jeweiligen sozialen Netzwerken gesetzt, darunter: Facebook, Twitter, LinkedIn, Xing, Youtube, Tiktok</p>
        <p>
         Die Datenschutzrichtlinien dieser sozialen Netzwerke bestimmen, welche Daten gesammelt und wie sie verwendet werden. Weitere Informationen hierzu finden Sie in den jeweiligen Datenschutz- und Cookie-Richtlinien der Anbieter.

         Bitte beachten Sie, dass auch Drittanbieter wie Werbenetzwerke oder Dienstleister für Web-Traffic-Analysen Cookies verwenden können, auf die wir keinen Einfluss haben. Diese sind meist analytische oder Targeting-Cookies.
        </p>
        
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Cookies blockieren oder entfernen</h2>
        <p>
        Sie können Cookies in Ihrem Browser blockieren oder löschen. Beachten Sie jedoch, dass das Deaktivieren aller Cookies (einschließlich essenzieller Cookies) 
        dazu führen kann, dass Sie nicht mehr auf bestimmte Teile unserer Seite zugreifen können.

        Unsere Seite nutzt auch Funktionen von Drittanbietern, z. B. eingebettete Videos von YouTube oder Vimeo. Wenn Sie alle Cookies deaktivieren, können solche 
        Funktionen möglicherweise nicht mehr genutzt werden.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Weitere Informationen</h2>
        <p>
          Falls Sie Fragen oder Anmerkungen zu unserer Cookie-Richtlinie oder deren Nutzung haben, können Sie unseren Datenschutzbeauftragten per E-Mail kontaktieren: 
          cookies@beschichterscout.at.
        </p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.subheading}>Änderungen an dieser Cookie-Richtlinie</h2>
        <p>
        Alle zukünftigen Änderungen an dieser Cookie-Richtlinie werden auf dieser Seite veröffentlicht. Zudem werden wir angemessene Maßnahmen ergreifen, um Sie über 
        Aktualisierungen zu informieren, etwa durch ein Update unseres Cookie-Banners oder Pop-ups.
        </p>
        <p>
         Diese Richtlinie wurde zuletzt überprüft und aktualisiert: März 2025.
        </p>
      </section>

      <div className={styles.buttonContainer}>
        <Link href="/">
          <button className={styles.backButton}>Zurück zur Startseite</button>
        </Link>
      </div>
    </div>
  );
};

export default CookiePage;

