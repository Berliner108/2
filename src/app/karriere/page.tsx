import React from 'react';
import Link from 'next/link';
import styles from './karriere.module.css';

const Karriere = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Karriere</h1>
      </div>
      <div className={styles.content}>
        <h2>Unsere offenen Stellen</h2>
        <p>
          Bei uns hast du die Möglichkeit, dich weiterzuentwickeln. Schau dir unsere offenen Stellen an.
        </p>
        <Link href="/">Zurück zur Startseite</Link>
      </div>
      <footer className={styles.footer}>
        <p>&copy; 2025 Dein Unternehmen</p>
      </footer>
    </div>
  );
};

export default Karriere;
