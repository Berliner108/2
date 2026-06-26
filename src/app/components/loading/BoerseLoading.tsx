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
      </aside>

      <div className={styles.content}>
        <PageSkeleton />
      </div>
    </div>
  </>
)
}