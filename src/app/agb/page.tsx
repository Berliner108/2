'use client';

import React from 'react';
import Link from 'next/link'; // Importiere Link für Navigation

import styles from './agb.module.css';

const AGBPage = () => {
  return (
    <main className={styles.container}>
      <h1 className={styles.heading}>Allgemeine Geschäftsbedingungen (AGB)</h1>
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Geltungsbereich</h2>
        <p className={styles.text}>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die zwischen uns und unseren Kunden 
          über unsere Dienstleistungen und Produkte abgeschlossen werden.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Vertragsabschluss</h2>
        <p className={styles.text}>
          Ein Vertrag kommt zustande, sobald eine Bestellung von uns bestätigt wurde oder die Ware versendet wurde.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Preise und Zahlung</h2>
        <p className={styles.text}>
          Alle Preise verstehen sich in Euro inklusive der gesetzlichen Mehrwertsteuer. Die Zahlung erfolgt per 
          Überweisung oder über die angebotenen Zahlungsmethoden.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Lieferung und Versand</h2>
        <p className={styles.text}>
          Die Lieferung erfolgt an die vom Kunden angegebene Adresse. Die Versanddauer kann je nach Standort variieren.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Widerrufsrecht</h2>
        <p className={styles.text}>
          Kunden haben das Recht, innerhalb von 14 Tagen ohne Angabe von Gründen vom Vertrag zurückzutreten.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Haftung</h2>
        <p className={styles.text}>
          Wir haften nur für Schäden, die durch grobe Fahrlässigkeit oder Vorsatz entstanden sind.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Schlussbestimmungen</h2>
        <p className={styles.text}>
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist unser Firmensitz.
        </p>
      </section>
    </main>
  );
};

export default AGBPage;
