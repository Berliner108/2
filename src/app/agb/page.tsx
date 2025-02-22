'use client';

import Link from 'next/link';
import styles from './agb.module.css';

const AgbPage = () => {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <h2 className={styles.subheading}>1. Allgemeines</h2>

      <section className={styles.section}>
        <p>Der Auftragnehmer (AN) erbringt für den Auftraggeber (AG) Dienstleistungen...</p>
      </section>
      
      <Link href="/">
        <button className={styles.backButton}>Zurück zur Startseite</button>
      </Link>
    </div>
  );
};

export default AgbPage;
