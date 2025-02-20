import React from 'react';
import Link from 'next/link'; // Importiere Link für Navigation
import styles from './agb.module.css';

const AGB = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>AGB</h1>
      </div>
      <div className={styles.content}>
        <h2>Allgemeine Geschäftsbedingungen</h2>
        <p>
          Hier findest du unsere Allgemeinen Geschäftsbedingungen für die Nutzung unserer Dienste.
        </p>
        {/* Korrektur: <Link> statt <a> */}
        <Link href="/">Zurück zur Startseite</Link>
      </div>
      <footer className={styles.footer}>
        <p>&copy; 2025 Dein Unternehmen</p>
      </footer>
    </div>
  );
};

export default AGB;
