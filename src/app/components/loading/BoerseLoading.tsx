import Navbar from '../navbar/Navbar'
import styles from '../../auftragsboerse/auftragsboerse.module.css'

function TopLoader() {
  return (
    <div className={styles.topLoader} aria-hidden>
      <div className={styles.topLoaderInner} />
    </div>
  )
}

function PageSkeleton() {
  return (
    <div
      className={`${styles.skeletonPage} ${styles.delayed}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
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

function LargePageSkeleton() {
  return (
    <div
      className={`${styles.largeSkeletonPage} ${styles.delayed}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={styles.largeSkeletonTitle}>
        <div className={`${styles.skelLine} ${styles.largeTitleLine}`} />
      </div>

      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={styles.largeSkeletonCard}>
          <div className={styles.largeSkeletonImage} />

          <div className={styles.largeSkeletonText}>
            <div className={`${styles.skelLine} ${styles.largeLineShort}`} />
            <div className={`${styles.skelLine} ${styles.largeLineMedium}`} />
            <div className={`${styles.skelLine} ${styles.largeLineMedium}`} />
            <div className={`${styles.skelLine} ${styles.largeLineSmall}`} />
            <div className={`${styles.skelLine} ${styles.largeLineSmall}`} />
          </div>

          <div className={styles.largeSkeletonBadge} />
        </div>
      ))}
    </div>
  )
}

type BoerseLoadingProps = {
  showNavbar?: boolean
}

export default function BoerseLoading({ showNavbar = true }: BoerseLoadingProps) {
  return (
    <>
      {showNavbar && <Navbar />}
      <TopLoader />

      <div className={`${styles.wrapper} ${styles.loadingWrapper}`}>
        <aside className={styles.loadingSidebar} aria-hidden>
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelInput} />
          <div className={styles.skelBlockSmall} />
          <div className={styles.skelBlockSmall} />
          <div className={styles.skelBlockSmall} />
          <div className={styles.skelBlockSmall} />
        </aside>

        <div className={styles.content}>
          <div className={styles.loadingDefaultOnly}>
            <PageSkeleton />
          </div>

          <div className={styles.loadingLargeOnly}>
            <LargePageSkeleton />
          </div>
        </div>
      </div>
    </>
  )
}