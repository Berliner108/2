import Navbar from '../components/navbar/Navbar'
import styles from './Grundgeruest.module.css'

function TopLoader() {
  return (
    <div className={`${styles.topLoader} ${styles.delayed}`} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className={`${styles.skeletonPage} ${styles.delayed}`} role="status" aria-busy="true">
      <div className={styles.skelHeader}>
        <div className={`${styles.skelLine} ${styles.skelLineWide}`} />
        <div className={styles.skelLine} />
      </div>

      <div className={styles.skelBlock} />
      <div className={styles.skelBlockSmall} />

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
    </div>
  )
}

export default function Loading() {
  return (
    <>
      <Navbar />
      <TopLoader />
      <div className={styles.wrapper}>
        <FormSkeleton />
      </div>
    </>
  )
}
