import React from 'react';
import Link from 'next/link';
import styles from './kontakt.module.css';

const Kontakt = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Kontakt</h1>
      </div>
      <div className={styles.content}>
        <h2>So erreichst du uns</h2>
        <p>
          Du kannst uns per E-Mail oder Telefon erreichen. Wir freuen uns auf deine Nachricht.
        </p>
        <Link href="/">Zurück zur Startseite</Link>
      </div>
      <footer className={styles.footer}>
        <p>&copy; 2025 Dein Unternehmen</p>
      </footer>
    </div>
  );
};

export default Kontakt;
