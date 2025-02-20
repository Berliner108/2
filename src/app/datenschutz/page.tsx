import React from 'react';
import Link from 'next/link'; // Importiere Link für Navigation
import styles from './datenschutz.module.css';

const Datenschutzbestimmungen = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Datenschutzbestimmungen</h1>
      </div>
      <div className={styles.content}>
        <h2>Datensicherheit</h2>
        <p>
          Wir nehmen den Schutz deiner Daten sehr ernst und verarbeiten deine persönlichen Daten gemäß der geltenden Datenschutzgesetze.
        </p>
        <h2>Verwendung von Daten</h2>
        <p>
          Deine Daten werden nur zur Verbesserung unserer Dienstleistungen verwendet.
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

export default Datenschutzbestimmungen;
