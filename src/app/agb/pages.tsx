'use client';

import Link from 'next/link';
import styles from './agb.module.css';

const AgbPage = () => {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Allgemeine Geschäftsbedingungen (AGB)</h1>
      <section className={styles.section}>
        <p>Der Auftragnehmer (AN) erbringt für den Auftraggeber (AG) Dienstleistungen in der
          Oberflächentechnik und im Bereich des Vertriebs von Arbeitsmitteln unter Einhaltung des beiliegenden, einen integrierenden
          Bestandteil bildenden Service Level Agreements (SLAs).
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle gegenwärtigen und
          zukünftigen Dienstleistungen, die der AN gegenüber dem AG erbringt, auch wenn
          im Einzelfall bei Vertragsabschluss nicht ausdrücklich auf die AGB Bezug
          genommen wird. Geschäftsbedingungen des AG gelten nur, wenn sie vom AN
          schriftlich anerkannt wurden.</p>
      </section>
      <Link href="/">
        <button className={styles.backButton}>Zurück zur Startseite</button>
      </Link>
    </main>
  );
};

export default AgbPage;