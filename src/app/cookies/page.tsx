'use client';

import React from 'react';
import Link from 'next/link';
import styles from './cookies.module.css';

const CookiePage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Cookie-Richtlinie</h1>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Informationen über unsere Verwendung von Cookies</h2>
        <p>
          
            Diese Website und die dazugehörigen Anwendungen (unsere „Seite“) werden unter
            der Bezeichnung Beschichter Scout angeboten. Betreiber ist Martin Zajac,
            Einzelunternehmer, Riedergasse 2, A-6900 Bregenz, Österreich
            („Beschichter Scout“, „wir“, „uns“ oder „unser“). Die Seite verwendet Cookies
            und ähnliche Technologien, um bestimmte Funktionen bereitzustellen, die Nutzung
            der Seite zu ermöglichen und die Benutzerfreundlichkeit zu verbessern.
          
        </p>
        <p>
          Cookies helfen uns beispielsweise dabei, Nutzer wiederzuerkennen,
          Sitzungen aufrechtzuerhalten, Sicherheitseinstellungen zu speichern und
          die Nutzung unserer Seite besser zu verstehen. Wenn Sie Cookies, die
          von unserer Seite auf Ihrem Gerät gespeichert wurden, entfernen oder
          die zukünftige Speicherung verhindern möchten, können Sie dies
          jederzeit über Ihre Browser-Einstellungen tun.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Was sind Cookies?</h2>
        <p>
          Ein Cookie ist eine kleine Textdatei, die auf Ihrem Gerät gespeichert
          wird, wenn Sie eine Website besuchen. Cookies enthalten Informationen,
          die dazu dienen können, Ihren Browser bei einem späteren Besuch wieder
          zu erkennen oder bestimmte Funktionen der Website zu ermöglichen.
        </p>

        <p><b>1. Unbedingt erforderliche Cookies</b></p>
        <p>
          Diese Cookies sind für den Betrieb unserer Seite erforderlich. Dazu
          gehören insbesondere Cookies, die für Login-Funktionen, Sicherheit,
          Sitzungsverwaltung, Warenkorb- oder Zahlungsfunktionen sowie für
          grundlegende technische Abläufe notwendig sind. Für diese Cookies ist
          keine gesonderte Einwilligung erforderlich. Sie können diese Cookies
          zwar in Ihrem Browser blockieren, jedoch kann die Seite dann
          möglicherweise nicht mehr ordnungsgemäß funktionieren.
        </p>

        <p><b>2. Nicht unbedingt erforderliche Cookies</b></p>

        <p><b>Analyse-/Performance-Cookies</b></p>
        <p>
          Diese Cookies helfen uns zu verstehen, wie Besucher unsere Seite
          nutzen. Dadurch können wir beispielsweise erkennen, welche Seiten
          besonders häufig besucht werden, wo technische Probleme auftreten oder
          wie wir die Benutzerführung verbessern können. Solche Cookies werden
          nur eingesetzt, wenn Sie zuvor eingewilligt haben.
        </p>

        <p><b>Funktions-Cookies</b></p>
        <p>
          Diese Cookies ermöglichen zusätzliche Funktionen und Komfortmerkmale,
          etwa das Speichern von Einstellungen wie Sprache, Region oder
          bevorzugten Anzeigeoptionen. Auch diese Cookies werden nur gesetzt,
          soweit dies erforderlich ist oder Sie eingewilligt haben.
        </p>

        <p><b>Marketing- und Targeting-Cookies</b></p>
        <p>
          Diese Cookies können verwendet werden, um Ihnen relevantere Inhalte
          oder Werbung anzuzeigen und die Wirksamkeit von Werbemaßnahmen zu
          messen. Solche Cookies werden nur eingesetzt, wenn Sie zuvor
          eingewilligt haben.
        </p>

        <p><b>Cookies von Drittanbietern</b></p>
        <p>
          Auf unserer Seite können Dienste von Drittanbietern eingebunden sein,
          zum Beispiel Zahlungsanbieter, Analyse-Dienste, Karten, Videos oder
          soziale Netzwerke. Dabei können Drittanbieter eigene Cookies setzen
          oder ähnliche Technologien verwenden. Auf diese Cookies haben wir
          teilweise keinen direkten Einfluss. Es gelten zusätzlich die
          Datenschutz- und Cookie-Richtlinien der jeweiligen Anbieter.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Cookies blockieren oder entfernen</h2>
        <p>
          Sie können Cookies über die Einstellungen Ihres Browsers blockieren
          oder löschen. Beachten Sie jedoch, dass das Deaktivieren aller Cookies,
          insbesondere essenzieller Cookies, dazu führen kann, dass bestimmte
          Funktionen der Seite nicht oder nur eingeschränkt nutzbar sind.
        </p>
        <p>
          Zusätzlich können Sie Ihre Cookie-Einstellungen, sofern ein
          Cookie-Banner oder Cookie-Einstellungsbereich bereitgestellt wird,
          jederzeit dort ändern oder widerrufen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Weitere Informationen</h2>
        <p>
          Weitere Informationen zur Verarbeitung personenbezogener Daten finden
          Sie in unserer Datenschutzerklärung. Bei Fragen zu dieser
          Cookie-Richtlinie oder zur Nutzung von Cookies können Sie uns per
          E-Mail kontaktieren:
          <a
            href="mailto:kontakt@beschichterscout.com"
            className={styles.mailLink}
          >
            {' '}kontakt@beschichterscout.com
          </a>
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subheading}>Änderungen an dieser Cookie-Richtlinie</h2>
        <p>
          Wir behalten uns vor, diese Cookie-Richtlinie bei Bedarf anzupassen,
          insbesondere wenn sich technische, rechtliche oder organisatorische
          Änderungen ergeben. Die jeweils aktuelle Fassung wird auf dieser Seite
          veröffentlicht.
        </p>
        <p>
          Diese Richtlinie wurde zuletzt überprüft und aktualisiert: Juni 2026.
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