"use client";

import Link from "next/link";
import Navbar from "../../../components/navbar/Navbar";
import styles from "./ArtikelNichtGefunden.module.css";

export default function ArtikelNichtGefunden() {
  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <span className={styles.circleOne} aria-hidden="true" />
        <span className={styles.circleTwo} aria-hidden="true" />
        <span className={styles.circleThree} aria-hidden="true" />

        <section className={styles.card}>
          <p className={styles.label}>Shop-Hinweis</p>

          <h1 className={styles.title}>Artikel derzeit nicht im Shop</h1>

          <p className={styles.text}>
            Der gesuchte Artikel ist aktuell nicht gelistet. Er wurde möglicherweise
            bereits verkauft, entfernt oder vorübergehend ausgeblendet. Im Shop findest
            du weitere Angebote, die zu deiner Suche passen könnten.
          </p>

          <div className={styles.actions}>
            <Link href="/kaufen" className={styles.primaryButton}>
              Passende Artikel im Shop suchen
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}