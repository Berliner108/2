// /src/pages/impressum/page.tsx
'use client';

import React from 'react';
import styles from './impressum.module.css';

const Impressum = () => {
  return (
    <div className={styles.impressumContainer}>
      <header className={styles.header}>
        <h1>Impressum</h1>
      </header>
      <section className={styles.content}>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          Musterfirma GmbH<br />
          Musterstraße 123<br />
          12345 Musterstadt
        </p>
        <h2>Vertreten durch:</h2>
        <p>Max Mustermann</p>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:info@musterfirma.de">info@musterfirma.de</a><br />
          Telefon: +49 123 456 789
        </p>
        <h2>Haftungsausschluss</h2>
        <p>
          Der Inhalt dieser Webseite wird mit größtmöglicher Sorgfalt erstellt. Dennoch übernehmen wir keine Haftung für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte.
        </p>
      </section>
      <footer className={styles.footer}>
        <p>&copy; 2025 Musterfirma GmbH. Alle Rechte vorbehalten.</p>
      </footer>
    </div>
  );
};

export default Impressum;
