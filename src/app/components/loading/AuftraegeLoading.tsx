import Navbar from '../navbar/Navbar'
import styles from '../../konto/auftraege/auftraege.module.css'

export default function AuftraegeLoading() {
  return (
    <>
      <Navbar />

      <div className={styles.wrapper}>
        <div className={styles.skelHeading} />

        <div className={styles.skelToolbar}>
          <div className={styles.skelSearch} />
          <div className={styles.skelSelect} />
          <div className={styles.skelSelect} />
          <div className={styles.skelSegmented} />
        </div>

        <ul className={styles.list} aria-hidden>
          {Array.from({ length: 2 }).map((_, index) => (
            <li key={index} className={`${styles.card} ${styles.skelCard}`}>
              <div className={styles.cardHeader}>
                <div className={styles.skelTitle} />
                <div className={styles.skelStatus} />
              </div>

              <div className={styles.cardBody}>
                <div className={styles.skelMetaGrid}>
                  <div className={styles.skelMetaBlock} />
                  <div className={styles.skelMetaBlock} />
                  <div className={styles.skelMetaBlock} />
                  <div className={styles.skelMetaSmall} />
                  <div className={styles.skelMetaSmall} />
                </div>

                <div className={styles.actions}>
                  <div className={styles.actionStack}>
                    <div className={styles.skelButton} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}