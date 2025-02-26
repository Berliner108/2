// /src/app/wissenswertes/page.tsx

import styles from './wissenswertes.module.css';

export default function WissenswertesPage() {
  return (
    <div>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <ul className={styles.navList}>
          <li className={`${styles.navItem} ${styles.link1}`}>
            <button className={styles.navButton}><b>Angebote einholen</b>▿</button>
            <div className={styles.dropdown}>
            <a href="/" className={styles.dropdownLink}>Lackieren</a>
            <a href="#" className={styles.dropdownLink}>Pulverbeschiten</a>
            <a href="#" className={styles.dropdownLink}>Verzinken</a>
            <a href="#" className={styles.dropdownLink}>Eloxieren</a>
            <a href="#" className={styles.dropdownLink}>Strahlen</a>
            <a href="#" className={styles.dropdownLink}>Entlacken</a>
            <a href="#" className={styles.dropdownLink}>Einlagern</a>
            <a href="#" className={styles.dropdownLink}>Isoliersteg Verpressung</a>
            <a href="#" className={styles.dropdownLink}>Folieren</a>
            <a href="#" className={styles.dropdownLink}>Gemischt</a>
            </div>
          </li>
          <li className={`${styles.navItem} ${styles.link2}`}>
          <button className={styles.navButton}>
            <b>Kaufen</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Nasslacke</a>
            <a href="#" className={styles.dropdownLink}>Pulverlacke</a>
            <a href="#" className={styles.dropdownLink}>Arbeitsmittel</a>
          </div>
          </li>
          <li className={`${styles.navItem} ${styles.link3}`}>
          <button className={styles.navButton}>
            <b>Lacke anfragen</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Sonderfarbe Nasslack</a>
            <a href="#" className={styles.dropdownLink}>Sonderfarbe Pulverlack</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link4}`}>
          <button className={styles.navButton}>
            <b>Auftragsbörse</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
          <a href="#" className={styles.dropdownLink}>Lackieren</a>
            <a href="#" className={styles.dropdownLink}>Pulverbeschiten</a>
            <a href="#" className={styles.dropdownLink}>Verzinken</a>
            <a href="#" className={styles.dropdownLink}>Eloxieren</a>
            <a href="#" className={styles.dropdownLink}>Strahlen</a>
            <a href="#" className={styles.dropdownLink}>Entlacken</a>
            <a href="#" className={styles.dropdownLink}>Einlagern</a>
            <a href="#" className={styles.dropdownLink}>Isoliersteg Verpressung</a>
            <a href="#" className={styles.dropdownLink}>Folieren</a>
            <a href="#" className={styles.dropdownLink}>Gemischt</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link5}`}>
          <button className={styles.navButton}>
            <b>Verkaufen</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Nasslacke</a>
            <a href="#" className={styles.dropdownLink}>Pulverlacke</a>
            <a href="#" className={styles.dropdownLink}>Arbeitsmittel</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link6}`}>
          <button className={styles.navButton}>
            <b>Offene Lackanfragen</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Sonderfarbe Nasslack</a>
            <a href="#" className={styles.dropdownLink}>Sonderfarbe Pulverlack</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link7}`}>
          <button className={styles.navButton}>
            <b>Wissenswertes</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
            <a href="/wissenswertes" className={styles.dropdownLink}>Die Vision</a>
            <a href="#" className={styles.dropdownLink}>Oberflächentechnik</a>
            <a href="#" className={styles.dropdownLink}>Lackieren</a>
            <a href="#" className={styles.dropdownLink}>Pulverbeschichten</a>
            <a href="#" className={styles.dropdownLink}>Verzinken</a>
            <a href="#" className={styles.dropdownLink}>Eloxieren</a>
            <a href="#" className={styles.dropdownLink}>Strahlen</a>
            <a href="#" className={styles.dropdownLink}>Entlacken</a>
            <a href="#" className={styles.dropdownLink}>Einlagern</a>
            <a href="#" className={styles.dropdownLink}>Isolierstegverpressung</a>
            <a href="#" className={styles.dropdownLink}>Folieren</a>
          </div>
        </li>
        <li className={`${styles.navItem} ${styles.link8}`}>
          <button className={styles.navButton}>
            <b>Mein Konto</b>▿ <span className={styles.arrow}></span>
          </button>
          <div className={styles.dropdown}>
            <a href="#" className={styles.dropdownLink}>Eingeholte Angebote</a>
            <a href="#" className={styles.dropdownLink}>Meine Käufe</a>
            <a href="#" className={styles.dropdownLink}>Offene Lackanfragen</a>
            <a href="#" className={styles.dropdownLink}>Meine Aufträge</a>
            <a href="#" className={styles.dropdownLink}>Aktive Artikel</a>
            <a href="#" className={styles.dropdownLink}>Verkaufte Artikel</a>
            <a href="#" className={styles.dropdownLink}>Angebotene Artikel</a>
            <a href="#" className={styles.dropdownLink}>Mein Profil</a>
          </div>
        </li>
        </ul>
      </nav>

      {/* Wissenswertes Page Content */}
      <div className={styles.container}>
        <h1 className={styles.title}>Wissenswertes</h1>
        <p className={styles.description}>
          Hier findest du alle wissenswerten Informationen zu unserem Thema.
        </p>
        {/* Inhalt hier */}
      </div>
    </div>
  );
}
