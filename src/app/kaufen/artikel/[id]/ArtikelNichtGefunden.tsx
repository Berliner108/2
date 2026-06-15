"use client";

import Link from "next/link";
import Navbar from "../../../components/navbar/Navbar";
import styles from "./ArtikelNichtGefunden.module.css";

export default function ArtikelNichtGefunden() {
  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <span className={styles.circleOne} />
        <span className={styles.circleTwo} />
        <span className={styles.circleThree} />

        <section className={styles.card}>
          <p className={styles.label}>404</p>

          <h1 className={styles.title}>Artikel nicht gefunden</h1>

          <p className={styles.text}>
            Dieser Artikel ist nicht mehr verfügbar, wurde entfernt oder der Link ist nicht korrekt.
            Du kannst zurück zum Shop gehen und nach ähnlichen Artikeln suchen.
          </p>

          <div className={styles.actions}>
            <Link href="/kaufen" className={styles.primaryButton}>
              Zurück zum Shop
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}