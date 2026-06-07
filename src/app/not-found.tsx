import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.circleOne} />
      <div className={styles.circleTwo} />
      <div className={styles.circleThree} />

      <section className={styles.card}>
        <p className={styles.label}>404</p>

        <h1 className={styles.title}>Seite nicht gefunden</h1>

        <p className={styles.text}>
          Der Link ist möglicherweise veraltet oder die Seite wurde verschoben.
          Wähle einen Bereich aus oder gehe zurück zur Startseite.
        </p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryButton}>
            Zur Startseite
          </Link>
        </div>

        <div className={styles.quickLinks}>
          <Link href="/auftragsboerse" className={styles.quickLink}>
            <span className={styles.quickTitle}>Auftragsbörse</span>
            <span className={styles.quickText}>Beschichtungsaufträge ansehen</span>
          </Link>

          

          <Link href="/kaufen" className={styles.quickLink}>
            <span className={styles.quickTitle}>Shop</span>
            <span className={styles.quickText}>Produkte durchsuchen</span>
          </Link>
          <Link href="/lackanfragen" className={styles.quickLink}>
            <span className={styles.quickTitle}>Lackanfragen</span>
            <span className={styles.quickText}>Lacke und Restposten finden</span>
          </Link>
        </div>
      </section>
    </main>
  );
}