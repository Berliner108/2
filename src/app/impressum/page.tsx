'use client';

import React from 'react';
import Link from 'next/link';
import styles from './impressum.module.css';

const ImpressumPage = () => {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Impressum</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Angaben gemäß § 5 E-Commerce-Gesetz, § 14 UGB und § 25 Mediengesetz</h2>
        <p className={styles.text}>
          Martin Zajac<br />
          Einzelunternehmer<br />
          Riedergasse 2<br />
          6900 Bregenz<br />
          Österreich
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kontakt</h2>
        <p className={styles.text}>
          Telefon: +43 660 3740467<br />
          E-Mail: kontakt@beschichterscout.com
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Website</h2>
        <p className={styles.text}>
          www.beschichterscout.com
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Unternehmensgegenstand</h2>
        <p className={styles.text}>
          Betrieb einer Online-Plattform zur Vermittlung von Beschichtungsaufträgen,
          Lackanfragen, Angeboten und damit verbundenen Dienstleistungen im Bereich
          Oberflächentechnik.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Gewerbebehörde</h2>
        <p className={styles.text}>
          Bezirkshauptmannschaft Bregenz
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Gewerbeart</h2>
        <p className={styles.text}>
          Dienstleistungen in der automatischen Datenverarbeitung und Informationstechnik
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mitgliedschaft</h2>
        <p className={styles.text}>
          Mitglied der Wirtschaftskammer Österreich, Wirtschaftskammer Vorarlberg
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>UID-Nummer</h2>
        <p className={styles.text}>
          [UID-Nummer einfügen, falls vorhanden]
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Offenlegung gemäß § 25 Mediengesetz</h2>
        <p className={styles.text}>
          Medieninhaber: Martin Zajac<br />
          Riedergasse 2<br />
          6900 Bregenz<br />
          Österreich
        </p>
        <p className={styles.text}>
          Grundlegende Richtung der Website: Diese Website dient dem Betrieb und der
          Präsentation einer digitalen Plattform für Beschichtungsaufträge,
          Lackanfragen, Angebote und ergänzende Informationen im Bereich
          Oberflächentechnik.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Verbraucherstreitbeilegung</h2>
        <p className={styles.text}>
          Plattform der Europäischen Kommission zur Online-Streitbeilegung:<br />
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p className={styles.text}>
          Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren
          vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Haftung für Inhalte</h2>
        <p className={styles.text}>
          Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt.
          Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird jedoch
          keine Gewähr übernommen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Haftung für Links</h2>
        <p className={styles.text}>
          Diese Website kann Links zu externen Websites Dritter enthalten. Auf deren
          Inhalte haben wir keinen Einfluss. Für diese fremden Inhalte wird keine
          Haftung übernommen. Für den Inhalt der verlinkten Seiten sind ausschließlich
          deren Betreiber verantwortlich.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Urheberrecht</h2>
        <p className={styles.text}>
          Die durch den Seitenbetreiber erstellten Inhalte und Werke auf dieser Website
          unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung,
          Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen
          des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen
          Autors bzw. Erstellers.
        </p>
      </section>

      <div className={styles.buttonWrapper}>
        <Link href="/" className={styles.backButton}>
          <b>Zurück zur Startseite</b>
        </Link>
      </div>
    </main>
  );
};

export default ImpressumPage;