import Link from "next/link";
import Navbar from "./components/navbar/Navbar";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <>
      <Navbar />

      <main className={styles.page}>
        <div className={styles.circleOne} />
        <div className={styles.circleTwo} />
        <div className={styles.circleThree} />

        <section className={styles.card}>
          <p className={styles.label}>404</p>

          <h1 className={styles.title}>Seite nicht gefunden</h1>

          <p className={styles.text}>
            Die Seite konnte nicht gefunden werden. Möglicherweise wurde die Seite verschoben oder du bist nicht 
            berechtigt, diesen Bereich aufzurufen. Über die Navigation oder den Startseite-Button gelangst du zurück zu den wichtigsten Bereichen.
          </p>

          <div className={styles.actions}>
            <Link href="/" className={styles.primaryButton}>
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}