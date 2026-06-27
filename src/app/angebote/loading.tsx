import Navbar from '../components/navbar/Navbar'
import styles from './Grundgeruest.module.css'

function FormSkeleton() {
  return (
    <>
      <Navbar />

      <div
        className={styles.skeletonPage}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className={styles.skelHeader}>
          <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
          <div className={styles.skelLine} />
        </div>

        <div className={styles.skelBlock} />

        <div className={styles.skelTwoCols}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>

        <div className={styles.skelDrop} />
        <div className={styles.skelDropSmall} />

        <div className={styles.skelGrid}>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
        </div>

        <div className={styles.skelBlock} />

        <div className={styles.skelLargeOnly}>
          <div className={styles.skelGrid}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>

          <div className={styles.skelDrop} />

          <div className={styles.skelTwoCols}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>

          <div className={styles.skelTwoCols}>
            <div className={styles.skelInput} />
            <div className={styles.skelInput} />
          </div>

          <div className={styles.skelBlock} />
          <div className={styles.skelBlockSmall} />
        </div>
      </div>
    </>
  )
}

export default function Loading() {
  return <FormSkeleton />
}
