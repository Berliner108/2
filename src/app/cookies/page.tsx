import React from 'react';
import Link from 'next/link'; // Importiere Link
import styles from './cookies.module.css';

const CookieRichtlinie = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Cookie Richtlinie</h1>
      </div>
      <div className={styles.content}>
        <h2>Einleitung</h2>
        <p>
          Diese Cookie-Richtlinie erklärt, wie wir Cookies auf unserer Website verwenden.
        </p>
        <h2>Was sind Cookies?</h2>
        <p>
          Cookies sind kleine Textdateien, die auf deinem Gerät gespeichert werden, um Daten zu speichern.
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

export default CookieRichtlinie;
