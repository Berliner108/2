'use client';

import React from 'react';

import styles from './impressum.module.css';


const ImpressumPage = () => {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Impressum</h1>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Angaben gemäß § 5 TMG</h2>
        <p className={styles.text}>
          Mein Unternehmen GmbH<br />
          Musterstraße 1<br />
          12345 Musterstadt<br />
          Deutschland
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Vertreten durch</h2>
        <p className={styles.text}>
          Max Mustermann (Geschäftsführer)
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kontakt</h2>
        <p className={styles.text}>
          Telefon: +49 123 456789<br />
          E-Mail: kontakt@mein-unternehmen.de
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Umsatzsteuer-ID</h2>
        <p className={styles.text}>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: DE123456789
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
    </main>
  );
};

export default ImpressumPage;
