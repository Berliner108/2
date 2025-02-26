import styles from "./wissenswertes.module.css";
import "../../styles/globals.css"; // Korrekte relative Pfadangabe


export default function HomePage() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <nav className={styles.navbar}>
        <ul>
          <li><a href="#section1">Abschnitt 1</a></li>
          <li><a href="#section2">Abschnitt 2</a></li>
          <li><a href="#section3">Abschnitt 3</a></li>
        </ul>
      </nav>

      {/* Abschnitt 1 */}
      <section id="section1" className={styles.section}>
        <h2 className={styles.heading}>Abschnitt 1</h2>
        <p className={styles.text}>Das ist der erste Abschnitt.</p>
      </section>

      {/* Abschnitt 2 */}
      <section id="section2" className={styles.section}>
        <h2 className={styles.heading}>Abschnitt 2</h2>
        <p className={styles.text}>Das ist der zweite Abschnitt.</p>
      </section>

      {/* Abschnitt 3 */}
      <section id="section3" className={styles.section}>
        <h2 className={styles.heading}>Abschnitt 3</h2>
        <p className={styles.text}>Das ist der dritte Abschnitt.</p>
      </section>
    </div>
  );
}
