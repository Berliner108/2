'use client';

import React from 'react';
import Link from 'next/link';
import styles from './impressum.module.css';


const ImpressumPage = () => {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Impressum</h1>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Angaben gemäß § 5 TMG</h2>
        <p className={styles.text}>
          BeschichterScout GmbH<br />
          Seestrasse 1<br />
          6900 Bregenz<br />
          Österreich
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertreten durch</h2>
        <p className={styles.text}>
          Martin Zajac (Geschäftsführer)
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kontakt</h2>
        <p className={styles.text}>
          Telefon: +43 660 3740467<br />
          E-Mail: kontakt@beschichterscout.at
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Umsatzsteuer-ID</h2>
        <p className={styles.text}>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: AT123456789
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Haftung für Inhalte</h2>
        <p className={styles.text}>
          Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen 
          Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, 
          übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf 
          eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Urheberrecht</h2>
        <p className={styles.text}>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen 
          Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen 
          des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </section>
      <Link href="/" legacyBehavior>
        <button className={styles.backButton}><b>Zurück zur Startseite</b></button>
      </Link>
    </main>
  );
};

export default ImpressumPage;
