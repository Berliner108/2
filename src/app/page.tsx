"use client";
import styles from "@/styles/Home.module.css";

export default function Home() {
  return (
    <nav className={styles.navbar}>
      <ul className={styles.navList}>
        <li className={`${styles.navItem} ${styles.link1}`}>
          <button className={styles.navButton}>
            Angebote einholen <span className={styles.arrow}>▼</span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Unterlink 1</a>
            <a href="#" className={styles.dropdownLink}>Unterlink 2</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link2}`}>
          <button className={styles.navButton}>
            Kaufen <span className={styles.arrow}>▼</span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Unterlink 1</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link3}`}>
          <button className={styles.navButton}>
            Lacke anfragen <span className={styles.arrow}>▼</span>
          </button>
        </li>
        <li className={`${styles.navItem} ${styles.link4}`}>
          <button className={styles.navButton}>
            Auftragsbörse <span className={styles.arrow}>▼</span>
          </button>
        </li>
        <li className={`${styles.navItem} ${styles.link5}`}>
          <button className={styles.navButton}>
            Kaufen <span className={styles.arrow}>▼</span>
          </button>
        </li>
        <li className={`${styles.navItem} ${styles.link6}`}>
          <button className={styles.navButton}>
            Offene Lackanfragen <span className={styles.arrow}>▼</span>
          </button>
        </li>
        <li className={`${styles.navItem} ${styles.link7}`}>
          <button className={styles.navButton}>
            Wissenswertes <span className={styles.arrow}>▼</span>
          </button>
        </li>
        <li className={`${styles.navItem} ${styles.link8}`}>
          <button className={styles.navButton}>
            Mein Konto <span className={styles.arrow}>▼</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
