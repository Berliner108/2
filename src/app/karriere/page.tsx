// /src/pages/karriere.tsx

import React from 'react';
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
        <a href="/">Zurück zur Startseite</a>
      </div>
      <footer className={styles.footer}>
        <p>&copy; 2025 Dein Unternehmen</p>
      </footer>
    </div>
  );
};

export default Karriere;
